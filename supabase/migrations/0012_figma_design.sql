create table if not exists public.figma_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  figma_user_id text not null,
  figma_email text,
  figma_name text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.event_designs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  asset_type text not null check (asset_type in ('id_card','lanyard','wristband','ticket','event_cover','event_page')),
  name text not null,
  figma_file_key text not null,
  figma_node_id text,
  figma_url text not null,
  figma_file_name text,
  figma_version text,
  preview_url text,
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_designs_event_id_idx on public.event_designs(event_id);
create index if not exists event_designs_created_by_idx on public.event_designs(created_by);

alter table public.figma_connections enable row level security;
alter table public.event_designs enable row level security;

drop policy if exists figma_connections_owner_select on public.figma_connections;
create policy figma_connections_owner_select on public.figma_connections for select to authenticated using (user_id = auth.uid());
drop policy if exists figma_connections_owner_insert on public.figma_connections;
create policy figma_connections_owner_insert on public.figma_connections for insert to authenticated with check (user_id = auth.uid());
drop policy if exists figma_connections_owner_update on public.figma_connections;
create policy figma_connections_owner_update on public.figma_connections for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists figma_connections_owner_delete on public.figma_connections;
create policy figma_connections_owner_delete on public.figma_connections for delete to authenticated using (user_id = auth.uid());

drop policy if exists event_designs_manager_select on public.event_designs;
create policy event_designs_manager_select on public.event_designs for select to authenticated using (public.is_event_manager(event_id));
drop policy if exists event_designs_manager_insert on public.event_designs;
create policy event_designs_manager_insert on public.event_designs for insert to authenticated with check (public.is_event_manager(event_id) and created_by = auth.uid());
drop policy if exists event_designs_manager_update on public.event_designs;
create policy event_designs_manager_update on public.event_designs for update to authenticated using (public.is_event_manager(event_id)) with check (public.is_event_manager(event_id));
drop policy if exists event_designs_manager_delete on public.event_designs;
create policy event_designs_manager_delete on public.event_designs for delete to authenticated using (public.is_event_manager(event_id));
