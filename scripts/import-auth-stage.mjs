import fs from 'node:fs';
import pg from 'pg';

// One-off staging import only. Never logs password hashes or token values.
const env = Object.fromEntries(fs.readFileSync('.env.selfhost-db', 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#') && line.includes('=')).map((line) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const client = new pg.Client({ host: '127.0.0.1', port: 5432, user: 'passflow', password: env.POSTGRES_PASSWORD, database: 'passflow_import_stage2' });
const sourceUsers = await client.connect().then(async () => (await client.query(`SELECT id,email,encrypted_password,email_confirmed_at,invited_at,confirmation_token,confirmation_sent_at,recovery_token,recovery_sent_at,email_change_token_new,email_change,last_sign_in_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,created_at,updated_at FROM supabase_import.users`)).rows);
try {
  await client.query('BEGIN');
  for (const u of sourceUsers) {
    await client.query(`INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,invited_at,confirmation_token,confirmation_sent_at,recovery_token,recovery_sent_at,email_change_token_new,email_change,last_sign_in_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,encrypted_password=EXCLUDED.encrypted_password,email_confirmed_at=EXCLUDED.email_confirmed_at,raw_app_meta_data=EXCLUDED.raw_app_meta_data,raw_user_meta_data=EXCLUDED.raw_user_meta_data,updated_at=EXCLUDED.updated_at`, [u.id,u.email,u.encrypted_password,u.email_confirmed_at,u.invited_at,u.confirmation_token,u.confirmation_sent_at,u.recovery_token,u.recovery_sent_at,u.email_change_token_new,u.email_change,u.last_sign_in_at,u.raw_app_meta_data,u.raw_user_meta_data,u.is_super_admin,u.created_at,u.updated_at]);
  }
  const identities = (await client.query(`SELECT id,user_id,provider,provider_id,email,identity_data,created_at,updated_at FROM supabase_import.identities`)).rows;
  for (const i of identities) {
    const providerSubject = i.provider_id || i.id;
    const providerEmail = i.email || i.identity_data?.email || null;
    await client.query(`INSERT INTO auth.identities (id,user_id,provider,provider_subject,provider_email,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET provider_subject=EXCLUDED.provider_subject,provider_email=EXCLUDED.provider_email,updated_at=EXCLUDED.updated_at`, [i.id,i.user_id,i.provider,providerSubject,providerEmail,i.created_at || new Date(),i.updated_at || new Date()]);
  }
  await client.query('COMMIT');
  const summary = await client.query(`SELECT 'users' AS item, count(*)::int AS count FROM auth.users WHERE id IN (SELECT id FROM supabase_import.users) UNION ALL SELECT 'identities', count(*)::int FROM auth.identities WHERE id IN (SELECT id FROM supabase_import.identities)`);
  console.log(JSON.stringify({ staging: 'passflow_import_stage2', imported: summary.rows }, null, 2));
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Staging auth import failed; transaction rolled back:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
