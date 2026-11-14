import fs from "node:fs";
import pg from "pg";

const env = Object.fromEntries(fs.readFileSync(".env.selfhost-db", "utf8").split(/\r?\n/).filter((x) => x && !x.startsWith("#") && x.includes("=")).map((x) => { const i = x.indexOf("="); return [x.slice(0, i), x.slice(i + 1)]; }));
const connect = (database) => new pg.Client({ host: "127.0.0.1", port: 5432, user: "passflow", password: env.POSTGRES_PASSWORD, database });
const source = connect("passflow_import_audit");
const target = connect("passflow_import_stage2");
const qi = (s) => '"' + String(s).replaceAll('"', '""') + '"';

try {
  await source.connect();
  await target.connect();
  await target.query("ALTER TABLE public.figma_connections ADD COLUMN IF NOT EXISTS avatar_url text");
  await target.query("ALTER TABLE public.figma_connections ADD COLUMN IF NOT EXISTS connected_at timestamptz");
  const srcTables = (await source.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map((r) => r.table_name);
  const dstTables = new Set((await target.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).rows.map((r) => r.table_name));
  const tables = srcTables.filter((t) => dstTables.has(t));
  for (const table of tables) {
    const count = Number((await target.query("SELECT count(*)::int AS n FROM public." + qi(table))).rows[0].n);
    if (count !== 0) throw new Error("staging table is not empty: " + table);
  }
  const srcCols = (await source.query("SELECT table_name,column_name,ordinal_position FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows;
  const dstCols = (await target.query("SELECT table_name,column_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public'")).rows;
  const sourceByTable = new Map();
  for (const c of srcCols) { if (!sourceByTable.has(c.table_name)) sourceByTable.set(c.table_name, []); sourceByTable.get(c.table_name).push(c.column_name); }
  const targetByTable = new Map();
  for (const c of dstCols) { if (!targetByTable.has(c.table_name)) targetByTable.set(c.table_name, []); targetByTable.get(c.table_name).push(c.column_name); }
  const common = new Map();
  for (const t of tables) {
    const sc = sourceByTable.get(t) || [], dc = targetByTable.get(t) || [];
    const cols = sc.filter((c) => dc.includes(c));
    const missingRequired = dstCols.filter((c) => c.table_name === t && c.is_nullable === "NO" && !c.column_default && !sc.includes(c.column_name));
    if (missingRequired.length) throw new Error("required target columns absent in source for " + t + ": " + missingRequired.map((c) => c.column_name).join(","));
    common.set(t, cols);
  }
  const fk = (await target.query("SELECT tc.table_name, ccu.table_name AS parent FROM information_schema.table_constraints tc JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.constraint_schema=tc.constraint_schema WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public' AND ccu.table_schema='public'")).rows;
  const deps = new Map(tables.map((t) => [t, new Set()]));
  for (const r of fk) if (deps.has(r.table_name) && deps.has(r.parent) && r.table_name !== r.parent) deps.get(r.table_name).add(r.parent);
  const order = [], remaining = new Set(tables);
  while (remaining.size) {
    const ready = [...remaining].filter((t) => [...deps.get(t)].every((p) => !remaining.has(p))).sort();
    if (!ready.length) throw new Error("foreign-key cycle detected in staging schema; no rows copied");
    for (const t of ready) { order.push(t); remaining.delete(t); }
  }
  await target.query("BEGIN");
  for (const t of tables) await target.query("ALTER TABLE public." + qi(t) + " DISABLE TRIGGER USER");
  let copied = 0;
  for (const t of order) {
    const cols = common.get(t);
    const rows = (await source.query("SELECT " + cols.map(qi).join(",") + " FROM public." + qi(t))).rows;
    for (const row of rows) {
      const vals = cols.map((c) => row[c]);
      const placeholders = vals.map((_, i) => "$" + (i + 1)).join(",");
      await target.query("INSERT INTO public." + qi(t) + " (" + cols.map(qi).join(",") + ") VALUES (" + placeholders + ")", vals);
      copied++;
    }
  }
  for (const t of tables) await target.query("ALTER TABLE public." + qi(t) + " ENABLE TRIGGER USER");
  await target.query("COMMIT");
  console.log(JSON.stringify({ staging: "passflow_import_stage2", source: "passflow_import_audit", tables: tables.length, rowsCopied: copied, tableOrder: order }, null, 2));
} catch (error) {
  try { await target.query("ROLLBACK"); } catch {}
  console.error("Staging public-data import failed; target transaction rolled back:", error.message);
  process.exitCode = 1;
} finally {
  await source.end().catch(() => {});
  await target.end().catch(() => {});
}
