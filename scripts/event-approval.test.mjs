import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';

// Coming soon, approval-gated registration, QR issuance after approval and notifications.
const db = new PGlite();
const migrations = [
  '0001_initial_schema.sql',
  '0002_auth_read_policies.sql',
  '0003_core_mvp_features.sql',
  '0006_qr_delivery_templates.sql',
  '20260926174402_optional_qr_claim_mode_v1.sql',
  '20260927155113_scanner_lifecycle_guards.sql',
  '20260928120000_phase1_credential_guards.sql',
  '20261006120000_event_access_and_approval.sql',
];
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [owner, guest, stranger, org, event, ticket] = [1, 2, 3, 4, 5, 6].map(uuid);

try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);
    create table storage.objects(bucket_id text,name text);
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
    grant usage on schema public,auth to anon,authenticated;
  `);
  for (const file of migrations) {
    await db.exec(fs.readFileSync(`supabase/migrations/${file}`, 'utf8').replace('create extension if not exists "pgcrypto";', ''));
  }
  await db.query("insert into auth.users(id,email) values($1,'owner@x.test'),($2,'guest@x.test'),($3,'stranger@x.test')", [owner, guest, stranger]);
  await db.query("insert into public.organizations(id,name,slug) values($1,'Org','org')", [org]);
  await db.query("insert into public.organization_members(organization_id,user_id,role) values($1,$2,'owner')", [org, owner]);
  await db.query(`insert into public.events(id,organization_id,name,slug,status,qr_config,registration_open,requires_approval)
    values($1,$2,'Private Dinner','private-dinner','published','{"mode":"digital","claim_mode":"automatic"}',false,true)`, [event, org]);
  await db.query("insert into public.ticket_types(id,event_id,name,code) values($1,$2,'Seat','seat')", [ticket, event]);

  const as = (uid) => db.exec(`reset role; set test.uid='${uid}'; set role authenticated;`);
  const rpc = async (sql, args) => (await db.query(sql, args)).rows[0].r;

  // Coming soon: registration closed.
  await as(guest);
  assert.equal((await rpc("select public.register_for_event('private-dinner','Guest Name') r")).reason, 'registration_closed');

  // Only managers change access settings.
  await assert.rejects(() => db.query("select public.set_event_access($1,'private',true,true)", [event]), /forbidden/);
  await as(owner);
  await db.query("select public.set_event_access($1,'private',true,true)", [event]);

  // Registration lands as pending: no QR yet, organizer is notified.
  await as(guest);
  const reg = await rpc("select public.register_for_event('private-dinner','Guest Name') r");
  assert.equal(reg.ok, true);
  assert.equal(reg.pending, true);
  await db.exec('reset role;');
  assert.equal((await db.query('select count(*)::int n from public.qr_credentials where attendee_id=$1', [reg.attendee_id])).rows[0].n, 0);
  assert.equal((await db.query("select count(*)::int n from public.notifications where user_id=$1 and kind='registration_request'", [owner])).rows[0].n, 1);

  // Pending attendees cannot be checked in.
  await assert.rejects(() => db.query('update public.attendees set checked_in_at=now() where id=$1', [reg.attendee_id]), /attendee_not_approved/);

  // Attendees cannot approve themselves or review others.
  await as(guest);
  await assert.rejects(() => db.query('select public.review_attendee($1,true)', [reg.attendee_id]), /forbidden/);
  await db.query("update public.attendees set approval_status='approved' where id=$1", [reg.attendee_id]);
  await db.exec('reset role;');
  assert.equal((await db.query('select approval_status from public.attendees where id=$1', [reg.attendee_id])).rows[0].approval_status, 'pending');

  // Approval issues the QR and notifies the attendee.
  await as(owner);
  const review = await rpc('select public.review_attendee($1,true) r', [reg.attendee_id]);
  assert.equal(review.email, 'guest@x.test');
  assert.equal(review.event_slug, 'private-dinner');
  await assert.rejects(() => db.query('select public.review_attendee($1,false)', [reg.attendee_id]), /not_pending/);
  await db.exec('reset role;');
  assert.equal((await db.query("select count(*)::int n from public.qr_credentials where attendee_id=$1 and status='active'", [reg.attendee_id])).rows[0].n, 1);

  // Attendee sees only their own notifications and can mark them read, nothing else.
  await as(guest);
  const mine = await db.query('select id,kind,href from public.notifications');
  assert.deepEqual(mine.rows.map((r) => r.kind), ['registration_approved']);
  assert.equal(mine.rows[0].href, '/e/private-dinner/claim');
  await db.query('update public.notifications set read_at=now() where id=$1', [mine.rows[0].id]);
  await assert.rejects(() => db.query("update public.notifications set title='x' where id=$1", [mine.rows[0].id]), /permission denied/);
  await assert.rejects(() => db.query("insert into public.notifications(user_id,kind,title) values($1,'x','x')", [guest]), /permission denied/);

  // Declined registrations do not count against capacity and get no QR.
  await as(stranger);
  const second = await rpc("select public.register_for_event('private-dinner','Stranger Name') r");
  await as(owner);
  assert.equal((await rpc('select public.review_attendee($1,false) r', [second.attendee_id])).approved, false);
  await db.exec('reset role;');
  assert.equal((await db.query('select count(*)::int n from public.qr_credentials where attendee_id=$1', [second.attendee_id])).rows[0].n, 0);

  // Open events without approval behave as before.
  await as(owner);
  await db.query("select public.set_event_access($1,'public',true,false)", [event]);
  await db.exec(`reset role; insert into auth.users(id,email) values('${uuid(9)}','walkin@x.test');`);
  await as(uuid(9));
  const walkIn = await rpc("select public.register_for_event('private-dinner','Walk In') r");
  assert.equal(walkIn.pending, false);
  console.log('event approval checks passed');
} finally {
  await db.close();
}
