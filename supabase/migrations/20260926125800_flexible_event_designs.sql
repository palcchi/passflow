alter table public.event_designs drop constraint if exists event_designs_event_id_kind_key;
alter table public.event_designs drop constraint if exists event_designs_kind_check;
alter table public.event_designs add constraint event_designs_kind_check check (kind in ('id_card','lanyard','wristband','ticket','event_cover','event_page','social','custom'));
alter table public.event_designs add column if not exists template jsonb not null default '{}'::jsonb;
alter table public.event_designs add column if not exists ticket_type_id uuid references public.ticket_types(id) on delete set null;
create index if not exists event_designs_event_kind_idx on public.event_designs(event_id, kind);