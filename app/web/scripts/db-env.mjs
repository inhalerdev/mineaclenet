import mysql from "mysql2/promise";

function required(primary, fallback) {
  const value =
    process.env[primary]?.trim() ||
    (fallback ? process.env[fallback]?.trim() : "");

  if (!value) {
    throw new Error(`Missing required environment variable: ${primary}`);
  }

  return value;
}

export function databaseConfig() {
  const port = Number(process.env.DB_PORT || 3306);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT must be a valid TCP port");
  }

  return {
    host: process.env.DB_HOST?.trim() || "127.0.0.1",
    port,
    user: required("DB_USERNAME", "DB_USER"),
    password: required("DB_PASSWORD"),
    database: required("DB_CORE_NAME", "CORE_DB_NAME"),
    charset: process.env.DB_CHARSET?.trim() || "utf8mb4",
  };
}

export function createMineaclePool(connectionLimit = 2) {
  const config = databaseConfig();

  return mysql.createPool({
    ...config,
    connectionLimit,
    maxIdle: Math.max(1, Math.min(connectionLimit, 2)),
    idleTimeout: 30_000,
    waitForConnections: true,
    queueLimit: 8,
    connectTimeout: 2_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: "Z",
  });
}
