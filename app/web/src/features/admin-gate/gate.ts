import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { compare } from "bcryptjs";

export const ADMIN_GATE_COOKIE = "mineacle_admin_gate";
export const ADMIN_PREVIEW_COOKIE = "mineacle_admin_preview";

const TOKEN_VERSION = "v1";
const DEFAULT_SESSION_HOURS = 12;
const MAX_SESSION_HOURS = 168;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment: ${name}`);
  }

  return value;
}

function configuredUsername() {
  return requiredEnv("ADMIN_GATE_USERNAME");
}

function gateSecret() {
  const value = requiredEnv("ADMIN_GATE_SECRET");

  if (value.length < 32) {
    throw new Error("ADMIN_GATE_SECRET must be at least 32 characters");
  }

  return value;
}

function sessionSeconds() {
  const hours = Number(
    process.env.ADMIN_GATE_SESSION_HOURS || DEFAULT_SESSION_HOURS,
  );

  const safeHours =
    Number.isFinite(hours) && hours > 0
      ? Math.min(hours, MAX_SESSION_HOURS)
      : DEFAULT_SESSION_HOURS;

  return Math.floor(safeHours * 60 * 60);
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
  const expectedUsername = configuredUsername();
  const passwordHash = requiredEnv("ADMIN_GATE_PASSWORD_HASH");

  // Always verify the password hash so username failures do not become
  // noticeably cheaper than password failures.
  const [usernameMatches, passwordMatches] = await Promise.all([
    Promise.resolve(
      safeEqual(
        username.trim().toLowerCase(),
        expectedUsername.toLowerCase(),
      ),
    ),
    compare(password, passwordHash),
  ]);

  return usernameMatches && passwordMatches;
}

export function createAdminGateToken() {
  const expiresAt =
    Math.floor(Date.now() / 1000) + sessionSeconds();

  const payload = Buffer.from(
    JSON.stringify({
      v: TOKEN_VERSION,
      u: configuredUsername(),
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
        configuredUsername().toLowerCase(),
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
