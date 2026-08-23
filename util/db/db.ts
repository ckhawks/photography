import { Pool, type PoolConfig } from "pg";

/**
 * Plain Postgres, not Neon's HTTP driver. The site is moving off Neon onto a
 * self-hosted Postgres, and `@neondatabase/serverless` only speaks to Neon.
 *
 * One pool per process, cached on globalThis so dev hot reloads don't leak
 * pools on every edit.
 */
const globalForDb = globalThis as unknown as { photographyPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const config: PoolConfig = {
    connectionString,
    max: Number(process.env.PGPOOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };

  // Managed providers (Neon today) need TLS but present certs this client has
  // no root for; a self-hosted box on a private network does not.
  if (/sslmode=require|sslmode=verify/.test(connectionString)) {
    config.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(config);
  pool.on("error", (error) => {
    console.error("Postgres pool error:", error);
  });
  return pool;
}

export function getPool() {
  if (!globalForDb.photographyPool) {
    globalForDb.photographyPool = createPool();
  }
  return globalForDb.photographyPool;
}

/**
 * Run one query and return its rows, matching the shape the old neon() call
 * returned so callers did not have to change.
 */
export async function db<T = Record<string, any>>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query(query, params as any[]);
  return result.rows as T[];
}
