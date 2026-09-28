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
    if v_station.zone_id is not null and v_attendee.ticket_type_id is not null
      and exists(select 1 from public.access_zones z where z.id=v_station.zone_id and z.event_id=v_event.id and z.is_active) then
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
$function$;
