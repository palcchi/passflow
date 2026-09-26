update public.events
set qr_config = coalesce(qr_config, '{}'::jsonb) ||
  jsonb_build_object(
    'claim_mode',
    case
      when coalesce(qr_config->>'mode', 'digital') = 'wristband' then 'claim'
      else 'automatic'
    end
  )
where not (coalesce(qr_config, '{}'::jsonb) ? 'claim_mode');

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
    insert into public.qr_credentials (
      event_id,
      attendee_id,
      code,
      display_code,
      status,
      claimed_at
    )
    values (
      new.event_id,
      new.id,
      replace(gen_random_uuid()::text, '-', '') ||
        replace(gen_random_uuid()::text, '-', ''),
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
after insert or update of user_id on public.attendees
for each row execute function public.issue_digital_qr_for_attendee();

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

revoke all on function public.claim_qr(text, text) from public, anon;
revoke all on function public.replace_qr(text, text) from public, anon;
grant execute on function public.claim_qr(text, text) to authenticated;
grant execute on function public.replace_qr(text, text) to authenticated;

update public.attendees a
set user_id = a.user_id
from public.events e
where e.id = a.event_id
  and coalesce(
    e.qr_config->>'claim_mode',
    case
      when coalesce(e.qr_config->>'mode', 'digital') = 'wristband' then 'claim'
      else 'automatic'
    end
  ) = 'automatic';
