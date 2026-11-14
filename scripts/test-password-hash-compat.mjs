import fs from 'node:fs';
import pg from 'pg';
import bcrypt from 'bcryptjs';
const env = Object.fromEntries(fs.readFileSync('.env.selfhost-db', 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#') && line.includes('=')).map((line) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const client = new pg.Client({ host: '127.0.0.1', port: 5432, user: 'passflow', password: env.POSTGRES_PASSWORD, database: 'passflow_import_stage2' });
await client.connect();
try {
  const result = await client.query(`SELECT encrypted_password FROM auth.users WHERE id IN (SELECT id FROM supabase_import.users)`);
  let hashed = 0, empty = 0, parseable = 0, wrongPasswordRejected = 0, errors = 0;
  for (const row of result.rows) {
    const hash = row.encrypted_password;
    if (!hash) { empty++; continue; }
    hashed++;
    try {
      const rounds = bcrypt.getRounds(hash);
      if (Number.isInteger(rounds) && rounds >= 4 && rounds <= 31) parseable++;
      const matches = await bcrypt.compare('passflow-compatibility-check-not-a-real-password', hash);
      if (!matches) wrongPasswordRejected++;
    } catch { errors++; }
  }
  const outcome = { staging: 'passflow_import_stage2', usersChecked: result.rowCount, usersWithPasswordHash: hashed, usersWithoutPasswordHash: empty, hashesParsedByBcryptjs: parseable, wrongPasswordRejected: wrongPasswordRejected, hashParseErrors: errors, compatible: hashed > 0 && parseable === hashed && wrongPasswordRejected === hashed && errors === 0 };
  console.log(JSON.stringify(outcome, null, 2));
  if (!outcome.compatible) process.exitCode = 2;
} finally { await client.end(); }
