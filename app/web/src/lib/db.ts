import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import mysql, { type Pool } from "mysql2/promise";

declare global {
  var __mineacleCorePool: Pool | undefined;
}

function loadLegacyParentEnv() {
  const envPath = path.resolve(process.cwd(), "..", ".env");

  if (!existsSync(envPath)) {
    return;
  }

  try {
    const source = readFileSync(envPath, "utf8");

    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");

      if (separator <= 0) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // The visitor homepage must remain available if legacy env loading fails.
  }
}

loadLegacyParentEnv();

export function coreDbConfig() {
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || process.env.DB_USER || "website_user",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_CORE_NAME || process.env.CORE_DB_NAME || "mineacle_core",
    charset: process.env.DB_CHARSET || "utf8mb4",
  };
}

export function getCoreDb(): Pool {
  if (!globalThis.__mineacleCorePool) {
    const config = coreDbConfig();

    globalThis.__mineacleCorePool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      charset: config.charset,
      connectionLimit: 10,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: "Z",
    });
  }

  return globalThis.__mineacleCorePool;
}

export async function canReachCoreDb() {
  try {
    await getCoreDb().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
