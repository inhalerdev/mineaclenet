import mysql, { type Pool } from "mysql2/promise";

declare global {
  var __mineacleCorePool: Pool | undefined;
}

function requiredEnv(
  primary: string,
  fallback?: string,
) {
  const value =
    process.env[primary]?.trim() ||
    (fallback ? process.env[fallback]?.trim() : "");

  if (!value) {
    throw new Error(`Missing required database environment: ${primary}`);
  }

  return value;
}

export function coreDbConfig() {
  const port = Number(process.env.DB_PORT || 3306);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT must be a valid TCP port");
  }

  return {
    host: process.env.DB_HOST?.trim() || "127.0.0.1",
    port,
    user: requiredEnv("DB_USERNAME", "DB_USER"),
    password: requiredEnv("DB_PASSWORD"),
    database: requiredEnv("DB_CORE_NAME", "CORE_DB_NAME"),
    charset: process.env.DB_CHARSET?.trim() || "utf8mb4",
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
      connectionLimit: 8,
      maxIdle: 4,
      idleTimeout: 60_000,
      waitForConnections: true,
      queueLimit: 32,
      connectTimeout: 2_000,
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
