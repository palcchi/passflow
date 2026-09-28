import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
const manager = '11111111-1111-4111-8111-111111111111';
const stranger = '22222222-2222-4222-8222-222222222222';
const event = '33333333-3333-4333-8333-333333333333';
try {
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create type public.event_status as enum('draft','published','archived');
    create table public.events(
      id uuid primary key,manager uuid,organization_id uuid,created_by uuid,name text not null,slug text not null unique,
      description text,venue text,starts_at timestamptz,ends_at timestamptz,capacity integer,
      theme jsonb not null default '{}',qr_config jsonb not null default '{}',
      hero_image_url text,logo_url text,poster_url text,
      status public.event_status not null default 'draft',updated_at timestamptz default now()
    );
    create function public.is_event_manager(p_event_id uuid) returns boolean language sql stable as
      $$select exists(select 1 from public.events where id=p_event_id and manager=auth.uid())$$;
    create table public.ticket_types(id uuid primary key,event_id uuid);
    create table public.attendees(id uuid primary key,event_id uuid);
    create table public.qr_credentials(id uuid primary key,event_id uuid);
    create table public.scan_logs(id uuid primary key,event_id uuid);
    create table public.activity_logs(id uuid primary key,event_id uuid);
    create table public.benefit_claims(id uuid primary key,event_id uuid);
    insert into auth.users values ('${manager}'),('${stranger}');
    insert into public.events(id,manager,name,slug,venue,starts_at,ends_at,status)
      values ('${event}','${manager}','Original','original','Hall','2026-11-01','2026-11-02','draft');
    grant usage on schema auth to authenticated,anon;
    grant select,update,delete on public.events to authenticated;
  `);
  await db.exec(fs.readFileSync('supabase/migrations/20260928160000_event_lifecycle.sql','utf8'));
  await db.exec(`set test.uid='${manager}'; set role authenticated;`);
  await assert.rejects(() => db.query('select transition_event($1,$2)',[event,'publish']),/ticket_required_to_publish/);
  await db.exec(`reset role; insert into public.ticket_types values(gen_random_uuid(),'${event}'); set role authenticated;`);
  await db.query('select transition_event($1,$2)',[event,'publish']);
  assert.equal((await db.query('select published_version from public.events')).rows[0].published_version,1);
  await assert.rejects(() => db.query(`update public.events set name='Bypass' where id=$1`,[event]),/stage_changes_before_publish/);
  await assert.rejects(() => db.query(`update public.events set status='archived' where id=$1`,[event]),/use_event_lifecycle/);
  await assert.rejects(() => db.query(`update public.events set published_version=99 where id=$1`,[event]),/published_metadata_immutable/);
  await db.query('select stage_event_config($1,$2)',[event,{name:'New draft',theme:{primary:'#123456'}}]);
  assert.equal((await db.query('select name from public.events')).rows[0].name,'Original');
  assert.deepEqual((await db.query('select theme from public.events')).rows[0].theme,{});
  assert.equal((await db.query('select config->>\'name\' as name from public.event_config_drafts')).rows[0].name,'New draft');
  await db.query('select transition_event($1,$2)',[event,'publish']);
  assert.equal((await db.query('select name,published_version from public.events')).rows[0].name,'New draft');
  assert.equal((await db.query("select theme->>'primary' as color from public.events")).rows[0].color,'#123456');
  assert.equal((await db.query('select published_version from public.events')).rows[0].published_version,2);
  await db.query('select transition_event($1,$2,$3)',[event,'restore',1]);
  assert.equal((await db.query('select name from public.events')).rows[0].name,'New draft');
  assert.equal((await db.query("select config->>'name' as name from public.event_config_drafts")).rows[0].name,'Original');
  await db.query('select transition_event($1,$2)',[event,'publish']);
  assert.equal((await db.query('select name,published_version from public.events')).rows[0].name,'Original');
  assert.equal((await db.query('select published_version from public.events')).rows[0].published_version,3);
  await assert.rejects(() => db.query('delete from public.events where id=$1',[event]),/event_has_operational_history/);
  await db.query('select transition_event($1,$2)',[event,'archive']);
  await assert.rejects(() => db.query('select stage_event_config($1,$2)',[event,{name:'No'}]),/archived_event_read_only/);
  await db.query('select transition_event($1,$2)',[event,'reopen']);
  assert.equal((await db.query('select status from public.events')).rows[0].status,'draft');
  await db.exec(`set test.uid='${stranger}'`);
  await assert.rejects(() => db.query('select stage_event_config($1,$2)',[event,{name:'Intruder'}]),/not_authorized/);
  await assert.rejects(() => db.query('select transition_event($1,$2)',[event,'publish']),/not_authorized/);
  await db.exec('reset role; set role anon;');
  await assert.rejects(() => db.query('select transition_event($1,$2)',[event,'publish']),/permission denied/);
  await assert.rejects(() => db.query('select * from public.event_config_drafts'),/permission denied/);
  console.log('PASS: event draft isolation, publish versions, restore, archive, delete guard and authorization');
} finally {
  await db.close();
}
