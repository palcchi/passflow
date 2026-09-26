create or replace function public.issue_digital_qr_for_attendee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
begin
  select coalesce(qr_config->>'mode', 'digital') into v_mode from public.events where id = new.event_id;
  if v_mode in ('digital', 'id_card_portrait', 'id_card_landscape') then
    insert into public.qr_credentials (event_id, attendee_id, code, display_code, status, claimed_at)
    values (new.event_id, new.id, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 'DG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), 'active', now())
    on conflict (attendee_id) where status = 'active' do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.issue_digital_qr_for_attendee() from public, anon, authenticated;
