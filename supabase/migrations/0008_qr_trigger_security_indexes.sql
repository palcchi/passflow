revoke all on function public.issue_digital_qr_for_attendee() from public, anon, authenticated;
create index if not exists event_invitations_accepted_by_idx on public.event_invitations(accepted_by);
create index if not exists events_created_by_idx on public.events(created_by);
