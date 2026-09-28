-- Isolated PostgreSQL CI database only; run after bootstrap, 0001 and 0002.
\set ON_ERROR_STOP on
alter table auth.users add column email text;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);
create table storage.objects(bucket_id text,name text);
create function storage.foldername(name text) returns text[] language sql immutable as
$$ select string_to_array(name,'/') $$;
\i supabase/migrations/0003_core_mvp_features.sql
\i supabase/migrations/0006_qr_delivery_templates.sql
\i supabase/migrations/20260926174402_optional_qr_claim_mode_v1.sql
\i supabase/migrations/20260927155113_scanner_lifecycle_guards.sql
alter table public.access_zones add column is_active boolean not null default true;
alter table public.activities add column is_active boolean not null default true;
\i supabase/migrations/20260928120000_phase1_credential_guards.sql

insert into auth.users(id) values
  ('40000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000002'),
  ('40000000-0000-4000-8000-000000000003');
insert into public.organizations(id,name,slug)
values('40000000-0000-4000-8000-000000000011','Concurrency','concurrency');
insert into public.organization_members(organization_id,user_id,role)
values('40000000-0000-4000-8000-000000000011','40000000-0000-4000-8000-000000000001','owner');
insert into public.events(id,organization_id,name,slug,status,qr_config)
values('40000000-0000-4000-8000-000000000012',
  '40000000-0000-4000-8000-000000000011','Concurrency event','concurrency-event',
  'published','{"mode":"wristband","claim_mode":"claim"}');
insert into public.events(id,organization_id,name,slug,status,capacity,qr_config)
values('40000000-0000-4000-8000-000000000013',
  '40000000-0000-4000-8000-000000000011','One seat','registration-race',
  'published',1,'{"claim_mode":"claim"}');
insert into public.ticket_types(id,event_id,name,code,capacity)
values('40000000-0000-4000-8000-000000000014',
  '40000000-0000-4000-8000-000000000013','Single seat','seat',1);
insert into public.attendees(id,event_id,user_id,attendee_code,name) values
  ('40000000-0000-4000-8000-000000000021',
   '40000000-0000-4000-8000-000000000012',
   '40000000-0000-4000-8000-000000000002','A','Visitor A'),
  ('40000000-0000-4000-8000-000000000022',
   '40000000-0000-4000-8000-000000000012',
   '40000000-0000-4000-8000-000000000003','B','Visitor B');
insert into public.qr_credentials(event_id,code,display_code)
values('40000000-0000-4000-8000-000000000012','RACE-QR','RACE-QR');
insert into public.scanner_stations(id,event_id,name,slug,mode)
values('40000000-0000-4000-8000-000000000031',
  '40000000-0000-4000-8000-000000000012','Gate','gate','check_in');
