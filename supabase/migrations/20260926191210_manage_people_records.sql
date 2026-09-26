-- Version aligned with the production migration record.
-- Keep deletion and credential revocation in a single RLS-checked transaction.
create or replace function public.delete_event_person_record(p_event_id uuid, p_id uuid, p_kind text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_event_manager(p_event_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_kind = 'attendee' then
    perform id from public.attendees where id = p_id and event_id = p_event_id for update;
    if not found then raise exception 'record_not_found'; end if;
    update public.qr_credentials set status = 'revoked', revoked_at = now()
      where attendee_id = p_id and event_id = p_event_id;
    delete from public.attendees where id = p_id and event_id = p_event_id;
  elsif p_kind = 'ticket' then
    perform id from public.ticket_types where id = p_id and event_id = p_event_id for update;
    if not found then raise exception 'record_not_found'; end if;
    if exists(select 1 from public.attendees where ticket_type_id = p_id)
      or exists(select 1 from public.access_rules where ticket_type_id = p_id)
      or exists(select 1 from public.event_designs where ticket_type_id = p_id) then
      raise exception 'record_in_use';
    end if;
    delete from public.ticket_types where id = p_id and event_id = p_event_id;
  else raise exception 'invalid_record_kind';
  end if;
end;
$$;
revoke all on function public.delete_event_person_record(uuid, uuid, text) from public, anon;
grant execute on function public.delete_event_person_record(uuid, uuid, text) to authenticated;
