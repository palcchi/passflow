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
];
const id = (n) => String(n).padStart(12, '0');
const uuid = (n) => `00000000-0000-4000-8000-${id(n)}`;
const [owner, visitor, other, orgA, orgB, eventA, eventB, attendee, attendeeB, ticketA, ticketB, vip, gate, vipGate, zone, benefitGate, benefit, activityGate, activity] =
  Array.from({ length: 19 }, (_, i) => uuid(i + 1));

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
  await db.query("insert into public.access_zones(id,event_id,name,code) values($1,$2,'VIP Area','vip')", [zone, eventA]);
  await db.query("insert into public.access_rules(event_id,zone_id,ticket_type_id,allowed) values($1,$2,$3,true)", [eventA, zone, vip]);
  await db.query("insert into public.benefits(id,event_id,name,code) values($1,$2,'Gift','gift')", [benefit, eventA]);
  await db.query("insert into public.activities(id,event_id,name,code) values($1,$2,'Talk','talk')", [activity, eventA]);
  await db.query(`insert into public.scanner_stations(id,event_id,zone_id,name,slug,mode,config)
    values($1,$2,null,'Entry','entry','check_in','{}'),
      ($3,$2,$4,'VIP','vip','zone_access','{}'),
      ($5,$2,null,'Gift','gift','claim','{"benefit_code":"gift"}'),
      ($6,$2,null,'Talk','talk','activity','{"activity_code":"talk"}')`,
  [gate, eventA, vipGate, zone, benefitGate, activityGate]);
  const rpc = async (name, args) =>
    (await db.query(`select public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) as result`, args)).rows[0].result;
  await db.exec(`set test.uid='${visitor}';set role authenticated;`);
  assert.equal((await rpc('claim_qr', ['event-a', 'QR-1'])).ok, true);
  assert.equal((await db.query('select count(*)::int as n from public.qr_credentials where event_id=$1', [eventA])).rows[0].n, 1);
  assert.equal((await db.query('select count(*)::int as n from public.qr_credentials where event_id=$1', [eventB])).rows[0].n, 0);
  assert.equal((await db.query('update public.attendees set name=$1 where id=$2 returning id', ['Tampered', attendeeB])).rows.length, 0);
  assert.equal((await rpc('validate_scan', [gate, 'QR-1'])).reason, 'forbidden');
  await db.exec(`reset role;set test.uid='${owner}';set role authenticated;`);
  assert.equal((await rpc('validate_scan', [gate, 'QR-1'])).decision, 'granted');
  assert.equal((await rpc('validate_scan', [gate, 'QR-1'])).decision, 'already_checked_in');
  assert.equal((await rpc('validate_scan', [vipGate, 'QR-1'])).decision, 'denied');
  await db.query('update public.attendees set ticket_type_id=$1 where id=$2', [vip, attendee]);
  assert.equal((await rpc('validate_scan', [vipGate, 'QR-1'])).decision, 'granted');
  assert.equal((await db.query('select count(*)::int as n from public.attendees where event_id=$1', [eventB])).rows[0].n, 0);
  assert.equal((await db.query('update public.attendees set name=$1 where id=$2 returning id', ['Tampered', attendeeB])).rows.length, 0);
  assert.equal((await db.query('select count(*)::int as n from public.qr_credentials where event_id=$1', [eventB])).rows[0].n, 0);
  assert.equal((await rpc('validate_scan', [gate, 'QR-B'])).decision, 'invalid');
  assert.equal((await rpc('validate_scan', [benefitGate, 'QR-1'])).decision, 'granted');
  assert.equal((await rpc('validate_scan', [benefitGate, 'QR-1'])).decision, 'already_claimed');
  assert.equal((await rpc('validate_scan', [activityGate, 'QR-1'])).decision, 'granted');
  assert.equal((await rpc('validate_scan', [activityGate, 'QR-1'])).decision, 'already_claimed');
  await db.exec(`reset role;set test.uid='${visitor}';set role authenticated;`);
  assert.equal((await rpc('replace_qr', ['event-a', 'QR-2'])).ok, true);
  await db.exec(`reset role;set test.uid='${owner}';set role authenticated;`);
  assert.equal((await rpc('validate_scan', [gate, 'QR-1'])).decision, 'invalid');
  await assert.rejects(() => db.query("update public.qr_credentials set status='active' where code='QR-1'"), /invalid_credential_transition|permission denied/);
  await db.query("update public.qr_credentials set status='revoked',revoked_at=now() where event_id=$1 and code='QR-2'", [eventA]);
  assert.equal((await rpc('validate_scan', [gate, 'QR-2'])).decision, 'invalid');
  const history = (await db.query('select action from public.qr_credential_events where event_id=$1 order by created_at,id', [eventA])).rows.map(row => row.action);
  assert.deepEqual(history.sort(), ['claimed', 'claimed', 'replaced', 'revoked'].sort());
  assert.equal((await db.query("select count(*)::int as n from public.scan_logs where event_id=$1 and metadata ? 'actor_id'", [eventA])).rows[0].n, 11);
  const manualAttendee = uuid(23);
  const lookup = await rpc('lookup_station_attendees', [gate, 'Visitor']);
  assert.equal(lookup.attendees.length, 1);
  assert.equal(lookup.attendees[0].attendee_code, 'A-1');
  assert.equal(JSON.stringify(lookup).includes('QR-1'), false);
  assert.equal((await rpc('manual_station_check_in', [gate, attendee, 'Camera unavailable'])).decision, 'denied');
  await db.query("insert into public.attendees(id,event_id,ticket_type_id,attendee_code,name) values($1,$2,$3,'A-3','Manual Visitor')",
    [manualAttendee, eventA, ticketA]);
  assert.equal((await rpc('manual_station_check_in', [gate, manualAttendee, 'Camera unavailable'])).decision, 'granted');
  assert.equal((await rpc('manual_station_check_in', [gate, manualAttendee, 'Camera unavailable'])).decision, 'already_checked_in');
  assert.equal((await db.query("select count(*)::int as n from public.scan_logs where event_id=$1 and metadata->>'manual'='true'", [eventA])).rows[0].n, 3);
  await db.exec(`reset role;set test.uid='${staff}';set role authenticated;`);
  assert.equal((await db.query('select count(*)::int as n from public.qr_credentials where event_id=$1', [eventA])).rows[0].n, 0);
  assert.equal((await rpc('lookup_station_attendees', [gate, 'Manual'])).attendees.length, 1);
  assert.equal((await rpc('manual_station_check_in', [gate, manualAttendee, 'Camera unavailable'])).decision, 'already_checked_in');
  assert.equal((await db.query("update public.qr_credentials set status='revoked' where event_id=$1 returning id", [eventA])).rows.length, 0);
  await db.exec('reset role;');
  await db.query('update public.scanner_rate_limits set attempts=600 where user_id=$1 and station_id=$2', [owner, gate]);
  await db.exec(`set test.uid='${owner}';set role authenticated;`);
  assert.equal((await rpc('validate_scan', [gate, 'QR-1'])).reason, 'rate_limited');
  await assert.rejects(() => db.query('select * from public.scanner_rate_limits'), /permission denied/);
  const registrationEvent = uuid(20), registrationTicket = uuid(21);
  await db.query(`insert into public.events(id,organization_id,name,slug,status,capacity,qr_config)
    values($1,$2,'One seat','one-seat','published',1,'{"claim_mode":"claim"}')`,
    [registrationEvent, orgA]);
  await db.query("insert into public.ticket_types(id,event_id,name,code,capacity) values($1,$2,'One','one',1)",
    [registrationTicket, registrationEvent]);
  await db.exec(`reset role;set test.uid='${visitor}';set role authenticated;`);
  assert.equal((await rpc('register_for_event', ['one-seat', 'Visitor One', null, 'one'])).ok, true);
  await db.exec(`reset role;set test.uid='${other}';set role authenticated;`);
  assert.equal((await rpc('register_for_event', ['one-seat', 'Visitor Two', null, 'one'])).reason, 'event_full');
  assert.equal((await rpc('lookup_station_attendees', [gate, 'Visitor'])).reason, 'forbidden');
  assert.equal((await rpc('manual_station_check_in', [gate, manualAttendee, 'Camera unavailable'])).reason, 'forbidden');
  assert.equal((await rpc('manual_station_check_in', [vipGate, attendeeB, 'Camera unavailable'])).reason, 'station_not_found');
  await db.exec(`reset role;set test.uid='${owner}';set role authenticated;`);
  assert.equal((await db.query('select count(*)::int as n from public.attendees where event_id=$1', [registrationEvent])).rows[0].n, 1);
  await db.exec(`reset role;set test.uid='${other}';set role authenticated;`);
  assert.equal((await rpc('claim_qr', ['event-a', 'QR-1'])).reason, 'not_registered');
  assert.equal((await rpc('validate_scan', [gate, 'QR-2'])).reason, 'forbidden');
  await assert.rejects(() => db.query(
    'insert into public.access_rules(event_id,zone_id,ticket_type_id,allowed) values($1,$2,$3,true)',
    [eventB, zone, ticketA]), /access_rule_event_mismatch/);
  await assert.rejects(() => db.query(
    "insert into public.scanner_stations(event_id,zone_id,name,slug,mode) values($1,$2,'Forged','forged','zone_access')",
    [eventB, zone]), /station_zone_mismatch/);
  await assert.rejects(() => db.query(
    'update public.attendees set ticket_type_id=$1 where id=$2',
    [ticketA, attendeeB]), /ticket_event_mismatch/);
  for (let attempt = 0; attempt < 9; attempt++)
    assert.equal((await rpc('claim_qr', ['event-a', 'QR-1'])).reason, 'not_registered');
  assert.equal((await rpc('replace_qr', ['event-a', 'QR-2'])).reason, 'rate_limited');
  await assert.rejects(() => db.query('select * from public.qr_claim_rate_limits'), /permission denied/);
  assert.equal((await db.query('select count(*)::int as n from public.qr_credential_events')).rows[0].n, 0);
  await db.exec('reset role;set role anon;');
  await assert.rejects(() => rpc('lookup_station_attendees', [gate, 'Visitor']), /permission denied/);
  await assert.rejects(() => rpc('manual_station_check_in', [gate, attendee, 'Camera unavailable']), /permission denied/);
  console.log('PASS: registration, credential, scanner, manual fallback, event isolation, rate limits and audit');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.close();
}
