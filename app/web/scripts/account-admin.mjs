#!/usr/bin/env node

import { createMineaclePool } from "./db-env.mjs";

const [command, usernameArg, ...rest] = process.argv.slice(2);
const username = (usernameArg || "").trim();

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!command || !username) {
  fail(
    "Usage: node scripts/account-admin.mjs <info|revoke|disable|enable|reset-verification|delete> <username> [--confirm username]",
  );
}

if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
  fail("Invalid Minecraft username");
}

const pool = createMineaclePool(2);

async function account() {
  const [rows] = await pool.execute(
    `SELECT id, uuid, username, disabled, created_at, last_login_at
     FROM mineacle_web_accounts
     WHERE username_lower = LOWER(?)
     LIMIT 1`,
    [username],
  );

  return rows[0] || null;
}

try {
  const row = await account();

  if (!row) {
    fail(`No web account exists for ${username}`);
  }

  if (command === "info") {
    const [sessions] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM mineacle_web_sessions
       WHERE account_id = ? AND expires_at > ?`,
      [row.id, Math.floor(Date.now() / 1000)],
    );

    console.log(
      JSON.stringify(
        {
          username: row.username,
          uuid: row.uuid,
          disabled: Boolean(row.disabled),
          activeSessions: Number(sessions[0]?.total || 0),
        },
        null,
        2,
      ),
    );
  } else if (command === "revoke") {
    await pool.execute(
      "DELETE FROM mineacle_web_sessions WHERE account_id = ?",
      [row.id],
    );
    console.log(`Revoked all sessions for ${row.username}`);
  } else if (command === "disable") {
    await pool.execute(
      "UPDATE mineacle_web_accounts SET disabled = 1, updated_at = ? WHERE id = ?",
      [Math.floor(Date.now() / 1000), row.id],
    );
    await pool.execute(
      "DELETE FROM mineacle_web_sessions WHERE account_id = ?",
      [row.id],
    );
    console.log(`Disabled ${row.username} and revoked all sessions`);
  } else if (command === "enable") {
    await pool.execute(
      "UPDATE mineacle_web_accounts SET disabled = 0, updated_at = ? WHERE id = ?",
      [Math.floor(Date.now() / 1000), row.id],
    );
    console.log(`Enabled ${row.username}`);
  } else if (command === "reset-verification") {
    await pool.execute(
      "DELETE FROM mineacle_web_verifications WHERE uuid = ?",
      [row.uuid],
    );
    console.log(`Cleared verification history for ${row.username}`);
  } else if (command === "delete") {
    const confirmIndex = rest.indexOf("--confirm");
    const confirmation =
      confirmIndex >= 0 ? rest[confirmIndex + 1] || "" : "";

    if (confirmation.toLowerCase() !== username.toLowerCase()) {
      fail(
        `Deletion refused. Re-run with --confirm ${username}`,
      );
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.execute(
        "DELETE FROM mineacle_web_verifications WHERE uuid = ?",
        [row.uuid],
      );
      await connection.execute(
        "DELETE FROM mineacle_web_accounts WHERE id = ?",
        [row.id],
      );
      await connection.commit();
      console.log(`Deleted web account for ${row.username}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } else {
    fail(`Unknown command: ${command}`);
  }
} finally {
  await pool.end();
}
