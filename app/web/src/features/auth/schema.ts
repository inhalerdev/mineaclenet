import { getCoreDb } from "@/lib/db";

let ready = false;

/**
 * Auth schema creation is performed by scripts/migrate.mjs before the
 * production server starts. Request handlers only verify that the expected
 * tables are available; they never issue DDL.
 */
export async function ensureAuthSchema() {
  if (ready) {
    return;
  }

  await getCoreDb().query(`
    SELECT 1
    FROM mineacle_web_accounts a
    LEFT JOIN mineacle_web_verifications v ON 1 = 0
    LEFT JOIN mineacle_web_auth_limits l ON 1 = 0
    LEFT JOIN mineacle_web_sessions s ON 1 = 0
    LEFT JOIN mineacle_web_follows f ON 1 = 0
    LEFT JOIN mineacle_web_notifications n ON 1 = 0
    WHERE 1 = 0
  `);

  ready = true;
}
