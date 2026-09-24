import { createHmac, timingSafeEqual } from "node:crypto";
import { compare } from "bcryptjs";

/**
 * Development gateway.
 *
 * Every credential comes from server-side environment variables so nothing
 * sensitive lives in the (public) Git repository:
 *
 *   ADMIN_GATE_USERNAME       login name for the gateway
 *   ADMIN_GATE_PASSWORD_HASH  bcrypt hash, or its base64 form
 *   ADMIN_GATE_SECRET         32+ random characters used to sign the cookie
 *   ADMIN_GATE_SESSION_HOURS  optional, defaults to 12 (max 168)
 *
 * Generate the hash and a secret with:  pnpm gate:hash
 *
 * If anything is missing or malformed the gateway stays locked and the
 * /admin page shows "Gateway configuration is incomplete".
 */

export const ADMIN_GATE_COOKIE = "mineacle_admin_gate";
export const ADMIN_PREVIEW_COOKIE = "mineacle_admin_preview";

// v2: tokens are signed with ADMIN_GATE_SECRET instead of a key derived from
// DB_PASSWORD, so every v1 cookie is rejected and users sign in once more.
const TOKEN_VERSION = "v2";
const DEFAULT_SESSION_HOURS = 12;
const MAX_SESSION_HOURS = 168;
const MIN_SECRET_LENGTH = 32;
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment: ${name}`);
  }

  return value;
}

function adminUsername() {
  return requiredEnv("ADMIN_GATE_USERNAME").toLowerCase();
}

function adminPasswordHash() {
  const configured = requiredEnv("ADMIN_GATE_PASSWORD_HASH");

  if (BCRYPT_HASH.test(configured)) {
    return configured;
  }

  // Base64 form. Next.js expands `$NAME` inside .env files, which silently
  // corrupts a raw bcrypt hash unless every `$` is escaped as `\$`.
  const decoded = Buffer.from(configured, "base64")
    .toString("utf8")
    .trim();

  if (BCRYPT_HASH.test(decoded)) {
    return decoded;
  }

  throw new Error(
    "ADMIN_GATE_PASSWORD_HASH is not a valid bcrypt hash. Use the base64 value printed by `pnpm gate:hash`, or escape every `$` as `\\$` in .env files.",
  );
}

function gateSecret() {
  const secret = requiredEnv("ADMIN_GATE_SECRET");

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `ADMIN_GATE_SECRET must be at least ${MIN_SECRET_LENGTH} characters`,
    );
  }

  return secret;
}

function sessionSeconds() {
  const hours = Number(
    process.env.ADMIN_GATE_SESSION_HOURS?.trim() ||
      DEFAULT_SESSION_HOURS,
  );
  const bounded =
    Number.isFinite(hours) && hours > 0
      ? Math.min(hours, MAX_SESSION_HOURS)
      : DEFAULT_SESSION_HOURS;

  return Math.floor(bounded * 60 * 60);
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

function signature(payload: string) {
  return createHmac("sha256", gateSecret())
    .update(payload)
    .digest("base64url");
}

/**
 * Throws when the gateway is not configured, so the caller can show a
 * configuration error instead of "incorrect password".
 */
export async function verifyAdminGateCredentials(
  username: string,
  password: string,
) {
  const expectedUsername = adminUsername();
  const hash = adminPasswordHash();
  gateSecret();

  // Always run bcrypt, even for a wrong username, so response time does not
  // reveal which part was wrong.
  const [usernameMatches, passwordMatches] = await Promise.all([
    Promise.resolve(
      safeEqual(username.trim().toLowerCase(), expectedUsername),
    ),
    compare(password, hash),
  ]);

  return usernameMatches && passwordMatches;
}

export function createAdminGateToken() {
  const expiresAt =
    Math.floor(Date.now() / 1000) + sessionSeconds();

  const payload = Buffer.from(
    JSON.stringify({
      v: TOKEN_VERSION,
      u: adminUsername(),
      exp: expiresAt,
    }),
  ).toString("base64url");

  return `${payload}.${signature(payload)}`;
}

export function verifyAdminGateToken(token?: string) {
  if (!token) {
    return false;
  }

  try {
    const [payload, suppliedSignature, extra] = token.split(".");

    if (!payload || !suppliedSignature || extra) {
      return false;
    }

    if (!safeEqual(suppliedSignature, signature(payload))) {
      return false;
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      v?: string;
      u?: string;
      exp?: number;
    };

    const now = Math.floor(Date.now() / 1000);

    return (
      data.v === TOKEN_VERSION &&
      typeof data.exp === "number" &&
      data.exp > now &&
      typeof data.u === "string" &&
      safeEqual(data.u.toLowerCase(), adminUsername())
    );
  } catch {
    // Missing configuration also lands here: the gateway stays locked.
    return false;
  }
}

export function adminGateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: sessionSeconds(),
  };
}

export function adminPreviewCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: sessionSeconds(),
  };
}
