-- Organizer access is requested by the user and approved by PassFlow.
-- Users can only create a pending request for themselves; approval runs as service role / SQL editor.
create table public.organizer_applications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_name text not null check (char_length(btrim(organization_name)) between 2 and 80),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{6,24}$'),
  city text check (city is null or char_length(city) <= 60),
  event_scale text check (event_scale is null or event_scale in ('small','medium','large')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.organizer_applications enable row level security;
create policy "applicants read own application" on public.organizer_applications
  for select to authenticated using (user_id = auth.uid());
create policy "applicants submit own pending application" on public.organizer_applications
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending' and organization_id is null);
revoke all on public.organizer_applications from anon, authenticated;
grant select on public.organizer_applications to authenticated;
grant insert (user_id, organization_name, phone, city, event_scale) on public.organizer_applications to authenticated;

-- Usage: select public.review_organizer_application('<user uuid>', true);
create or replace function public.review_organizer_application(p_user_id uuid, p_approve boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_app public.organizer_applications;
  v_org uuid;
  v_slug text;
begin
  select * into v_app from public.organizer_applications where user_id = p_user_id for update;
  if not found then raise exception 'application_not_found'; end if;
  if v_app.status <> 'pending' then raise exception 'application_already_reviewed'; end if;
  if not p_approve then
    update public.organizer_applications set status = 'rejected', reviewed_at = now() where user_id = p_user_id;
    return null;
  end if;
  v_slug := coalesce(nullif(trim(both '-' from regexp_replace(lower(v_app.organization_name), '[^a-z0-9]+', '-', 'g')), ''), 'org')
    || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
  insert into public.organizations(name, slug) values (btrim(v_app.organization_name), v_slug) returning id into v_org;
  insert into public.organization_members(organization_id, user_id, role) values (v_org, p_user_id, 'owner');
  update public.organizer_applications set status = 'approved', organization_id = v_org, reviewed_at = now() where user_id = p_user_id;
  return v_org;
end $$;
revoke all on function public.review_organizer_application(uuid, boolean) from public, anon, authenticated;
