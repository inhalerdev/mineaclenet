#!/usr/bin/env node

import { createMineaclePool } from "./db-env.mjs";

const pool = createMineaclePool(1);
const now = Math.floor(Date.now() / 1000);

try {
  const [sessions] = await pool.execute(
    `DELETE FROM mineacle_web_sessions
     WHERE expires_at <= ?`,
    [now],
  );

  const [limits] = await pool.execute(
    `DELETE FROM mineacle_web_auth_limits
     WHERE blocked_until <= ?
       AND updated_at < ?`,
    [now, now - 7 * 86400],
  );

  const [verifications] = await pool.execute(
    `DELETE FROM mineacle_web_verifications
     WHERE expires_at < ?
       AND consumed_at IS NOT NULL`,
    [now - 7 * 86400],
  );

  console.log(
    `[mineacle-cleanup] sessions=${sessions.affectedRows || 0} ` +
      `limits=${limits.affectedRows || 0} ` +
      `verifications=${verifications.affectedRows || 0}`,
  );
} catch (error) {
  console.error("[mineacle-cleanup] Cleanup failed", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
