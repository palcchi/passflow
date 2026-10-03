-- Attendees show their PassFlow account profile (name + avatar) instead of per-event details.
-- The account lives in auth.users metadata, which organizers cannot read, so it is mirrored
-- onto attendee rows by triggers. Avatar URLs are user-editable metadata: readers must
-- allowlist hosts before use (lib/attendee-photos.ts).
alter table public.attendee_profiles
  add column if not exists avatar_url text
  check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 1000));

create or replace function public.account_avatar_url(p_meta jsonb) returns text
language sql immutable as $$
  select case when v ~ '^https://' and char_length(v) <= 1000 then v end
  from (select coalesce(nullif(p_meta->>'avatar_url', ''), nullif(p_meta->>'picture', '')) as v) s
$$;

create or replace function public.account_full_name(p_meta jsonb) returns text
language sql immutable as $$
  select case when char_length(v) between 2 and 100 then v end
  from (select btrim(regexp_replace(coalesce(p_meta->>'full_name', ''), '\s+', ' ', 'g')) as v) s
$$;

-- New registration: attach the account avatar.
create or replace function public.attach_account_profile() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare v_avatar text;
begin
  if new.user_id is null then return new; end if;
  select public.account_avatar_url(raw_user_meta_data) into v_avatar from auth.users where id = new.user_id;
  insert into public.attendee_profiles(attendee_id, event_id, user_id, avatar_url)
  values (new.id, new.event_id, new.user_id, v_avatar)
  on conflict (attendee_id) do update set avatar_url = excluded.avatar_url, updated_at = now();
  return new;
end $$;
drop trigger if exists attendees_attach_account_profile on public.attendees;
create trigger attendees_attach_account_profile after insert on public.attendees
  for each row execute function public.attach_account_profile();

-- Account edited: keep every registration in sync.
create or replace function public.sync_account_profile() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  v_avatar text := public.account_avatar_url(new.raw_user_meta_data);
  v_name text := public.account_full_name(new.raw_user_meta_data);
begin
  update public.attendee_profiles set avatar_url = v_avatar, updated_at = now()
    where user_id = new.id and avatar_url is distinct from v_avatar;
  if v_name is not null then
    update public.attendees set name = v_name where user_id = new.id and name is distinct from v_name;
  end if;
  return new;
end $$;
drop trigger if exists users_sync_account_profile on auth.users;
create trigger users_sync_account_profile after update of raw_user_meta_data on auth.users
  for each row execute function public.sync_account_profile();

revoke all on function public.attach_account_profile() from public, anon, authenticated;
revoke all on function public.sync_account_profile() from public, anon, authenticated;

-- Backfill existing registrations.
insert into public.attendee_profiles(attendee_id, event_id, user_id, avatar_url)
select a.id, a.event_id, a.user_id, public.account_avatar_url(u.raw_user_meta_data)
from public.attendees a join auth.users u on u.id = a.user_id
on conflict (attendee_id) do update set avatar_url = excluded.avatar_url
  where public.attendee_profiles.avatar_url is null;
