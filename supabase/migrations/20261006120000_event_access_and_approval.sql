-- Event access: Public/Private visibility, Coming soon (published, registration closed) and
-- organizer approval of registrations. Approved attendees get their QR and an in-app notification.

alter table public.events
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'private')),
  add column if not exists registration_open boolean not null default true,
  add column if not exists requires_approval boolean not null default false;

alter table public.attendees
  add column if not exists approval_status text not null default 'approved' check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists reviewed_at timestamptz;

create index if not exists attendees_pending_idx on public.attendees(event_id) where approval_status = 'pending';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists notifications_own_select on public.notifications;
create policy notifications_own_select on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- QR credentials are only issued to approved attendees; approval itself re-fires the trigger.
create or replace function public.issue_digital_qr_for_attendee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_mode text;
  v_qr_id uuid;
begin
  if new.approval_status <> 'approved' then
    return new;
  end if;

  select coalesce(
    qr_config->>'claim_mode',
    case
      when coalesce(qr_config->>'mode', 'digital') = 'wristband' then 'claim'
      else 'automatic'
    end
  )
  into v_claim_mode
  from public.events
  where id = new.event_id;

  if v_claim_mode <> 'automatic' then
    return new;
  end if;

  if exists (
    select 1
    from public.qr_credentials
    where event_id = new.event_id
      and attendee_id = new.id
      and status = 'active'
  ) then
    return new;
  end if;

  select id
  into v_qr_id
  from public.qr_credentials
  where event_id = new.event_id
    and attendee_id is null
    and status = 'unclaimed'
  order by created_at, id
  for update skip locked
  limit 1;

  if found then
    update public.qr_credentials
    set attendee_id = new.id,
        status = 'active',
        claimed_at = now(),
        revoked_at = null
    where id = v_qr_id;
  else
    insert into public.qr_credentials (event_id, attendee_id, code, display_code, status, claimed_at)
    values (
      new.event_id,
      new.id,
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'PASS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
      'active',
      now()
    )
    on conflict (attendee_id) where status = 'active' do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.issue_digital_qr_for_attendee() from public, anon, authenticated;
drop trigger if exists attendees_auto_issue_digital_qr on public.attendees;
create trigger attendees_auto_issue_digital_qr
after insert or update of user_id, approval_status on public.attendees
for each row execute function public.issue_digital_qr_for_attendee();

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
      'attendee_code', v_attendee.attendee_code,
      'pending', v_attendee.approval_status = 'pending'
    );
  end if;

  -- Guests the organizer added by email are already approved: linking them works even before
  -- public registration opens.
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

  if not v_event.registration_open then
    return jsonb_build_object('ok', false, 'reason', 'registration_closed');
  end if;

  if v_event.capacity is not null then
    select count(*) into v_count
    from public.attendees
    where event_id = v_event.id and approval_status <> 'rejected';

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
    where event_id = v_event.id and ticket_type_id = v_ticket.id and approval_status <> 'rejected';

    if v_count >= v_ticket.capacity then
      return jsonb_build_object('ok', false, 'reason', 'ticket_full');
    end if;
  end if;

  insert into public.attendees (
    event_id, user_id, ticket_type_id, attendee_code, name, email, phone, approval_status
  )
  values (
    v_event.id,
    v_user_id,
    v_ticket.id,
    'ATT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    trim(p_name),
    v_email,
    nullif(trim(coalesce(p_phone, '')), ''),
    case when v_event.requires_approval then 'pending' else 'approved' end
  )
  returning * into v_attendee;

  if v_attendee.approval_status = 'pending' then
    insert into public.notifications (user_id, kind, title, body, href)
    select m.user_id, 'registration_request',
      'New registration to review',
      trim(p_name) || ' asked to join ' || v_event.name || '.',
      '/organizer/events/' || v_event.id || '/people'
    from public.organization_members m
    where m.organization_id = v_event.organization_id and m.role in ('owner', 'admin');
  end if;

  return jsonb_build_object(
    'ok', true,
    'attendee_id', v_attendee.id,
    'attendee_code', v_attendee.attendee_code,
    'pending', v_attendee.approval_status = 'pending'
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
      'attendee_code', v_attendee.attendee_code,
      'pending', v_attendee.approval_status = 'pending'
    );
end;
$$;

revoke all on function public.register_for_event(text, text, text, text) from public, anon;
grant execute on function public.register_for_event(text, text, text, text) to authenticated;

-- Wristband claims wait for approval too.
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

  if v_attendee.approval_status <> 'approved' then
    return jsonb_build_object('ok', false, 'reason', 'not_approved');
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

-- Organizer decision on a pending registration. Returns what the server needs to send the email.
create or replace function public.review_attendee(p_attendee_id uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attendee public.attendees%rowtype;
  v_event public.events%rowtype;
begin
  select * into v_attendee from public.attendees where id = p_attendee_id for update;
  if not found then raise exception 'attendee_not_found'; end if;
  if not public.is_event_manager(v_attendee.event_id) then raise exception 'forbidden'; end if;
  if v_attendee.approval_status <> 'pending' then raise exception 'not_pending'; end if;

  select * into v_event from public.events where id = v_attendee.event_id;

  update public.attendees
  set approval_status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_at = now()
  where id = p_attendee_id;

  if v_attendee.user_id is not null then
    insert into public.notifications (user_id, kind, title, body, href)
    values (
      v_attendee.user_id,
      case when p_approve then 'registration_approved' else 'registration_declined' end,
      case when p_approve then 'You are in: ' || v_event.name else 'Registration not approved' end,
      case when p_approve then 'Your pass for ' || v_event.name || ' is ready.'
        else 'The organizer of ' || v_event.name || ' could not approve your registration.' end,
      case when p_approve then '/e/' || v_event.slug || '/claim' else '/e/' || v_event.slug end
    );
  end if;

  return jsonb_build_object(
    'approved', p_approve,
    'name', v_attendee.name,
    'email', v_attendee.email,
    'event_name', v_event.name,
    'event_slug', v_event.slug
  );
end;
$$;

revoke all on function public.review_attendee(uuid, boolean) from public, anon;
grant execute on function public.review_attendee(uuid, boolean) to authenticated;

-- Visibility, registration window and approval apply immediately (they are not part of the
-- published-version draft).
create or replace function public.set_event_access(
  p_event_id uuid,
  p_visibility text,
  p_registration_open boolean,
  p_requires_approval boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_event_manager(p_event_id) then raise exception 'forbidden'; end if;
  if p_visibility not in ('public', 'private') then raise exception 'invalid_visibility'; end if;
  update public.events
  set visibility = p_visibility,
      registration_open = p_registration_open,
      requires_approval = p_requires_approval
  where id = p_event_id;
end;
$$;

revoke all on function public.set_event_access(uuid, text, boolean, boolean) from public, anon;
grant execute on function public.set_event_access(uuid, text, boolean, boolean) to authenticated;


-- Manual check-in only finds approved attendees; the guard below also blocks direct check-ins.
create or replace function public.lookup_station_attendees(p_station_id uuid, p_query text)
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
      and a.approval_status='approved'
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

create or replace function public.guard_attendee_approval() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.checked_in_at is not null and old.checked_in_at is null and new.approval_status <> 'approved' then
    raise exception 'attendee_not_approved';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_attendee_approval() from public, anon, authenticated;
drop trigger if exists guard_attendee_approval on public.attendees;
create trigger guard_attendee_approval before update of checked_in_at on public.attendees
  for each row execute function public.guard_attendee_approval();
