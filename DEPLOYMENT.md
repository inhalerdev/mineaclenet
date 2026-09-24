# Deploying Mineacle

The Next.js site lives in `app/web`. It is built with **pnpm** from the
committed `app/web/pnpm-lock.yaml`, on **Node 24** (`app/.nvmrc`).

```
push to main ──► GitHub Actions (CI): install, build, typecheck ──► ✔ / ✘ on the commit
             └─► home server, every 60 s: ops/deploy.sh
                   clone new commit into releases/<time>-<sha>/
                   pnpm install --frozen-lockfile && pnpm build   (live site untouched)
                   ✔ build → switch `current` → restart → health check → live
                   ✘ build or health check → keep / restore the previous release
```

## Local development

```bash
cd app/web
pnpm install          # uses the lockfile, same versions as the server
cp .env.example .env.local   # then fill in values
pnpm dev
```

Generate development-gateway credentials (`/admin`) with `pnpm gate:hash`.

## One-time server setup (Ubuntu, systemd)

Replace the current "pull every 60 seconds" job with this. Run as an admin user.

```bash
# 0. Stop whatever currently pulls/builds the site every 60 seconds
#    (a cron entry, panel "Git web app", pm2 process, ...), so the two don't fight.

# 1. Node 24 and pnpm
node -v                                  # must print v24.x
sudo npm install --global pnpm@11.19.0

# 2. Service user and folders
sudo useradd --system --create-home --home-dir /srv/mineacle --shell /usr/sbin/nologin mineacle
sudo -u mineacle mkdir -p /srv/mineacle/shared/env

# 3. Server-only settings (DB passwords, gateway secrets, ...)
#    Start from app/web/.env.example. Every file in shared/env/ is linked into
#    each release, so these survive deploys and never touch Git.
sudo -u mineacle nano /srv/mineacle/shared/env/.env.production
sudo chmod 600 /srv/mineacle/shared/env/.env.production

# 4. Deploy script, its settings, and permission to restart the site
sudo install -m 755 ops/deploy.sh /usr/local/bin/mineacle-deploy
sudo mkdir -p /etc/mineacle
sudo install -m 644 ops/deploy.env.example /etc/mineacle/deploy.env   # defaults are fine
sudo install -m 440 ops/systemd/mineacle-deploy.sudoers /etc/sudoers.d/mineacle-deploy
sudo visudo -c

# 5. Services
sudo install -m 644 ops/systemd/mineacle-web.service ops/systemd/mineacle-deploy.service \
  ops/systemd/mineacle-deploy.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mineacle-web

# 6. First deploy (builds main, starts the site), then turn on the 60 s timer
sudo systemctl start mineacle-deploy && journalctl -u mineacle-deploy -n 20 --no-pager
sudo systemctl enable --now mineacle-deploy.timer
```

Point the Cloudflare Tunnel at `http://127.0.0.1:3000` (same as before if it
already was).

If Node was installed with **nvm**, edit the `ExecStart` path in
`mineacle-web.service` and the `PATH` line in `mineacle-deploy.service` to
include nvm's `bin` folder (`which node` as the mineacle user).

## Day to day

| What | Command |
|---|---|
| Watch deploys | `journalctl -u mineacle-deploy -f` |
| Why did a build fail? | `ls -t /srv/mineacle/logs \| head` then open the newest `build-*.log` |
| Site logs | `journalctl -u mineacle-web -f` |
| Rebuild the current commit | `sudo -u mineacle env FORCE=1 /usr/local/bin/mineacle-deploy` |
| Go back one release | `sudo -u mineacle env ROLLBACK=1 /usr/local/bin/mineacle-deploy` |
| Pause auto-deploys | `sudo systemctl stop mineacle-deploy.timer` |

A commit whose build fails is skipped until a newer commit is pushed; the
site keeps serving the last good release meanwhile.

Changes to `ops/deploy.sh` or the systemd files are **not** picked up
automatically; re-run the matching `install` lines from step 4/5.

## Environment variables

All settings are listed in `app/web/.env.example`. Notes:

- `ADMIN_GATE_PASSWORD_HASH` should be the **base64** value printed by
  `pnpm gate:hash`. A raw `$2b$...` bcrypt hash is corrupted by `.env` variable
  expansion unless every `$` is written as `\$`.
- `NEXT_PUBLIC_*` values are baked in during `next build`, so changing them
  needs a rebuild (`FORCE=1`).
- `NEXT_PUBLIC_MEDIA_BASE_URL` should point at the R2 bucket's custom domain
  (e.g. `https://media.mineacle.net`). The `r2.dev` fallback is rate limited
  by Cloudflare and meant for development only.

## If you keep the old panel for now

The code still builds with the old settings (root `app`, `npm install`,
`npm run build`, `npm run start`), but that path ignores the pnpm lockfile and
builds in the live folder, so a failed build can still take the site down.
Move to the setup above when you can.
