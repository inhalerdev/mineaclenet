#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Mineacle safe deploy
#
# Run every 60 seconds by mineacle-deploy.timer. When `main` has a new commit:
#
#   1. clone it into its own folder under releases/
#   2. install the exact locked dependencies and run `next build` there
#      (the live site keeps running from the old folder the whole time)
#   3. only if the build succeeds: point `current` at the new folder,
#      restart the web service and wait for /api/server/status to answer
#   4. if the new version does not come up healthy: switch back to the
#      previous folder automatically
#
# A commit that fails is remembered and skipped until a newer commit arrives,
# so a broken push never takes the site down and is not rebuilt every minute.
#
# Settings live in /etc/mineacle/deploy.env (see ops/deploy.env.example).
# Useful one-offs:
#   env FORCE=1 mineacle-deploy        rebuild the latest commit even if deployed
#   env ROLLBACK=1 mineacle-deploy     switch back to the previous release
# -----------------------------------------------------------------------------
set -Eeuo pipefail

CONFIG_FILE="${MINEACLE_DEPLOY_CONFIG:-/etc/mineacle/deploy.env}"
if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$CONFIG_FILE"
fi

REPO_URL="${REPO_URL:-https://github.com/inhalerdev/mineaclenet.git}"
BRANCH="${BRANCH:-main}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/srv/mineacle}"
APP_SUBDIR="${APP_SUBDIR:-app/web}"
RESTART_CMD="${RESTART_CMD:-sudo -n /usr/bin/systemctl restart mineacle-web}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/server/status}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-60}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-0}"
PNPM_BIN="${PNPM_BIN:-}"
FORCE="${FORCE:-0}"
ROLLBACK="${ROLLBACK:-0}"

RELEASES_DIR="$DEPLOY_ROOT/releases"
SHARED_ENV_DIR="$DEPLOY_ROOT/shared/env"
CURRENT_LINK="$DEPLOY_ROOT/current"
STATE_DIR="$DEPLOY_ROOT/state"
LOG_DIR="$DEPLOY_ROOT/logs"

mkdir -p "$RELEASES_DIR" "$SHARED_ENV_DIR" "$STATE_DIR" "$LOG_DIR"

log() {
  printf '%s [deploy] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

# Only one deploy at a time; a timer tick during a build simply exits.
exec 9>"$STATE_DIR/deploy.lock"
if ! flock -n 9; then
  exit 0
fi

current_release() {
  if [[ -L "$CURRENT_LINK" ]]; then
    readlink -f "$CURRENT_LINK"
  fi
}

point_current_at() {
  local target="$1"
  ln -sfn "$target" "$DEPLOY_ROOT/.current.tmp"
  mv -Tf "$DEPLOY_ROOT/.current.tmp" "$CURRENT_LINK"
}

restart_service() {
  log "restarting: $RESTART_CMD"
  # 9>&- : child processes must not inherit (and keep holding) the deploy lock
  bash -c "$RESTART_CMD" 9>&-
}

healthy() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))

  while ((SECONDS < deadline)); do
    if curl -fsS --max-time 5 "$HEALTH_URL" -o /dev/null 2>/dev/null; then
      return 0
    fi
    sleep 2
  done

  return 1
}

prune_releases() {
  local live previous
  live="$(current_release || true)"
  previous="$(cat "$STATE_DIR/previous" 2>/dev/null || true)"

  local releases=()
  mapfile -t releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort -r)

  local kept=0 dir
  for dir in "${releases[@]}"; do
    if [[ "$dir" == "$live" || "$dir" == "$previous" ]]; then
      continue
    fi
    kept=$((kept + 1))
    if ((kept > KEEP_RELEASES)); then
      rm -rf -- "$dir"
    fi
  done

  # Keep the 20 most recent build logs.
  find "$LOG_DIR" -maxdepth 1 -name 'build-*.log' -type f -printf '%T@ %p\n' 2>/dev/null |
    sort -rn | tail -n +21 | cut -d' ' -f2- | xargs -r rm -f --
}

# --- Manual rollback ---------------------------------------------------------
if [[ "$ROLLBACK" == "1" ]]; then
  previous="$(cat "$STATE_DIR/previous" 2>/dev/null || true)"
  if [[ -z "$previous" || ! -d "$previous" ]]; then
    log "no previous release to roll back to"
    exit 1
  fi
  live="$(current_release || true)"
  point_current_at "$previous"
  [[ -n "$live" ]] && echo "$live" >"$STATE_DIR/previous"
  restart_service
  if healthy; then
    log "rolled back to $(basename "$previous")"
    exit 0
  fi
  log "rolled back to $(basename "$previous") but it is not answering $HEALTH_URL"
  exit 1
fi

# --- Is there anything new? ----------------------------------------------------
remote_sha="$(git ls-remote "$REPO_URL" "refs/heads/$BRANCH" | cut -f1)"
if [[ -z "$remote_sha" ]]; then
  log "could not read $BRANCH from $REPO_URL"
  exit 1
fi

live_release="$(current_release || true)"
live_sha="$(cat "$live_release/REVISION" 2>/dev/null || true)"

if [[ "$FORCE" != "1" ]]; then
  [[ "$remote_sha" == "$live_sha" ]] && exit 0
  [[ -f "$STATE_DIR/failed-$remote_sha" ]] && exit 0
fi

short_sha="${remote_sha:0:7}"
release="$RELEASES_DIR/$(date -u +%Y%m%d-%H%M%S)-$short_sha"
build_log="$LOG_DIR/build-$(date -u +%Y%m%d-%H%M%S)-$short_sha.log"

fail() {
  log "FAILED ($1) for $short_sha, the live site was not changed. Log: $build_log"
  touch "$STATE_DIR/failed-$remote_sha"
  rm -rf -- "$release"
  exit 1
}

log "new commit $short_sha on $BRANCH, building in $(basename "$release")"

# --- 1. Fetch the commit ---------------------------------------------------------
git clone --quiet --depth 1 --branch "$BRANCH" "$REPO_URL" "$release" >>"$build_log" 2>&1 9>&- ||
  fail "git clone"

remote_sha="$(git -C "$release" rev-parse HEAD)"
short_sha="${remote_sha:0:7}"
echo "$remote_sha" >"$release/REVISION"
rm -rf -- "$release/.git"

app_dir="$release/$APP_SUBDIR"
[[ -f "$app_dir/package.json" ]] || fail "missing $APP_SUBDIR/package.json"

# Server-only settings (.env.production, .env.local, ...) are shared across
# releases and linked into each one; they never live in Git.
shopt -s nullglob dotglob
for env_file in "$SHARED_ENV_DIR"/.env*; do
  ln -sfn "$env_file" "$app_dir/$(basename "$env_file")"
done
shopt -u nullglob dotglob

# --- 2. Install + build ------------------------------------------------------------
wanted_pnpm="$(node -p "(require('$app_dir/package.json').packageManager || '').split('@')[1] || ''")"
if [[ -n "$PNPM_BIN" ]]; then
  read -r -a pnpm_cmd <<<"$PNPM_BIN"
elif command -v pnpm >/dev/null 2>&1 && [[ -z "$wanted_pnpm" || "$(pnpm --version)" == "$wanted_pnpm" ]]; then
  pnpm_cmd=(pnpm)
else
  pnpm_cmd=(npx --yes "pnpm@${wanted_pnpm:-latest}")
fi

(
  cd "$app_dir"
  # NODE_ENV must not be "production" during install, or TypeScript and the
  # type packages that `next build` needs are skipped.
  unset NODE_ENV
  export NEXT_TELEMETRY_DISABLED=1
  "${pnpm_cmd[@]}" install --frozen-lockfile
  "${pnpm_cmd[@]}" run build
) >>"$build_log" 2>&1 9>&- || fail "install/build"

if [[ "$RUN_MIGRATIONS" == "1" ]]; then
  (
    cd "$app_dir"
    env_args=()
    for env_file in .env.production .env.local; do
      [[ -f "$env_file" ]] && env_args+=("--env-file=$env_file")
    done
    node "${env_args[@]}" scripts/migrate.mjs
  ) >>"$build_log" 2>&1 9>&- || fail "migrations"
fi

# --- 3. Switch + restart -------------------------------------------------------------
if [[ -n "$live_release" ]]; then
  echo "$live_release" >"$STATE_DIR/previous"
fi

point_current_at "$release"

if ! restart_service >>"$build_log" 2>&1; then
  # The old process is still serving; put the link back so it matches.
  if [[ -n "$live_release" ]]; then
    point_current_at "$live_release"
  else
    rm -f "$CURRENT_LINK"
  fi
  fail "restart command failed, check RESTART_CMD and the sudoers rule, then run with FORCE=1"
fi

if healthy; then
  log "live: $short_sha ($(basename "$release"))"
  rm -f "$STATE_DIR"/failed-*
  prune_releases
  exit 0
fi

# --- 4. Automatic rollback --------------------------------------------------------------
log "$short_sha did not answer $HEALTH_URL within ${HEALTH_TIMEOUT_SECONDS}s"
touch "$STATE_DIR/failed-$remote_sha"

if [[ -n "$live_release" && -d "$live_release" ]]; then
  point_current_at "$live_release"
  restart_service || true
  if healthy; then
    log "rolled back to $(basename "$live_release")"
    rm -rf -- "$release"
  else
    log "rolled back to $(basename "$live_release") but it is not answering either; check: journalctl -u mineacle-web"
  fi
else
  log "no previous release to roll back to; check: journalctl -u mineacle-web"
fi

exit 1
