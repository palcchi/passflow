create extension if not exists "pgcrypto";

create type public.member_role as enum ('owner', 'admin', 'staff');
create type public.event_status as enum ('draft', 'published', 'archived');
create type public.qr_status as enum ('unclaimed', 'active', 'revoked', 'replaced');
create type public.scan_decision as enum (
  'granted',
  'denied',
  'invalid',
  'already_checked_in',
  'already_claimed'
);
create type public.station_mode as enum (
  'check_in',
  'zone_access',
  'activity',
  'claim'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.event_status not null default 'draft',
  theme jsonb not null default jsonb_build_object(
    'primary', '#7448ff',
    'secondary', '#eee8ff',
    'background', '#f5f5f2',
    'foreground', '#151515',
    'surface', '#ffffff'
  ),
  logo_url text,
  hero_image_url text,
  poster_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_organization_id_idx
  on public.events(organization_id);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  capacity integer check (capacity is null or capacity >= 0),
  created_at timestamptz not null default now(),
  unique (event_id, code)
);

create table public.attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  ticket_type_id uuid references public.ticket_types(id) on delete set null,
  attendee_code text not null,
  name text not null,
  email text,
  phone text,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, attendee_code)
);

create index attendees_event_id_idx
  on public.attendees(event_id);

create table public.qr_credentials (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  attendee_id uuid references public.attendees(id) on delete set null,
  code text not null unique,
  status public.qr_status not null default 'unclaimed',
  claimed_at timestamptz,
  revoked_at timestamptz,
  replaced_by uuid references public.qr_credentials(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint active_qr_requires_attendee check (
    status <> 'active' or attendee_id is not null
  )
);

create index qr_credentials_event_id_status_idx
  on public.qr_credentials(event_id, status);

create unique index one_active_qr_per_attendee_idx
  on public.qr_credentials(attendee_id)
  where status = 'active';

create table public.access_zones (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);

create table public.access_rules (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  zone_id uuid not null references public.access_zones(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete cascade,
  allowed boolean not null default true,
  unique (zone_id, ticket_type_id)
);

create table public.scanner_stations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  zone_id uuid references public.access_zones(id) on delete set null,
  name text not null,
  slug text not null,
  mode public.station_mode not null,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (event_id, slug)
);

create table public.scan_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  scanner_station_id uuid references public.scanner_stations(id) on delete set null,
  qr_credential_id uuid references public.qr_credentials(id) on delete set null,
  attendee_id uuid references public.attendees(id) on delete set null,
  decision public.scan_decision not null,
  metadata jsonb not null default '{}'::jsonb,
  scanned_at timestamptz not null default now()
);

create index scan_logs_event_scanned_at_idx
  on public.scan_logs(event_id, scanned_at desc);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  attendee_id uuid not null references public.attendees(id) on delete cascade,
  scanner_station_id uuid references public.scanner_stations(id) on delete set null,
  completed_at timestamptz not null default now(),
  unique (activity_id, attendee_id)
);

create table public.benefit_claims (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  attendee_id uuid not null references public.attendees(id) on delete cascade,
  benefit_code text not null,
  scanner_station_id uuid references public.scanner_stations(id) on delete set null,
  claimed_at timestamptz not null default now(),
  unique (event_id, attendee_id, benefit_code)
);

create table public.event_assets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  asset_type text not null,
  storage_path text not null,
  public_url text,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.attendees enable row level security;
alter table public.qr_credentials enable row level security;
alter table public.access_zones enable row level security;
alter table public.access_rules enable row level security;
alter table public.scanner_stations enable row level security;
alter table public.scan_logs enable row level security;
alter table public.activities enable row level security;
alter table public.activity_logs enable row level security;
alter table public.benefit_claims enable row level security;
alter table public.event_assets enable row level security;

-- Policies are intentionally added in a later migration together with auth roles.
-- Until then, browser clients cannot read protected tables unless a policy allows it.
-- Server-side service-role access must remain server-only.
