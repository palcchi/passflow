create table if not exists public.figma_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  figma_user_id text not null,
  handle text,
  email text,
  avatar_url text,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamptz not null,
  scopes text[] not null default array['current_user:read','file_content:read','file_metadata:read']::text[],
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.figma_connections enable row level security;
grant select, insert, update, delete on public.figma_connections to authenticated;

drop policy if exists "users manage own figma connection" on public.figma_connections;
create policy "users manage own figma connection"
on public.figma_connections
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create table if not exists public.event_designs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('id_card','lanyard','wristband','ticket','event_cover','event_page')),
  name text not null,
  figma_file_key text not null,
  figma_node_id text,
  figma_file_url text not null,
  figma_file_name text,
  figma_version text,
  preview_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, kind)
);

alter table public.event_designs enable row level security;
create index if not exists event_designs_event_id_idx on public.event_designs(event_id);
create index if not exists event_designs_created_by_idx on public.event_designs(created_by);
grant select, insert, update, delete on public.event_designs to authenticated;

drop policy if exists "event members read designs" on public.event_designs;
create policy "event members read designs"
on public.event_designs
for select
to authenticated
using (public.is_event_member(event_id));

drop policy if exists "event managers create designs" on public.event_designs;
create policy "event managers create designs"
on public.event_designs
for insert
to authenticated
with check (
  public.is_event_manager(event_id)
  and ((select auth.uid()) = created_by or created_by is null)
);

drop policy if exists "event managers update designs" on public.event_designs;
create policy "event managers update designs"
on public.event_designs
for update
to authenticated
using (public.is_event_manager(event_id))
with check (public.is_event_manager(event_id));

drop policy if exists "event managers delete designs" on public.event_designs;
create policy "event managers delete designs"
on public.event_designs
for delete
to authenticated
using (public.is_event_manager(event_id));
