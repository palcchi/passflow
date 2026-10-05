import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
const migrations = [
  '0001_initial_schema.sql',
  '0002_auth_read_policies.sql',
  '0003_core_mvp_features.sql',
  '0006_qr_delivery_templates.sql',
  '20260926174402_optional_qr_claim_mode_v1.sql',
  '20260927155113_scanner_lifecycle_guards.sql',
  '20260928120000_phase1_credential_guards.sql',
  '20261005120000_delete_unclaimed_credentials.sql',
];
const id = (n) => String(n).padStart(12, '0');
const uuid = (n) => `00000000-0000-4000-8000-${id(n)}`;
const [owner, visitor, other, orgA, orgB, eventA, eventB, attendee, attendeeB, ticketA, ticketB, vip] =
  Array.from({ length: 12 }, (_, i) => uuid(i + 1));

try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);
    create table storage.objects(bucket_id text,name text);
    create function storage.foldername(name text) returns text[] language sql immutable as
      $$ select string_to_array(name,'/') $$;
    grant usage on schema public,auth to anon,authenticated;
  `);
  for (const file of migrations) {
    const sql = fs.readFileSync(`supabase/migrations/${file}`, 'utf8')
      .replace('create extension if not exists "pgcrypto";', '');
    await db.exec(sql);
  }
  await db.exec(`
    alter table public.access_zones add column is_active boolean not null default true;
    alter table public.activities add column is_active boolean not null default true;
  `);
  const staff = uuid(24);
  await db.query('insert into auth.users(id) values($1),($2),($3),($4)', [owner, visitor, other, staff]);
  await db.query("insert into public.organizations(id,name,slug) values($1,'A','a'),($2,'B','b')", [orgA, orgB]);
  await db.query("insert into public.organization_members(organization_id,user_id,role) values($1,$2,'owner'),($3,$4,'owner'),($1,$5,'staff')", [orgA, owner, orgB, other, staff]);
  await db.query(`insert into public.events(id,organization_id,name,slug,status,qr_config)
    values($1,$2,'Event A','event-a','published','{"mode":"wristband","claim_mode":"claim"}'),
          ($3,$4,'Event B','event-b','published','{"mode":"wristband","claim_mode":"claim"}')`,
  [eventA, orgA, eventB, orgB]);
  await db.query("insert into public.ticket_types(id,event_id,name,code) values($1,$2,'General','general'),($3,$2,'VIP','vip'),($4,$5,'Other','other')",
    [ticketA, eventA, vip, ticketB, eventB]);
  await db.query("insert into public.attendees(id,event_id,user_id,ticket_type_id,attendee_code,name) values($1,$2,$3,$4,'A-1','Visitor'),($5,$6,$7,$8,'B-1','Other')",
    [attendee, eventA, visitor, ticketA, attendeeB, eventB, other, ticketB]);
  await db.query("insert into public.qr_credentials(event_id,code,display_code) values($1,'QR-1','PF-1'),($1,'QR-2','PF-2'),($2,'QR-B','PF-B')",
    [eventA, eventB]);
  await db.query("update public.qr_credentials set status='active',attendee_id=$1 where code='QR-2'", [attendee]);
  await db.exec('reset role;');
  const ids = Object.fromEntries((await db.query('select code,id from public.qr_credentials')).rows.map(r => [r.code, r.id]));
  const call = async (uid, event, codes) => {
    await db.exec(`reset role;set test.uid='${uid}';set role authenticated;`);
    try { return (await db.query('select public.delete_unclaimed_credentials($1,$2) n', [event, codes.map(c => ids[c])])).rows[0].n; }
    catch (error) { return error.message; } finally { await db.exec('reset role;'); }
  };
  assert.equal(await call(visitor, eventA, ['QR-1']), 'forbidden', 'non-managers cannot delete');
  assert.equal(await call(owner, eventA, ['QR-B']), 0, 'another event\'s code is untouched');
  assert.equal(await call(owner, eventA, ['QR-2']), 0, 'active credentials are kept');
  assert.equal(await call(owner, eventA, ['QR-1']), 1, 'unclaimed credential is deleted');
  assert.deepEqual((await db.query('select code from public.qr_credentials order by code')).rows.map(r => r.code), ['QR-2', 'QR-B']);
  await db.exec(`set test.uid='${owner}';set role authenticated;`);
  await assert.rejects(db.query('delete from public.qr_credentials'), /permission denied/);
  await db.exec('reset role;');
  console.log('delete-unclaimed-credentials: ok');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.close();
}
