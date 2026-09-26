alter table public.events add column if not exists created_by uuid references auth.users(id) on delete set null;
update public.events e set created_by = m.user_id from public.organization_members m where e.created_by is null and m.organization_id=e.organization_id and m.role='owner';
create or replace function public.is_event_manager(p_event_id uuid) returns boolean language sql stable security definer set search_path = public, auth as $$
 select exists (select 1 from public.events e join public.organization_members m on m.organization_id=e.organization_id where e.id=p_event_id and m.user_id=auth.uid() and (m.role='owner' or (m.role='admin' and (e.created_by=auth.uid() or not exists(select 1 from public.events e2 where e2.organization_id=e.organization_id and e2.created_by=auth.uid())))));
$$;
