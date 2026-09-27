import type { RowDataPacket } from "mysql2";
import { getCoreDb } from "@/lib/db";
import {
  SOCIAL_ORDER,
  isSocialPlatform,
  type SocialLink,
  type SocialPlatform,
} from "./social-platforms";

/*
 * Saving and loading players' social links (platform rules are in
 * social-platforms.ts).
 *
 * `verified_at` is for proving the account is theirs (planned: "Connect
 * with Discord / Twitch / YouTube" sign-in buttons). Until then links show
 * without the verified badge.
 */
let tableReady = false;

/* Creates the table if the deploy hasn't run migrations (scripts/migrate.mjs
   creates the same table). */
async function ensureSocialTable() {
  if (tableReady) {
    return;
  }

  await getCoreDb().query(`
    CREATE TABLE IF NOT EXISTS mineacle_web_social_links (
      account_id BIGINT UNSIGNED NOT NULL,
      platform VARCHAR(16) NOT NULL,
      handle VARCHAR(64) NOT NULL,
      verified_at BIGINT UNSIGNED NULL,
      updated_at BIGINT UNSIGNED NOT NULL,
      PRIMARY KEY (account_id, platform),
      CONSTRAINT fk_mineacle_social_account
        FOREIGN KEY (account_id) REFERENCES mineacle_web_accounts(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tableReady = true;
}

function toLinks(rows: RowDataPacket[]): SocialLink[] {
  return rows
    .map((row) => ({
      platform: String(row.platform) as SocialPlatform,
      handle: String(row.handle),
      verified: Number(row.verified_at || 0) > 0,
    }))
    .filter((link) => isSocialPlatform(link.platform))
    .sort((a, b) => SOCIAL_ORDER.indexOf(a.platform) - SOCIAL_ORDER.indexOf(b.platform));
}

/* Links on a player's public profile (by their Minecraft UUID). Never
   throws: a database problem just shows no links. */
export async function getSocialLinksForPlayer(uuid: string): Promise<SocialLink[]> {
  try {
    await ensureSocialTable();
    const [rows] = await getCoreDb().execute<RowDataPacket[]>(
      `SELECT s.platform, s.handle, s.verified_at
       FROM mineacle_web_social_links s
       JOIN mineacle_web_accounts a ON a.id = s.account_id
       WHERE a.uuid = ? AND a.disabled = 0`,
      [uuid],
    );
    return toLinks(rows);
  } catch (error) {
    console.error("[mineacle-social] Could not load social links", error);
    return [];
  }
}

export async function getSocialLinksForAccount(accountId: number): Promise<SocialLink[]> {
  await ensureSocialTable();
  const [rows] = await getCoreDb().execute<RowDataPacket[]>(
    `SELECT platform, handle, verified_at
     FROM mineacle_web_social_links
     WHERE account_id = ?`,
    [accountId],
  );
  return toLinks(rows);
}

/*
 * Saves the account's links. `handles` must already be normalized. Empty
 * handles remove that link. Changing a handle clears its verification.
 */
export async function saveSocialLinks(
  accountId: number,
  handles: Partial<Record<SocialPlatform, string>>,
) {
  await ensureSocialTable();
  const db = getCoreDb();
  const now = Math.floor(Date.now() / 1000);

  for (const platform of SOCIAL_ORDER) {
    const handle = handles[platform];

    if (handle === undefined) {
      continue;
    }

    if (!handle) {
      await db.execute(
        `DELETE FROM mineacle_web_social_links WHERE account_id = ? AND platform = ?`,
        [accountId, platform],
      );
      continue;
    }

    await db.execute(
      `INSERT INTO mineacle_web_social_links (account_id, platform, handle, verified_at, updated_at)
       VALUES (?, ?, ?, NULL, ?)
       ON DUPLICATE KEY UPDATE
         verified_at = IF(handle = VALUES(handle), verified_at, NULL),
         handle = VALUES(handle),
         updated_at = VALUES(updated_at)`,
      [accountId, platform, handle, now],
    );
  }
}
