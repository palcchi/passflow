import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
const user = '11111111-1111-4111-8111-111111111111';
const legacyUser = '22222222-2222-4222-8222-222222222222';
const event = '33333333-3333-4333-8333-333333333333';
try {
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}');
    create table public.events(id uuid primary key);
    create table public.attendees(id uuid primary key default gen_random_uuid(), event_id uuid, user_id uuid, name text not null);
    create table public.attendee_profiles(attendee_id uuid primary key references public.attendees(id), event_id uuid not null, user_id uuid not null, photo_storage_path text, updated_at timestamptz not null default now());
    insert into public.events values ('${event}');
    insert into auth.users values ('${user}', '{"full_name":"Ayu Lestari","avatar_url":"https://x.supabase.co/a.png"}'),
                                  ('${legacyUser}', '{"picture":"https://lh3.googleusercontent.com/p"}');
    insert into public.attendees(event_id,user_id,name) values ('${event}','${legacyUser}','Legacy');
  `);
  await db.exec(fs.readFileSync('supabase/migrations/20261003150000_attendee_account_profile.sql', 'utf8'));
  const avatar = async (u) => (await db.query('select avatar_url from public.attendee_profiles where user_id=$1', [u])).rows[0]?.avatar_url;

  assert.equal(await avatar(legacyUser), 'https://lh3.googleusercontent.com/p', 'backfill uses Google picture');
  await db.query(`insert into public.attendees(event_id,user_id,name) values($1,$2,'Ayu Lestari')`, [event, user]);
  assert.equal(await avatar(user), 'https://x.supabase.co/a.png', 'registration attaches account avatar');

  await db.query(`update auth.users set raw_user_meta_data='{"full_name":"Ayu  Lestari Putri","avatar_url":"https://x.supabase.co/b.png"}' where id=$1`, [user]);
  assert.equal(await avatar(user), 'https://x.supabase.co/b.png', 'avatar change syncs');
  assert.equal((await db.query('select name from public.attendees where user_id=$1', [user])).rows[0].name, 'Ayu Lestari Putri', 'name change syncs');

  await db.query(`update auth.users set raw_user_meta_data='{"avatar_url":"javascript:alert(1)"}' where id=$1`, [user]);
  assert.equal(await avatar(user), null, 'non-https avatar rejected');
  assert.equal((await db.query('select name from public.attendees where user_id=$1', [user])).rows[0].name, 'Ayu Lestari Putri', 'missing full_name keeps name');
  console.log('attendee account profile checks passed');
} finally {
  await db.close();
}
