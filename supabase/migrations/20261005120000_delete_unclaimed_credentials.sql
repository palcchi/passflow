-- Organizers may delete printed-but-never-claimed QR codes (a mistaken batch, damaged wristbands).
-- Claimed, active or revoked credentials keep their audit history and can only be revoked.
create function public.delete_unclaimed_credentials(p_event_id uuid, p_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if not public.is_event_manager(p_event_id) then raise exception 'forbidden'; end if;
  if coalesce(array_length(p_ids, 1), 0) > 1000 then raise exception 'too_many_credentials'; end if;
  delete from public.qr_credentials
  where event_id = p_event_id and id = any(p_ids) and status = 'unclaimed' and attendee_id is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.delete_unclaimed_credentials(uuid, uuid[]) from public, anon;
grant execute on function public.delete_unclaimed_credentials(uuid, uuid[]) to authenticated;
