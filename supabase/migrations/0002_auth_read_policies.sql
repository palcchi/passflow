-- Auth foundation: membership is provisioned by a trusted operator, never signup metadata.
-- Writes remain closed until event/claim/scanner transactions are implemented.
create policy "members read own membership" on public.organization_members
for select to authenticated using (user_id = (select auth.uid()));

create policy "members read own organization" on public.organizations
for select to authenticated using (exists (
  select 1 from public.organization_members m
  where m.organization_id = organizations.id and m.user_id = (select auth.uid())
));

create policy "public reads published events" on public.events
for select to anon, authenticated using (status = 'published');

create policy "members read organization events" on public.events
for select to authenticated using (exists (
  select 1 from public.organization_members m
  where m.organization_id = events.organization_id and m.user_id = (select auth.uid())
));

create policy "read ticket types for visible events" on public.ticket_types
for select to anon, authenticated using (exists (
  select 1 from public.events e where e.id = ticket_types.event_id
));

create policy "visitors read own attendee record" on public.attendees
for select to authenticated using (user_id = (select auth.uid()));

create policy "visitors read own active credential" on public.qr_credentials
for select to authenticated using (status = 'active' and exists (
  select 1 from public.attendees a
  where a.id = qr_credentials.attendee_id and a.event_id = qr_credentials.event_id
  and a.user_id = (select auth.uid())
));

create policy "members read assigned organization stations" on public.scanner_stations
for select to authenticated using (exists (
  select 1 from public.events e join public.organization_members m on m.organization_id = e.organization_id
  where e.id = scanner_stations.event_id and m.user_id = (select auth.uid())
));

-- No browser may assign itself owner/admin/staff, even if permissive grants were applied earlier.
revoke insert, update, delete on public.organization_members from anon, authenticated;
