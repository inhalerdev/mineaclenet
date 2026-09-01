#!/usr/bin/env node

import { createMineaclePool } from "./db-env.mjs";

const TABLES = [
  [
    "mineacle_web_accounts",
    `
      CREATE TABLE mineacle_web_accounts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        uuid CHAR(36) NOT NULL,
        username VARCHAR(16) NOT NULL,
        username_lower VARCHAR(16) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        verified_at BIGINT UNSIGNED NOT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        last_login_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
        disabled TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY uq_mineacle_account_uuid (uuid),
        UNIQUE KEY uq_mineacle_account_username (username_lower),
        KEY idx_mineacle_account_disabled (disabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  ],
  [
    "mineacle_web_verifications",
    `
      CREATE TABLE mineacle_web_verifications (
        challenge_id CHAR(32) NOT NULL,
        uuid CHAR(36) NOT NULL,
        username VARCHAR(16) NOT NULL,
        username_lower VARCHAR(16) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        expires_at BIGINT UNSIGNED NOT NULL,
        verified_at BIGINT UNSIGNED NULL,
        verified_username VARCHAR(16) NULL,
        consumed_at BIGINT UNSIGNED NULL,
        PRIMARY KEY (challenge_id),
        KEY idx_mineacle_verification_code (code_hash),
        KEY idx_mineacle_verification_uuid (uuid),
        KEY idx_mineacle_verification_expiry (expires_at),
        KEY idx_mineacle_verification_state (verified_at, consumed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  ],
  [
    "mineacle_web_auth_limits",
    `
      CREATE TABLE mineacle_web_auth_limits (
        bucket_hash CHAR(64) NOT NULL,
        attempts INT UNSIGNED NOT NULL DEFAULT 0,
        window_started_at BIGINT UNSIGNED NOT NULL,
        blocked_until BIGINT UNSIGNED NOT NULL DEFAULT 0,
        updated_at BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (bucket_hash),
        KEY idx_mineacle_auth_limit_updated (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  ],
  [
    "mineacle_web_sessions",
    `
      CREATE TABLE mineacle_web_sessions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        account_id BIGINT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        expires_at BIGINT UNSIGNED NOT NULL,
        last_seen_at BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_mineacle_session_token (token_hash),
        KEY idx_mineacle_session_account (account_id),
        KEY idx_mineacle_session_expiry (expires_at),
        CONSTRAINT fk_mineacle_session_account
          FOREIGN KEY (account_id) REFERENCES mineacle_web_accounts(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  ],
  [
    "mineacle_web_follows",
    `
      CREATE TABLE mineacle_web_follows (
        follower_account_id BIGINT UNSIGNED NOT NULL,
        target_uuid CHAR(36) NOT NULL,
        target_username VARCHAR(16) NOT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (follower_account_id, target_uuid),
        KEY idx_mineacle_follow_target (target_uuid),
        CONSTRAINT fk_mineacle_follow_account
          FOREIGN KEY (follower_account_id) REFERENCES mineacle_web_accounts(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  ],
  [
    "mineacle_web_notifications",
    `
      CREATE TABLE mineacle_web_notifications (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        account_id BIGINT UNSIGNED NOT NULL,
        category VARCHAR(32) NOT NULL,
        title VARCHAR(120) NOT NULL,
        body VARCHAR(400) NOT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        read_at BIGINT UNSIGNED NULL,
        PRIMARY KEY (id),
        KEY idx_mineacle_notification_account (account_id, created_at),
        KEY idx_mineacle_notification_unread (account_id, read_at),
        CONSTRAINT fk_mineacle_notification_account
          FOREIGN KEY (account_id) REFERENCES mineacle_web_accounts(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  ],
];

const pool = createMineaclePool(1);

try {
  const names = TABLES.map(([name]) => name);
  const placeholders = names.map(() => "?").join(", ");

  const [rows] = await pool.execute(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${placeholders})`,
    names,
  );

  const existing = new Set(
    rows.map((row) => String(row.TABLE_NAME || row.table_name || "")),
  );

  for (const [name, createSql] of TABLES) {
    if (existing.has(name)) {
      continue;
    }

    console.log(`[mineacle-migrate] Creating ${name}`);
    await pool.query(createSql);
  }

  console.log("[mineacle-migrate] Auth schema ready");
} catch (error) {
  console.error("[mineacle-migrate] Migration failed", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
