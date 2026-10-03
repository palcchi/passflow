import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
const applicant = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
try {
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create type public.member_role as enum('owner','admin','staff');
    create table public.organizations(id uuid primary key default gen_random_uuid(),name text not null,slug text not null unique);
    create table public.organization_members(organization_id uuid references public.organizations(id),user_id uuid,role public.member_role,primary key(organization_id,user_id));
    insert into auth.users values ('${applicant}'),('${other}');
    grant usage on schema auth to authenticated,anon;
  `);
  await db.exec(fs.readFileSync('supabase/migrations/20261003120000_organizer_applications.sql', 'utf8'));
  await db.exec(`set test.uid='${applicant}'; set role authenticated;`);
  await assert.rejects(() => db.query(`insert into public.organizer_applications(user_id,organization_name) values($1,'Spoof')`, [other]), /row-level security/);
  await assert.rejects(() => db.query(`insert into public.organizer_applications(user_id,organization_name,status) values($1,'Self approve','approved')`, [applicant]), /permission denied/);
  await db.query(`insert into public.organizer_applications(user_id,organization_name,city) values($1,'Kopi Kultur Collective','Bandung')`, [applicant]);
  await assert.rejects(() => db.query(`update public.organizer_applications set status='approved'`), /permission denied/);
  await assert.rejects(() => db.query('select public.review_organizer_application($1,true)', [applicant]), /permission denied/);
  await db.exec('reset role;');
  const org = (await db.query('select public.review_organizer_application($1,true) as id', [applicant])).rows[0].id;
  assert.ok(org);
  assert.equal((await db.query('select role from public.organization_members where user_id=$1', [applicant])).rows[0].role, 'owner');
  assert.match((await db.query('select slug from public.organizations where id=$1', [org])).rows[0].slug, /^kopi-kultur-collective-[0-9a-f]{6}$/);
  await assert.rejects(() => db.query('select public.review_organizer_application($1,true)', [applicant]), /application_already_reviewed/);
  console.log('organizer application checks passed');
} finally {
  await db.close();
}
