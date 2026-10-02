import mysql, { type Pool } from "mysql2/promise";

declare global {
  var __mineacleLiteBansPool: Pool | undefined;
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required LiteBans environment: ${name}`);
  return value;
}

export function liteBansDbConfig() {
  const port = Number(process.env.LITEBANS_DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("LITEBANS_DB_PORT must be a valid TCP port");
  }
  return {
    host: process.env.LITEBANS_DB_HOST?.trim() || "127.0.0.1",
    port,
    user: requiredEnv("LITEBANS_DB_USERNAME"),
    password: requiredEnv("LITEBANS_DB_PASSWORD"),
    database: process.env.LITEBANS_DB_NAME?.trim() || "mineacle_litebans",
    charset: process.env.LITEBANS_DB_CHARSET?.trim() || "utf8mb4",
  };
}

export function getLiteBansDb(): Pool {
  if (!globalThis.__mineacleLiteBansPool) {
    const config = liteBansDbConfig();
    globalThis.__mineacleLiteBansPool = mysql.createPool({
      ...config,
      connectionLimit: 4,
      maxIdle: 2,
      idleTimeout: 60_000,
      waitForConnections: true,
      queueLimit: 16,
      connectTimeout: 2_000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: "Z",
    });
  }
  return globalThis.__mineacleLiteBansPool;
}
