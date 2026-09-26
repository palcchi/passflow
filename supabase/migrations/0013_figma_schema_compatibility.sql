alter table public.figma_connections add column if not exists figma_name text;
alter table public.figma_connections add column if not exists figma_email text;
update public.figma_connections set figma_name = coalesce(figma_name, handle), figma_email = coalesce(figma_email, email) where figma_name is null or figma_email is null;

alter table public.event_designs add column if not exists asset_type text;
alter table public.event_designs add column if not exists figma_url text;
update public.event_designs set asset_type = coalesce(asset_type, kind), figma_url = coalesce(figma_url, figma_file_url) where asset_type is null or figma_url is null;

create index if not exists event_designs_asset_type_idx on public.event_designs(asset_type);
