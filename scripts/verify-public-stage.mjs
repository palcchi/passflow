import fs from "node:fs";
import pg from "pg";
const env = Object.fromEntries(fs.readFileSync(".env.selfhost-db", "utf8").split(/\r?\n/).filter((x) => x && !x.startsWith("#") && x.includes("=")).map((x) => { const i = x.indexOf("="); return [x.slice(0, i), x.slice(i + 1)]; }));
const connect = (database) => new pg.Client({ host: "127.0.0.1", port: 5432, user: "passflow", password: env.POSTGRES_PASSWORD, database });
const qi = (s) => '"' + String(s).replaceAll('"', '""') + '"';
const source = connect("passflow_import_audit"), target = connect("passflow_import_stage2");
try {
  await source.connect(); await target.connect();
  const names = (await source.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map((r) => r.table_name);
  const targetNames = new Set((await target.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).rows.map((r) => r.table_name));
  const checks = [];
  for (const t of names.filter((n) => targetNames.has(n))) {
    const a = Number((await source.query("SELECT count(*)::int AS n FROM public." + qi(t))).rows[0].n);
    const b = Number((await target.query("SELECT count(*)::int AS n FROM public." + qi(t))).rows[0].n);
    checks.push({ table: t, source: a, staging: b, match: a === b });
  }
  const auth = await target.query("SELECT (SELECT count(*)::int FROM auth.users) AS auth_users, (SELECT count(*)::int FROM auth.identities) AS auth_identities");
  const mismatches = checks.filter((x) => !x.match);
  console.log(JSON.stringify({ tablesChecked: checks.length, sourceRows: checks.reduce((s, x) => s + x.source, 0), stagingRows: checks.reduce((s, x) => s + x.staging, 0), mismatches, auth: auth.rows[0] }, null, 2));
  if (mismatches.length) process.exitCode = 2;
} catch (error) { console.error("Verification failed:", error.message); process.exitCode = 1; }
finally { await source.end().catch(() => {}); await target.end().catch(() => {}); }
