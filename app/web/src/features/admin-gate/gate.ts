import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { compare } from "bcryptjs";

export const ADMIN_GATE_COOKIE = "mineacle_admin_gate";
export const ADMIN_PREVIEW_COOKIE = "mineacle_admin_preview";

const TOKEN_VERSION = "v1";
const SESSION_HOURS = 12;

const ADMIN_USERNAME = "notator";

// bcrypt cost 12. Plaintext password is intentionally not stored in Git.
const ADMIN_PASSWORD_HASH =
  "$2b$12$vBgLL58BJi97LYVvhsDnsOIlScYyh8Dsy95m.JTUri7mhkQSOc6C6";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment: ${name}`);
  }

  return value;
}

function gateSecret() {
  // Derive the signing key from an existing server-only secret.
  // DB_PASSWORD is never sent to the browser or stored in the cookie.
  return createHash("sha256")
    .update(`mineacle-admin-gate:${requiredEnv("DB_PASSWORD")}`)
    .digest("hex");
}

function sessionSeconds() {
  return SESSION_HOURS * 60 * 60;
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

export async function verifyAdminGateCredentials(
  username: string,
  password: string,
) {
  const [usernameMatches, passwordMatches] = await Promise.all([
    Promise.resolve(
      safeEqual(
        username.trim().toLowerCase(),
        ADMIN_USERNAME.toLowerCase(),
      ),
    ),
    compare(password, ADMIN_PASSWORD_HASH),
  ]);

  return usernameMatches && passwordMatches;
}

export function createAdminGateToken() {
  const expiresAt =
    Math.floor(Date.now() / 1000) + sessionSeconds();

  const payload = Buffer.from(
    JSON.stringify({
      v: TOKEN_VERSION,
      u: ADMIN_USERNAME,
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

    const expectedSignature = signature(payload);

    if (!safeEqual(suppliedSignature, expectedSignature)) {
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
      safeEqual(
        data.u.toLowerCase(),
        ADMIN_USERNAME.toLowerCase(),
      )
    );
  } catch {
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
