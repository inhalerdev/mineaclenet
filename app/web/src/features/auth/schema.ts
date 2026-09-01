import { getCoreDb } from "@/lib/db";

let ready = false;

export async function ensureAuthSchema() {
  if (ready) {
    return;
  }

  const db = getCoreDb();

  await db.query(`
    CREATE TABLE IF NOT EXISTS mineacle_web_accounts (
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
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS mineacle_web_verifications (
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
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS mineacle_web_auth_limits (
      bucket_hash CHAR(64) NOT NULL,
      attempts INT UNSIGNED NOT NULL DEFAULT 0,
      window_started_at BIGINT UNSIGNED NOT NULL,
      blocked_until BIGINT UNSIGNED NOT NULL DEFAULT 0,
      updated_at BIGINT UNSIGNED NOT NULL,
      PRIMARY KEY (bucket_hash),
      KEY idx_mineacle_auth_limit_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS mineacle_web_sessions (
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
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS mineacle_web_follows (
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
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS mineacle_web_notifications (
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
  `);

  ready = true;
}
