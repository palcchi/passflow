import "server-only";
import { Pool, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | undefined;

/**
 * Server-only PostgreSQL pool for the self-hosted Passflow database.
 * Never import this module from a Client Component or expose DATABASE_URL.
 */
export function getPostgresPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("database_not_configured");
  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  });
  pool.on("error", () => {
    // Do not log connection details or credentials.
  });
  return pool;
}

export async function postgresQuery<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<Row>> {
  return getPostgresPool().query<Row>(text, values);
}
