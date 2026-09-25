alter table public.events
  add column if not exists capacity integer check (capacity is null or capacity >= 0);

alter table public.qr_credentials
  add column if not exists display_code text;

create unique index if not exists qr_credentials_event_display_code_idx
  on public.qr_credentials(event_id, display_code)
  where display_code is not null;

create unique index if not exists attendees_event_user_idx
  on public.attendees(event_id, user_id)
  where user_id is not null;

create index if not exists organization_members_user_id_idx on public.organization_members(user_id);
create index if not exists attendees_user_id_idx on public.attendees(user_id);
create index if not exists attendees_ticket_type_id_idx on public.attendees(ticket_type_id);
create index if not exists access_rules_event_id_idx on public.access_rules(event_id);
create index if not exists access_rules_ticket_type_id_idx on public.access_rules(ticket_type_id);
create index if not exists scanner_stations_zone_id_idx on public.scanner_stations(zone_id);
create index if not exists scan_logs_station_id_idx on public.scan_logs(scanner_station_id);
create index if not exists scan_logs_qr_id_idx on public.scan_logs(qr_credential_id);
create index if not exists scan_logs_attendee_id_idx on public.scan_logs(attendee_id);
create index if not exists activity_logs_event_id_idx on public.activity_logs(event_id);
create index if not exists activity_logs_attendee_id_idx on public.activity_logs(attendee_id);
create index if not exists activity_logs_station_id_idx on public.activity_logs(scanner_station_id);
create index if not exists benefit_claims_attendee_id_idx on public.benefit_claims(attendee_id);
create index if not exists benefit_claims_station_id_idx on public.benefit_claims(scanner_station_id);
create index if not exists event_assets_event_id_idx on public.event_assets(event_id);
create index if not exists qr_credentials_replaced_by_idx on public.qr_credentials(replaced_by);

create table if not exists public.benefits (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);

alter table public.benefits enable row level security;
create index if not exists benefits_event_id_idx on public.benefits(event_id);

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_manager(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_event_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.events e
    join public.organization_members m on m.organization_id = e.organization_id
    where e.id = p_event_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_event_manager(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.events e
    join public.organization_members m on m.organization_id = e.organization_id
    where e.id = p_event_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_org_manager(uuid) from public;
revoke all on function public.is_event_member(uuid) from public;
revoke all on function public.is_event_manager(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_manager(uuid) to authenticated;
grant execute on function public.is_event_member(uuid) to authenticated;
grant execute on function public.is_event_manager(uuid) to authenticated;

grant select on public.events, public.ticket_types to anon;
grant select, insert, update, delete on
  public.organizations,
  public.events,
  public.ticket_types,
  public.attendees,
  public.qr_credentials,
  public.access_zones,
  public.access_rules,
  public.scanner_stations,
  public.scan_logs,
  public.activities,
  public.activity_logs,
  public.benefits,
  public.benefit_claims,
  public.event_assets
to authenticated;
grant select on public.organization_members to authenticated;
revoke insert, update, delete on public.organization_members from anon, authenticated;

drop policy if exists "managers create events" on public.events;
create policy "managers create events" on public.events
for insert to authenticated
with check (public.is_org_manager(organization_id));

drop policy if exists "managers update events" on public.events;
create policy "managers update events" on public.events
for update to authenticated
using (public.is_org_manager(organization_id))
with check (public.is_org_manager(organization_id));

drop policy if exists "managers delete events" on public.events;
create policy "managers delete events" on public.events
for delete to authenticated
using (public.is_org_manager(organization_id));

drop policy if exists "managers manage ticket types" on public.ticket_types;
create policy "managers manage ticket types" on public.ticket_types
for all to authenticated
using (public.is_event_manager(event_id))
with check (public.is_event_manager(event_id));

drop policy if exists "members read event attendees" on public.attendees;
create policy "members read event attendees" on public.attendees
for select to authenticated
using (public.is_event_member(event_id));

drop policy if exists "managers manage attendees" on public.attendees;
create policy "managers manage attendees" on public.attendees
for all to authenticated
using (public.is_event_manager(event_id))
with check (public.is_event_manager(event_id));

drop policy if exists "members read event credentials" on public.qr_credentials;
create policy "members read event credentials" on public.qr_credentials
for select to authenticated
using (public.is_event_member(event_id));

drop policy if exists "managers manage credentials" on public.qr_credentials;
create policy "managers manage credentials" on public.qr_credentials
for all to authenticated
using (public.is_event_manager(event_id))
with check (public.is_event_manager(event_id));

drop policy if exists "members read zones" on public.access_zones;
create policy "members read zones" on public.access_zones
for select to authenticated
using (public.is_event_member(event_id));

drop policy if exists "managers manage zones" on public.access_zones;
create policy "managers manage zones" on public.access_zones
for all to authenticated
using (public.is_event_manager(event_id))
with check (public.is_event_manager(event_id));

drop policy if exists "members read access rules" on public.access_rules;
create policy "members read access rules" on public.access_rules
for select to authenticated
using (public.is_event_member(event_id));

drop policy if exists "managers manage access rules" on public.access_rules;
create policy "managers manage access rules" on public.access_rules
for all to authenticated
using (public.is_event_manager(event_id))
with check (public.is_event_manager(event_id));

drop policy if exists "managers manage stations" on public.scanner_stations;
create policy "managers manage stations" on public.scanner_stations
for all to authenticated
using (public.is_event_manager(event_id))
with check (public.is_event_manager(event_id));

drop policy if exists "members read scan logs" on public.scan_logs;
create policy "members read scan logs" on public.scan_logs
for select to authenticated
using (public.is_event_member(event_id));

drop policy if exists "members read activities" on public.activities;
create policy "members read activities" on public.activities
for select to authenticated
using (
  public.is_event_member(event_id)
  or exists (
    select 1 from public.attendees a
    where a.event_id = activities.event_id and a.user_id = auth.uid()
  )
);

drop policy if exists "managers manage activities" on public.activities;
create policy "managers manage activities" on public.activities
for all to authenticated
using (public.is_event_manager(event_id))
with check (public.is_event_manager(event_id));

drop policy if exists "members read activity logs" on public.activity_logs;
create policy "members read activity logs" on public.activity_logs
for select to authenticated
using (
  public.is_event_member(event_id)
  or exists (
    select 1 from public.attendees a
    where a.id = activity_logs.attendee_id and a.user_id = auth.uid()
  )
);

drop policy if exists "members read benefits" on public.benefits;
create policy "members read benefits" on public.benefits
for select to authenticated
using (
  public.is_event_member(event_id)
  or exists (
    select 1 from public.attendees a
    where a.event_id = benefits.event_id and a.user_id = auth.uid()
  )
);

drop policy if exists "managers manage benefits" on public.benefits;
create policy "managers manage benefits" on public.benefits
for all to authenticated
using (public.is_event_manager(event_id))
with check (public.is_event_manager(event_id));

drop policy if exists "members read benefit claims" on public.benefit_claims;
create policy "members read benefit claims" on public.benefit_claims
for select to authenticated
using (
  public.is_event_member(event_id)
  or exists (
    select 1 from public.attendees a
    where a.id = benefit_claims.attendee_id and a.user_id = auth.uid()
  )
);

drop policy if exists "members read event assets" on public.event_assets;
create policy "members read event assets" on public.event_assets
for select to authenticated
using (public.is_event_member(event_id));

drop policy if exists "managers manage event assets" on public.event_assets;
create policy "managers manage event assets" on public.event_assets
for all to authenticated
using (public.is_event_manager(event_id))
with check (public.is_event_manager(event_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-assets',
  'event-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads event assets" on storage.objects;
create policy "public reads event assets" on storage.objects
for select to public
using (bucket_id = 'event-assets');

drop policy if exists "event managers upload assets" on storage.objects;
create policy "event managers upload assets" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'event-assets'
  and public.is_event_manager(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "event managers update assets" on storage.objects;
create policy "event managers update assets" on storage.objects
for update to authenticated
using (
  bucket_id = 'event-assets'
  and public.is_event_manager(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'event-assets'
  and public.is_event_manager(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "event managers delete assets" on storage.objects;
create policy "event managers delete assets" on storage.objects
for delete to authenticated
using (
  bucket_id = 'event-assets'
  and public.is_event_manager(((storage.foldername(name))[1])::uuid)
);

create or replace function public.register_for_event(
  p_event_slug text,
  p_name text,
  p_phone text default null,
  p_ticket_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_event public.events%rowtype;
  v_ticket public.ticket_types%rowtype;
  v_attendee public.attendees%rowtype;
  v_count integer;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  if length(trim(coalesce(p_name, ''))) < 2 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_name');
  end if;

  select email into v_email from auth.users where id = v_user_id;

  select * into v_event
  from public.events
  where slug = p_event_slug and status = 'published';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'event_not_found');
  end if;

  select * into v_attendee
  from public.attendees
  where event_id = v_event.id and user_id = v_user_id
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'existing', true,
      'attendee_id', v_attendee.id,
      'attendee_code', v_attendee.attendee_code
    );
  end if;

  if v_email is not null then
    update public.attendees
    set user_id = v_user_id,
        name = coalesce(nullif(trim(p_name), ''), name),
        phone = coalesce(nullif(trim(coalesce(p_phone, '')), ''), phone)
    where id = (
      select id
      from public.attendees
      where event_id = v_event.id
        and user_id is null
        and email is not null
        and lower(email) = lower(v_email)
      order by created_at
      limit 1
      for update skip locked
    )
    returning * into v_attendee;

    if found then
      return jsonb_build_object(
        'ok', true,
        'linked', true,
        'attendee_id', v_attendee.id,
        'attendee_code', v_attendee.attendee_code
      );
    end if;
  end if;

  if v_event.capacity is not null then
    select count(*) into v_count
    from public.attendees
    where event_id = v_event.id;

    if v_count >= v_event.capacity then
      return jsonb_build_object('ok', false, 'reason', 'event_full');
    end if;
  end if;

  if p_ticket_code is not null and trim(p_ticket_code) <> '' then
    select * into v_ticket
    from public.ticket_types
    where event_id = v_event.id and lower(code) = lower(trim(p_ticket_code));
  else
    select * into v_ticket
    from public.ticket_types
    where event_id = v_event.id
    order by created_at
    limit 1;
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'ticket_not_found');
  end if;

  if v_ticket.capacity is not null then
    select count(*) into v_count
    from public.attendees
    where event_id = v_event.id and ticket_type_id = v_ticket.id;

    if v_count >= v_ticket.capacity then
      return jsonb_build_object('ok', false, 'reason', 'ticket_full');
    end if;
  end if;

  insert into public.attendees (
    event_id, user_id, ticket_type_id, attendee_code, name, email, phone
  )
  values (
    v_event.id,
    v_user_id,
    v_ticket.id,
    'ATT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    trim(p_name),
    v_email,
    nullif(trim(coalesce(p_phone, '')), '')
  )
  returning * into v_attendee;

  return jsonb_build_object(
    'ok', true,
    'attendee_id', v_attendee.id,
    'attendee_code', v_attendee.attendee_code
  );
exception
  when unique_violation then
    select * into v_attendee
    from public.attendees
    where event_id = v_event.id and user_id = v_user_id
    limit 1;

    return jsonb_build_object(
      'ok', true,
      'existing', true,
      'attendee_id', v_attendee.id,
      'attendee_code', v_attendee.attendee_code
    );
end;
$$;

create or replace function public.claim_qr(
  p_event_slug text,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.events%rowtype;
  v_attendee public.attendees%rowtype;
  v_qr public.qr_credentials%rowtype;
  v_active public.qr_credentials%rowtype;
  v_clean_code text := regexp_replace(trim(coalesce(p_code, '')), '^PF1:', '');
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select * into v_event
  from public.events
  where slug = p_event_slug and status = 'published';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'event_not_found');
  end if;

  select * into v_attendee
  from public.attendees
  where event_id = v_event.id and user_id = v_user_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_registered');
  end if;

  select * into v_active
  from public.qr_credentials
  where event_id = v_event.id
    and attendee_id = v_attendee.id
    and status = 'active'
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'existing', true,
      'credential_id', v_active.id,
      'code', v_active.code,
      'display_code', v_active.display_code
    );
  end if;

  select * into v_qr
  from public.qr_credentials
  where event_id = v_event.id and code = v_clean_code
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  if v_qr.status <> 'unclaimed' then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed');
  end if;

  update public.qr_credentials
  set attendee_id = v_attendee.id,
      status = 'active',
      claimed_at = now(),
      revoked_at = null
  where id = v_qr.id
  returning * into v_qr;

  return jsonb_build_object(
    'ok', true,
    'credential_id', v_qr.id,
    'code', v_qr.code,
    'display_code', v_qr.display_code
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_active');
end;
$$;

create or replace function public.replace_qr(
  p_event_slug text,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.events%rowtype;
  v_attendee public.attendees%rowtype;
  v_old public.qr_credentials%rowtype;
  v_new public.qr_credentials%rowtype;
  v_clean_code text := regexp_replace(trim(coalesce(p_code, '')), '^PF1:', '');
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select * into v_event
  from public.events
  where slug = p_event_slug and status = 'published';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'event_not_found');
  end if;

  select * into v_attendee
  from public.attendees
  where event_id = v_event.id and user_id = v_user_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_registered');
  end if;

  select * into v_new
  from public.qr_credentials
  where event_id = v_event.id and code = v_clean_code
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  if v_new.status <> 'unclaimed' then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed');
  end if;

  select * into v_old
  from public.qr_credentials
  where event_id = v_event.id
    and attendee_id = v_attendee.id
    and status = 'active'
  limit 1
  for update;

  if found then
    update public.qr_credentials
    set status = 'replaced',
        revoked_at = now(),
        replaced_by = v_new.id
    where id = v_old.id;
  end if;

  update public.qr_credentials
  set attendee_id = v_attendee.id,
      status = 'active',
      claimed_at = now(),
      revoked_at = null
  where id = v_new.id
  returning * into v_new;

  return jsonb_build_object(
    'ok', true,
    'credential_id', v_new.id,
    'code', v_new.code,
    'display_code', v_new.display_code
  );
end;
$$;

create or replace function public.validate_scan(
  p_station_id uuid,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_station public.scanner_stations%rowtype;
  v_event public.events%rowtype;
  v_qr public.qr_credentials%rowtype;
  v_attendee public.attendees%rowtype;
  v_ticket public.ticket_types%rowtype;
  v_decision public.scan_decision;
  v_message text;
  v_allowed boolean := false;
  v_activity public.activities%rowtype;
  v_benefit public.benefits%rowtype;
  v_inserted uuid;
  v_clean_code text := regexp_replace(trim(coalesce(p_code, '')), '^PF1:', '');
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select * into v_station
  from public.scanner_stations
  where id = p_station_id and is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'station_not_found');
  end if;

  select * into v_event from public.events where id = v_station.event_id;

  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = v_event.organization_id
      and m.user_id = v_user_id
      and m.role in ('owner', 'admin', 'staff')
  ) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select * into v_qr
  from public.qr_credentials
  where event_id = v_event.id and code = v_clean_code
  limit 1;

  if not found or v_qr.status <> 'active' or v_qr.attendee_id is null then
    v_decision := 'invalid';
    v_message := case when found and v_qr.status in ('revoked','replaced') then 'Pass revoked' else 'Invalid pass' end;

    insert into public.scan_logs(event_id, scanner_station_id, qr_credential_id, attendee_id, decision, metadata)
    values (
      v_event.id,
      v_station.id,
      case when found then v_qr.id else null end,
      case when found then v_qr.attendee_id else null end,
      v_decision,
      jsonb_build_object('message', v_message)
    );

    return jsonb_build_object('ok', true, 'decision', v_decision, 'message', v_message);
  end if;

  select * into v_attendee from public.attendees where id = v_qr.attendee_id;
  select * into v_ticket from public.ticket_types where id = v_attendee.ticket_type_id;

  if v_station.mode = 'check_in' then
    if v_attendee.checked_in_at is not null then
      v_decision := 'already_checked_in';
      v_message := 'Already checked in';
    else
      update public.attendees set checked_in_at = now() where id = v_attendee.id;
      v_decision := 'granted';
      v_message := 'Check-in successful';
    end if;

  elsif v_station.mode = 'zone_access' then
    if v_station.zone_id is not null and v_attendee.ticket_type_id is not null then
      select coalesce(ar.allowed, false) into v_allowed
      from public.access_rules ar
      where ar.zone_id = v_station.zone_id
        and ar.ticket_type_id = v_attendee.ticket_type_id
      limit 1;
    end if;

    if coalesce(v_allowed, false) then
      v_decision := 'granted';
      v_message := 'Access granted';
    else
      v_decision := 'denied';
      v_message := 'Access denied';
    end if;

  elsif v_station.mode = 'activity' then
    select * into v_activity
    from public.activities
    where event_id = v_event.id
      and code = coalesce(v_station.config->>'activity_code', '')
    limit 1;

    if not found then
      v_decision := 'denied';
      v_message := 'Activity station is not configured';
    else
      insert into public.activity_logs(event_id, activity_id, attendee_id, scanner_station_id)
      values (v_event.id, v_activity.id, v_attendee.id, v_station.id)
      on conflict (activity_id, attendee_id) do nothing
      returning id into v_inserted;

      if v_inserted is null then
        v_decision := 'already_claimed';
        v_message := 'Activity already completed';
      else
        v_decision := 'granted';
        v_message := 'Activity recorded';
      end if;
    end if;

  elsif v_station.mode = 'claim' then
    select * into v_benefit
    from public.benefits
    where event_id = v_event.id
      and code = coalesce(v_station.config->>'benefit_code', '')
      and is_active = true
    limit 1;

    if not found then
      v_decision := 'denied';
      v_message := 'Claim station is not configured';
    else
      insert into public.benefit_claims(event_id, attendee_id, benefit_code, scanner_station_id)
      values (v_event.id, v_attendee.id, v_benefit.code, v_station.id)
      on conflict (event_id, attendee_id, benefit_code) do nothing
      returning id into v_inserted;

      if v_inserted is null then
        v_decision := 'already_claimed';
        v_message := 'Benefit already claimed';
      else
        v_decision := 'granted';
        v_message := 'Benefit claimed';
      end if;
    end if;

  else
    v_decision := 'denied';
    v_message := 'Unsupported station mode';
  end if;

  insert into public.scan_logs(event_id, scanner_station_id, qr_credential_id, attendee_id, decision, metadata)
  values (
    v_event.id,
    v_station.id,
    v_qr.id,
    v_attendee.id,
    v_decision,
    jsonb_build_object(
      'message', v_message,
      'station_mode', v_station.mode,
      'ticket_type', v_ticket.name
    )
  );

  return jsonb_build_object(
    'ok', true,
    'decision', v_decision,
    'message', v_message,
    'attendee_name', v_attendee.name,
    'attendee_code', v_attendee.attendee_code,
    'ticket_type', v_ticket.name,
    'display_code', v_qr.display_code
  );
end;
$$;

revoke all on function public.register_for_event(text,text,text,text) from public;
revoke all on function public.claim_qr(text,text) from public;
revoke all on function public.replace_qr(text,text) from public;
revoke all on function public.validate_scan(uuid,text) from public;

grant execute on function public.register_for_event(text,text,text,text) to authenticated;
grant execute on function public.claim_qr(text,text) to authenticated;
grant execute on function public.replace_qr(text,text) to authenticated;
grant execute on function public.validate_scan(uuid,text) to authenticated;
