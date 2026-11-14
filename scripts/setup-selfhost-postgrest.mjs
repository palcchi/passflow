import fs from "node:fs";
import crypto from "node:crypto";
import { Pool } from "pg";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  env[match[1]] = value;
}
if (!env.DATABASE_URL) throw new Error("database_not_configured");
const databaseUrl = new URL(env.DATABASE_URL);
const dbPassword = crypto.randomBytes(36).toString("base64url");
const jwtSecret = crypto.randomBytes(48).toString("base64url");
const role = "passflow_api_authenticator";
const pool = new Pool({ connectionString: env.DATABASE_URL, ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
try {
  const client = await pool.connect();
  try {
    const exists = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
    if (!exists.rowCount) {
      await client.query("CREATE ROLE " + role + " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '" + dbPassword + "'");
    } else {
      await client.query("ALTER ROLE " + role + " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '" + dbPassword + "'");
    }
    await client.query("GRANT anon, authenticated, service_role TO " + role);
    await client.query("GRANT USAGE ON SCHEMA public, auth TO anon, authenticated");
    await client.query("GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated");
    await client.query("GRANT USAGE ON SCHEMA public, auth, storage TO service_role");
    await client.query("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, auth, storage TO service_role");
    await client.query("GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public, auth, storage TO service_role");
    await client.query("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public, auth, storage TO service_role");
    await client.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public, auth, storage GRANT EXECUTE ON FUNCTIONS TO service_role");
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const header = encode({ alg: "HS256", typ: "JWT" });
const now = Math.floor(Date.now() / 1000);
const payload = encode({ role: "anon", iss: "passflow-selfhost", iat: now, exp: now + 31536000 });
const unsigned = header + "." + payload;
const anonKey = unsigned + "." + crypto.createHmac("sha256", jwtSecret).update(unsigned).digest("base64url");
const uri = "postgres://" + role + ":" + dbPassword + "@passflow-postgres:5432/" + decodeURIComponent(databaseUrl.pathname.slice(1));
const values = [
  "PGRST_DB_URI=" + uri,
  "PGRST_DB_SCHEMAS=public",
  "PGRST_DB_ANON_ROLE=anon",
  "PGRST_JWT_SECRET=" + jwtSecret,
  "PGRST_SERVER_PORT=3000",
  "PGRST_DB_EXTRA_SEARCH_PATH=public,extensions",
  "PASSFLOW_POSTGREST_ANON_KEY=" + anonKey,
].join("\n") + "\n";
fs.writeFileSync(".env.selfhost-postgrest", values, { mode: 0o600 });
fs.chmodSync(".env.selfhost-postgrest", 0o600);
console.log("Created restricted PostgREST role and protected local config. Secrets were not displayed.");
