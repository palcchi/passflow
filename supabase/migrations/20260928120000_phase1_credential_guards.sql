-- Phase 1: credential integrity and durable audit history.
create table if not exists public.qr_credential_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  credential_id uuid not null,
  attendee_id uuid,
  action text not null check (action in ('issued','claimed','revoked','replaced')),
  actor_id uuid,
  replaced_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists qr_credential_events_event_created_idx
  on public.qr_credential_events(event_id, created_at desc);
alter table public.qr_credential_events enable row level security;
revoke all on public.qr_credential_events from public, anon, authenticated;
grant select on public.qr_credential_events to authenticated;
-- Direct organizers may revoke an issued credential, never rewrite its owner or token.
revoke update, delete on public.qr_credentials from authenticated;
grant update(status, revoked_at) on public.qr_credentials to authenticated;
create policy "managers read credential history" on public.qr_credential_events
  for select to authenticated using (public.is_event_manager(event_id));
-- Gate staff validate server-side and do not need raw QR tokens through the Data API.
drop policy if exists "members read event credentials" on public.qr_credentials;
create policy "managers read event credentials" on public.qr_credentials
  for select to authenticated using (public.is_event_manager(event_id));

-- Existing single-column foreign keys do not enforce a shared event_id.
create function public.guard_event_relation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.event_id is distinct from old.event_id then
    raise exception 'event_identity_immutable';
  end if;
  if tg_table_name = 'attendees' then
    if new.ticket_type_id is not null and not exists(
      select 1 from public.ticket_types t
      where t.id = new.ticket_type_id and t.event_id = new.event_id
    ) then raise exception 'ticket_event_mismatch'; end if;
  elsif tg_table_name = 'scanner_stations' then
    if new.zone_id is not null and not exists(
      select 1 from public.access_zones z
      where z.id = new.zone_id and z.event_id = new.event_id
    ) then raise exception 'station_zone_mismatch'; end if;
  elsif tg_table_name = 'access_rules' then
    if not exists(select 1 from public.access_zones z
        where z.id = new.zone_id and z.event_id = new.event_id)
      or not exists(select 1 from public.ticket_types t
        where t.id = new.ticket_type_id and t.event_id = new.event_id)
    then raise exception 'access_rule_event_mismatch'; end if;
  end if;
  return new;
end;
$$;

-- Lookup exposes only event-scoped identity fields to an authorized gate
-- operator. It never returns a credential token.
create function public.lookup_station_attendees(p_station_id uuid, p_query text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_station public.scanner_stations%rowtype;
  v_organization_id uuid;
  v_query text := left(trim(coalesce(p_query,'')),80);
  v_results jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('ok',false,'reason','unauthenticated');
  end if;
  select s.* into v_station from public.scanner_stations s
  where s.id=p_station_id and s.is_active and s.mode='check_in';
  if not found then return jsonb_build_object('ok',false,'reason','station_not_found'); end if;
  select e.organization_id into v_organization_id from public.events e
  where e.id=v_station.event_id and e.status='published';
  if not found then return jsonb_build_object('ok',false,'reason','event_not_live'); end if;
  if not exists(select 1 from public.organization_members m
    where m.organization_id=v_organization_id and m.user_id=v_user_id
      and m.role in ('owner','admin','staff')) then
    return jsonb_build_object('ok',false,'reason','forbidden');
  end if;
  if length(v_query)<2 then return jsonb_build_object('ok',false,'reason','query_too_short'); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',matches.id,'name',matches.name,'attendee_code',matches.attendee_code,
    'ticket_type',matches.ticket_type,'checked_in',matches.checked_in)), '[]'::jsonb)
  into v_results from (
    select a.id,a.name,a.attendee_code,t.name as ticket_type,
      a.checked_in_at is not null as checked_in
    from public.attendees a
    left join public.ticket_types t on t.id=a.ticket_type_id and t.event_id=a.event_id
    where a.event_id=v_station.event_id
      and (position(lower(v_query) in lower(a.name))>0
        or position(lower(v_query) in lower(a.attendee_code))>0)
    order by (lower(a.attendee_code)=lower(v_query)) desc,a.created_at,a.id
    limit 5
  ) matches;
  return jsonb_build_object('ok',true,'attendees',v_results);
end;
$$;
revoke all on function public.lookup_station_attendees(uuid,text) from public,anon;
grant execute on function public.lookup_station_attendees(uuid,text) to authenticated;

-- Manual fallback is limited to check-in gates, requires a recorded reason,
-- and cannot override an explicitly revoked credential.
create function public.manual_station_check_in(
  p_station_id uuid, p_attendee_id uuid, p_reason text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_station public.scanner_stations%rowtype;
  v_organization_id uuid;
  v_attendee public.attendees%rowtype;
  v_qr public.qr_credentials%rowtype;
  v_ticket public.ticket_types%rowtype;
  v_reason text := trim(coalesce(p_reason,''));
  v_decision public.scan_decision;
  v_message text;
  v_code text;
  v_updated uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('ok',false,'reason','unauthenticated');
  end if;
  select s.* into v_station from public.scanner_stations s
  where s.id=p_station_id and s.is_active and s.mode='check_in' for share;
  if not found then return jsonb_build_object('ok',false,'reason','station_not_found'); end if;
  select e.organization_id into v_organization_id from public.events e
  where e.id=v_station.event_id and e.status='published';
  if not found then return jsonb_build_object('ok',false,'reason','event_not_live'); end if;
  if not exists(select 1 from public.organization_members m
    where m.organization_id=v_organization_id and m.user_id=v_user_id
      and m.role in ('owner','admin','staff')) then
    return jsonb_build_object('ok',false,'reason','forbidden');
  end if;
  if length(v_reason) not between 8 and 200 then
    return jsonb_build_object('ok',false,'reason','reason_required');
  end if;
  if not public.record_scan_attempt(v_user_id,v_station.id) then
    return jsonb_build_object('ok',false,'reason','rate_limited');
  end if;
  select * into v_attendee from public.attendees
  where id=p_attendee_id and event_id=v_station.event_id for update;
  if not found then return jsonb_build_object('ok',false,'reason','attendee_not_found'); end if;
  select * into v_qr from public.qr_credentials
  where event_id=v_station.event_id and attendee_id=v_attendee.id and status='active'
  for update;
  select * into v_ticket from public.ticket_types
  where id=v_attendee.ticket_type_id and event_id=v_station.event_id;
  if v_attendee.ticket_type_id is not null and not found then
    v_decision := 'denied'; v_code := 'ticket_event_mismatch';
    v_message := 'Ticket is not valid for this event';
  elsif v_qr.id is null and exists(select 1 from public.qr_credentials
    where event_id=v_station.event_id and attendee_id=v_attendee.id and status='revoked') then
    v_decision := 'denied'; v_code := 'credential_revoked';
    v_message := 'Credential was revoked. Ask an organizer for help';
  else
    update public.attendees set checked_in_at=now()
    where id=v_attendee.id and event_id=v_station.event_id and checked_in_at is null
    returning id into v_updated;
    if v_updated is null then
      v_decision := 'already_checked_in'; v_code := 'already_checked_in';
      v_message := 'Already checked in';
    else
      v_decision := 'granted'; v_code := 'manual_check_in';
      v_message := 'Manual check-in recorded';
    end if;
  end if;
  insert into public.scan_logs(event_id,scanner_station_id,qr_credential_id,
    attendee_id,decision,metadata)
  values(v_station.event_id,v_station.id,v_qr.id,v_attendee.id,v_decision,
    jsonb_build_object('manual',true,'reason',v_code,'operator_reason',v_reason,
      'actor_id',v_user_id,'message',v_message));
  return jsonb_build_object('ok',true,'decision',v_decision,'message',v_message,
    'attendee_name',v_attendee.name,'attendee_code',v_attendee.attendee_code,
    'ticket_type',v_ticket.name);
end;
$$;
revoke all on function public.manual_station_check_in(uuid,uuid,text) from public,anon;
grant execute on function public.manual_station_check_in(uuid,uuid,text) to authenticated;

-- Scanner quota is keyed by operator and station so multiple gates do not
-- contend on a single global counter. The camera UI already debounces reads.
create table public.scanner_rate_limits (
  user_id uuid not null,
  station_id uuid not null,
  bucket_started_at timestamptz not null,
  attempts integer not null,
  primary key(user_id, station_id, bucket_started_at)
);
alter table public.scanner_rate_limits enable row level security;
revoke all on public.scanner_rate_limits from public, anon, authenticated;
create function public.record_scan_attempt(p_user_id uuid, p_station_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_attempts integer;
begin
  insert into public.scanner_rate_limits(user_id,station_id,bucket_started_at,attempts)
  values(p_user_id,p_station_id,to_timestamp(floor(extract(epoch from now()) / 60) * 60),1)
  on conflict(user_id,station_id,bucket_started_at)
  do update set attempts=public.scanner_rate_limits.attempts+1
  returning attempts into v_attempts;
  return v_attempts <= 600;
end;
$$;
revoke all on function public.record_scan_attempt(uuid,uuid) from public, anon, authenticated;
revoke all on function public.guard_event_relation() from public, anon, authenticated;
create trigger guard_attendee_event before insert or update on public.attendees
  for each row execute function public.guard_event_relation();
create trigger guard_ticket_event before update on public.ticket_types
  for each row execute function public.guard_event_relation();
create trigger guard_station_event before insert or update on public.scanner_stations
  for each row execute function public.guard_event_relation();
create trigger guard_zone_event before update on public.access_zones
  for each row execute function public.guard_event_relation();
create trigger guard_rule_event before insert or update on public.access_rules
  for each row execute function public.guard_event_relation();
create trigger guard_activity_event before update on public.activities
  for each row execute function public.guard_event_relation();
create trigger guard_benefit_event before update on public.benefits
  for each row execute function public.guard_event_relation();

create function public.guard_qr_credential() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.event_id is distinct from old.event_id or new.code is distinct from old.code
       or new.display_code is distinct from old.display_code then
      raise exception 'credential_identity_immutable';
    end if;
    if old.status in ('revoked','replaced') and new.status is distinct from old.status
       or old.status = 'active' and new.status not in ('active','revoked','replaced')
       or old.status = 'unclaimed' and new.status not in ('unclaimed','active','revoked') then
      raise exception 'invalid_credential_transition';
    end if;
    if old.attendee_id is not null and new.attendee_id is distinct from old.attendee_id
       and not (new.attendee_id is null and new.status in ('revoked','replaced')) then
      raise exception 'credential_owner_immutable';
    end if;
  end if;
  if new.attendee_id is not null and not exists (
    select 1 from public.attendees a where a.id = new.attendee_id and a.event_id = new.event_id
  ) then
    raise exception 'credential_event_mismatch';
  end if;
  if new.status = 'active' and (new.attendee_id is null or new.revoked_at is not null) then
    raise exception 'credential_status_mismatch';
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status
     and new.status in ('revoked','replaced') and new.revoked_at is null then
    raise exception 'credential_status_mismatch';
  end if;
  if new.status = 'replaced' and (new.replaced_by is null or not exists (
    select 1 from public.qr_credentials q
    where q.id = new.replaced_by and q.event_id = new.event_id and q.id <> new.id
  )) then
    raise exception 'replacement_event_mismatch';
  end if;
  if new.status <> 'replaced' and new.replaced_by is not null then
    raise exception 'replacement_requires_replaced_status';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_qr_credential() from public, anon, authenticated;
create trigger guard_qr_credential_before_write
  before insert or update on public.qr_credentials
  for each row execute function public.guard_qr_credential();

create function public.audit_qr_credential() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_action text;
begin
  v_action := case
    when tg_op = 'INSERT' and new.status = 'active' then 'issued'
    when tg_op = 'UPDATE' and old.status = 'unclaimed' and new.status = 'active' then 'claimed'
    when tg_op = 'UPDATE' and old.status in ('active','unclaimed') and new.status = 'revoked' then 'revoked'
    when tg_op = 'UPDATE' and old.status = 'active' and new.status = 'replaced' then 'replaced'
  end;
  if v_action is not null then
    insert into public.qr_credential_events(event_id,credential_id,attendee_id,action,actor_id,replaced_by)
    values(new.event_id,new.id,new.attendee_id,v_action,auth.uid(),new.replaced_by);
  end if;
  return new;
end;
$$;
revoke all on function public.audit_qr_credential() from public, anon, authenticated;
create trigger audit_qr_credential_after_write
  after insert or update on public.qr_credentials
  for each row execute function public.audit_qr_credential();

-- Shared database quota covers both public RPCs across all server instances.
create table public.qr_claim_rate_limits (
  user_id uuid not null,
  bucket_started_at timestamptz not null,
  attempts integer not null,
  primary key(user_id, bucket_started_at)
);
alter table public.qr_claim_rate_limits enable row level security;
revoke all on public.qr_claim_rate_limits from public, anon, authenticated;
create function public.record_qr_claim_attempt(p_user_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_attempts integer;
begin
  insert into public.qr_claim_rate_limits(user_id,bucket_started_at,attempts)
  values(p_user_id, to_timestamp(floor(extract(epoch from now()) / 300) * 300), 1)
  on conflict (user_id,bucket_started_at)
  do update set attempts = public.qr_claim_rate_limits.attempts + 1
  returning attempts into v_attempts;
  return v_attempts <= 10;
end;
$$;
revoke all on function public.record_qr_claim_attempt(uuid) from public, anon, authenticated;

-- Serialize claims by attendee, including two different replacement codes.
create or replace function public.claim_qr(p_event_slug text, p_code text)
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
  v_claim_mode text;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if not public.record_qr_claim_attempt(v_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  select * into v_event
  from public.events
  where slug = p_event_slug and status = 'published';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'event_not_found');
  end if;

  v_claim_mode := coalesce(
    v_event.qr_config->>'claim_mode',
    case
      when coalesce(v_event.qr_config->>'mode', 'digital') = 'wristband' then 'claim'
      else 'automatic'
    end
  );

  if v_claim_mode <> 'claim' then
    return jsonb_build_object('ok', false, 'reason', 'claim_disabled');
  end if;

  select * into v_attendee
  from public.attendees
  where event_id = v_event.id and user_id = v_user_id
  limit 1
  for update;

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

create or replace function public.replace_qr(p_event_slug text, p_code text)
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
  v_claim_mode text;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if not public.record_qr_claim_attempt(v_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  select * into v_event
  from public.events
  where slug = p_event_slug and status = 'published';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'event_not_found');
  end if;

  v_claim_mode := coalesce(
    v_event.qr_config->>'claim_mode',
    case
      when coalesce(v_event.qr_config->>'mode', 'digital') = 'wristband' then 'claim'
      else 'automatic'
    end
  );

  if v_claim_mode <> 'claim' then
    return jsonb_build_object('ok', false, 'reason', 'claim_disabled');
  end if;

  select * into v_attendee
  from public.attendees
  where event_id = v_event.id and user_id = v_user_id
  limit 1
  for update;

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


-- Serialize validation against revocation/replacement and make check-in conditional.
CREATE OR REPLACE FUNCTION public.validate_scan(p_station_id uuid, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
  where id = p_station_id and is_active = true
  for share;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'station_not_found');
  end if;

  select * into v_event from public.events where id = v_station.event_id;
  if not found or v_event.status <> 'published' then
    return jsonb_build_object('ok', false, 'reason', 'event_not_live');
  end if;

  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = v_event.organization_id
      and m.user_id = v_user_id
      and m.role in ('owner', 'admin', 'staff')
  ) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if not public.record_scan_attempt(v_user_id, v_station.id) then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  -- Lock attendee before credential, matching claim/replace lock order.
  -- Re-read the credential after waiting to observe a concurrent revocation.
  select * into v_qr
  from public.qr_credentials
  where event_id = v_event.id and code = v_clean_code
  limit 1;
  if found and v_qr.status = 'active' and v_qr.attendee_id is not null then
    perform 1 from public.attendees
    where id = v_qr.attendee_id and event_id = v_event.id
    for update;
  end if;
  select * into v_qr
  from public.qr_credentials
  where event_id = v_event.id and code = v_clean_code
  limit 1
  for update;

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
      jsonb_build_object('message', v_message, 'reason', 'credential_invalid', 'actor_id', v_user_id)
    );

    return jsonb_build_object('ok', true, 'decision', v_decision, 'message', v_message);
  end if;

  select * into v_attendee from public.attendees
  where id = v_qr.attendee_id and event_id = v_event.id;
  if not found then
    insert into public.scan_logs(event_id, scanner_station_id, qr_credential_id, decision, metadata)
    values(v_event.id, v_station.id, v_qr.id, 'invalid',
      jsonb_build_object('message','Credential owner is invalid','reason','owner_event_mismatch','actor_id',v_user_id));
    return jsonb_build_object('ok', true, 'decision', 'invalid', 'message', 'Invalid pass');
  end if;
  select * into v_ticket from public.ticket_types
  where id = v_attendee.ticket_type_id and event_id = v_event.id;
  if v_attendee.ticket_type_id is not null and not found then
    insert into public.scan_logs(event_id, scanner_station_id, qr_credential_id, attendee_id, decision, metadata)
    values(v_event.id, v_station.id, v_qr.id, v_attendee.id, 'denied',
      jsonb_build_object('message','Ticket is not valid for this event','reason','ticket_event_mismatch','actor_id',v_user_id));
    return jsonb_build_object('ok', true, 'decision', 'denied', 'message', 'Ticket is not valid for this event');
  end if;
  if v_station.zone_id is not null and not exists (
    select 1 from public.access_zones z
    where z.id = v_station.zone_id and z.event_id = v_event.id and z.is_active
  ) then
    insert into public.scan_logs(event_id, scanner_station_id, qr_credential_id, attendee_id, decision, metadata)
    values(v_event.id, v_station.id, v_qr.id, v_attendee.id, 'denied',
      jsonb_build_object('message','Station zone is not available','reason','station_zone_mismatch','actor_id',v_user_id));
    return jsonb_build_object('ok', true, 'decision', 'denied', 'message', 'Station zone is not available');
  end if;

  if v_station.mode = 'check_in' then
    if v_attendee.checked_in_at is not null then
      v_decision := 'already_checked_in';
      v_message := 'Already checked in';
    else
      update public.attendees set checked_in_at = now()
      where id = v_attendee.id and event_id = v_event.id and checked_in_at is null
      returning id into v_inserted;
      if v_inserted is null then
        v_decision := 'already_checked_in';
        v_message := 'Already checked in';
      else
        v_decision := 'granted';
        v_message := 'Check-in successful';
      end if;
    end if;

  elsif v_station.mode = 'zone_access' then
    if v_station.zone_id is not null and v_attendee.ticket_type_id is not null
      and exists(select 1 from public.access_zones z where z.id=v_station.zone_id and z.event_id=v_event.id and z.is_active) then
      select coalesce(ar.allowed, false) into v_allowed
      from public.access_rules ar
      where ar.event_id = v_event.id
        and ar.zone_id = v_station.zone_id
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
      and is_active = true
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
      'reason', case
        when v_decision = 'denied' and v_station.mode = 'zone_access' then 'zone_access_denied'
        when v_decision = 'denied' and v_station.mode = 'activity' then 'activity_unavailable'
        when v_decision = 'denied' and v_station.mode = 'claim' then 'benefit_unavailable'
        else v_decision::text
      end,
      'ticket_type', v_ticket.name,
      'actor_id', v_user_id
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
$function$;

-- Lock the event through capacity checks and insertion, preventing overbooking.
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
  where slug = p_event_slug and status = 'published'
  for update;

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

    if not found then
      return jsonb_build_object('ok', false, 'reason', 'registration_conflict');
    end if;
    return jsonb_build_object(
      'ok', true,
      'existing', true,
      'attendee_id', v_attendee.id,
      'attendee_code', v_attendee.attendee_code
    );
end;
$$;
