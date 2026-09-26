/*
 * Where to send someone after they log in (?next=/vote on /login).
 *
 * Only paths on this site are allowed, so a link like
 * /login?next=https://evil.example can't bounce players to another site.
 * Anything odd falls back to the homepage.
 */
export function safeReturnPath(value: unknown): string {
  const path = Array.isArray(value) ? value[0] : value;

  if (
    typeof path !== "string" ||
    path.length > 200 ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    /[\\\s]/.test(path) ||
    /^\/(login|register|api)(\/|\?|$)/.test(path)
  ) {
    return "/";
  }

  return path;
}

/* Login / register link that comes back to `path` afterwards. */
export function withReturnPath(page: "/login" | "/register", path: string) {
  return path === "/" ? page : `${page}?next=${encodeURIComponent(path)}`;
}
