drop policy if exists "users manage own figma connection" on public.figma_connections;
drop policy if exists "event members read designs" on public.event_designs;
drop policy if exists "event managers create designs" on public.event_designs;
drop policy if exists "event managers update designs" on public.event_designs;
drop policy if exists "event managers delete designs" on public.event_designs;

drop policy if exists figma_connections_owner_select on public.figma_connections;
create policy figma_connections_owner_select
on public.figma_connections
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists figma_connections_owner_insert on public.figma_connections;
create policy figma_connections_owner_insert
on public.figma_connections
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists figma_connections_owner_update on public.figma_connections;
create policy figma_connections_owner_update
on public.figma_connections
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists figma_connections_owner_delete on public.figma_connections;
create policy figma_connections_owner_delete
on public.figma_connections
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists event_designs_manager_insert on public.event_designs;
create policy event_designs_manager_insert
on public.event_designs
for insert to authenticated
with check (
  public.is_event_manager(event_id)
  and created_by = (select auth.uid())
);

create index if not exists attendee_profiles_user_id_idx
  on public.attendee_profiles(user_id);

create index if not exists event_designs_ticket_type_id_idx
  on public.event_designs(ticket_type_id);
