import mysql, { Pool } from "mysql2/promise";

declare global {
  var mysqlPool: Pool | undefined;
}

export function getPool(): Pool {
  const host = process.env.MYSQL_HOST;
  const database = process.env.MYSQL_DATABASE;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const port = Number(process.env.MYSQL_PORT || 3306);
  const sslEnabled = process.env.MYSQL_SSL !== "false"; // Default to true for Digital Ocean

  if (!host || !database || !user) {
    throw new Error("MySQL env variables are not fully set.");
  }

  if (!globalThis.mysqlPool) {
    const poolConfig: mysql.PoolOptions = {
      host,
      database,
      user,
      password,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    };

    // Add SSL configuration for Digital Ocean (or other cloud providers)
    if (sslEnabled) {
      poolConfig.ssl = {
        rejectUnauthorized: false, // Digital Ocean uses self-signed certificates
      };
    }

    globalThis.mysqlPool = mysql.createPool(poolConfig);
  }

  return globalThis.mysqlPool;
}