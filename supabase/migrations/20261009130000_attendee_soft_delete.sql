-- Soft-delete attendees (7-day grace period before permanent removal).
--
-- Strategy:
--   • Hard delete stays for ticket_types (config only, no history).
--   • Attendees get deleted_at timestamp; they are invisible to all normal
--     queries but their scan_logs / activity_logs / benefit_claims stay intact
--     until the purge runs.
--   • purge_deleted_attendees() does the real cascade delete and is called:
--       a) lazily from the People page on every load (cheap: indexed timestamp)
--       b) can be scheduled via pg_cron: SELECT cron.schedule(
--              'purge-deleted-attendees', '0 3 * * *',
--              'SELECT public.purge_deleted_attendees()');

-- 1. Add deleted_at column (nullable, default null = not deleted).
alter table public.attendees
  add column if not exists deleted_at timestamptz default null;

-- 2. Index for fast purge queries (partial index on non-null only).
create index if not exists attendees_deleted_at_idx
  on public.attendees (deleted_at)
  where deleted_at is not null;

-- 3. Replace delete_event_person_record: attendees now get soft-deleted.
create or replace function public.delete_event_person_record(
  p_event_id uuid,
  p_id       uuid,
  p_kind     text
)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_event_manager(p_event_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_kind = 'attendee' then
    -- Lock the row to prevent concurrent ops.
    perform id from public.attendees
      where id = p_id and event_id = p_event_id for update;

    -- Soft delete: stamp deleted_at, revoke credential.
    update public.attendees
      set deleted_at = now()
      where id = p_id and event_id = p_event_id and deleted_at is null;

    if not found then
      raise exception 'record_not_found';
    end if;

    -- Revoke the QR credential immediately so the pass stops working.
    update public.qr_credentials
      set status = 'revoked', revoked_at = now()
      where attendee_id = p_id
        and event_id = p_event_id
        and status != 'revoked';

  elsif p_kind = 'ticket' then
    perform id from public.ticket_types
      where id = p_id and event_id = p_event_id for update;
    if not found then raise exception 'record_not_found'; end if;

    -- Only hard-delete tickets with no live references.
    if exists(
      select 1 from public.attendees
        where ticket_type_id = p_id and deleted_at is null
    ) or exists(
      select 1 from public.access_rules where ticket_type_id = p_id
    ) or exists(
      select 1 from public.event_designs where ticket_type_id = p_id
    ) then
      raise exception 'record_in_use';
    end if;

    delete from public.ticket_types where id = p_id and event_id = p_event_id;

  else
    raise exception 'invalid_record_kind';
  end if;
end;
$$;

revoke all on function public.delete_event_person_record(uuid, uuid, text) from public, anon;
grant execute on function public.delete_event_person_record(uuid, uuid, text) to authenticated;

-- 4. Purge function: permanently remove soft-deleted attendees older than 7 days.
--    Cascades naturally via FK (scan_logs etc. reference attendee_id which may
--    be ON DELETE SET NULL / ON DELETE CASCADE depending on schema).
create or replace function public.purge_deleted_attendees()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  -- Nullify attendee_id in scan_logs so history is preserved without the link.
  update public.scan_logs
    set attendee_id = null
    where attendee_id in (
      select id from public.attendees
        where deleted_at < now() - interval '7 days'
    );

  -- Remove attendee profiles (private storage paths stay until storage is GC'd).
  delete from public.attendee_profiles
    where attendee_id in (
      select id from public.attendees
        where deleted_at < now() - interval '7 days'
    );

  -- Remove notifications linked to the attendee's user_id is out of scope here;
  -- the attendee row is enough to stop all organizer-facing exposure.

  -- Hard-delete the attendee rows (credentials already revoked on soft-delete).
  delete from public.attendees
    where deleted_at < now() - interval '7 days';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Only the service role (background jobs, edge functions) calls purge.
revoke all on function public.purge_deleted_attendees() from public, anon, authenticated;
grant execute on function public.purge_deleted_attendees() to service_role;
