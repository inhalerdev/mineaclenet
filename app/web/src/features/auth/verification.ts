import { createHash, randomBytes } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { ensureAuthSchema } from "@/features/auth/schema";
import { getCoreDb } from "@/lib/db";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TTL_SECONDS = 600;

type ProfileRow = RowDataPacket & {
  uuid: string;
  username: string;
};

export function hashVerificationCode(code: string) {
  return createHash("sha256")
    .update(code.trim().toUpperCase())
    .digest("hex");
}

function code() {
  const bytes = randomBytes(6);
  let value = "";

  for (const byte of bytes) {
    value += ALPHABET[byte % ALPHABET.length];
  }

  return value;
}

export async function beginVerification(usernameValue: string) {
  await ensureAuthSchema();

  const username = usernameValue.trim();

  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    throw new Error("Enter your exact Minecraft username");
  }

  const db = getCoreDb();
  const [profiles] = await db.execute<ProfileRow[]>(
    `SELECT uuid, username
     FROM mineacle_web_profiles
     WHERE LOWER(username) = LOWER(?)
     LIMIT 1`,
    [username],
  );

  const profile = profiles[0];

  if (!profile) {
    throw new Error(
      "That player has not joined Mineacle yet. Join the server once, then try again",
    );
  }

  const [existing] = await db.execute<RowDataPacket[]>(
    `SELECT id
     FROM mineacle_web_accounts
     WHERE uuid = ? OR username_lower = LOWER(?)
     LIMIT 1`,
    [profile.uuid, profile.username],
  );

  if (existing[0]) {
    throw new Error("That player already has an account. Log in instead");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + TTL_SECONDS;
  const challengeId = randomBytes(16).toString("hex");
  const verificationCode = code();

  await db.execute(
    `UPDATE mineacle_web_verifications
     SET consumed_at = ?
     WHERE uuid = ? AND consumed_at IS NULL`,
    [now, profile.uuid],
  );

  await db.execute(
    `INSERT INTO mineacle_web_verifications
      (challenge_id, uuid, username, username_lower, code_hash, created_at, expires_at)
     VALUES (?, ?, ?, LOWER(?), ?, ?, ?)`,
    [
      challengeId,
      profile.uuid,
      profile.username,
      profile.username,
      hashVerificationCode(verificationCode),
      now,
      expiresAt,
    ],
  );

  return {
    challengeId,
    username: profile.username,
    code: verificationCode,
    expiresAt,
  };
}
