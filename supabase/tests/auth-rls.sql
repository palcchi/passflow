\set ON_ERROR_STOP on
begin;
insert into auth.users values
('00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000002'),
('00000000-0000-0000-0000-000000000003');
insert into public.organizations (id,name,slug) values
('10000000-0000-0000-0000-000000000001','Org A','org-a'),
('10000000-0000-0000-0000-000000000002','Org B','org-b');
insert into public.organization_members (organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','owner'),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','staff');
insert into public.events (id,organization_id,name,slug,status) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Draft A','draft-a','draft'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Public B','public-b','published');
insert into public.scanner_stations (event_id,name,slug,mode) values
('20000000-0000-0000-0000-000000000001','Gate A','gate-a','check_in'),
('20000000-0000-0000-0000-000000000002','Gate B','gate-b','check_in');
grant select on all tables in schema public to anon, authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
  if (select count(*) from public.organization_members) <> 1 then raise exception 'Membership leak'; end if;
  if (select count(*) from public.scanner_stations) <> 1 then raise exception 'Station tenant leak'; end if;
  if exists(select 1 from public.scanner_stations where slug='gate-b') then raise exception 'Cross-org station leak'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
  if exists(select 1 from public.events where slug='draft-a') then raise exception 'Cross-org draft leak'; end if;
  if (select count(*) from public.scanner_stations) <> 1 then raise exception 'Staff station scope failure'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ begin
  if exists(select 1 from public.organization_members) then raise exception 'Visitor membership leak'; end if;
  if exists(select 1 from public.scanner_stations) then raise exception 'Visitor station leak'; end if;
  begin
    insert into public.organization_members(organization_id,user_id,role) values
    ('10000000-0000-0000-0000-000000000001',auth.uid(),'owner');
    raise exception 'Self-promotion was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  if (select count(*) from public.events) <> 1 then raise exception 'Anonymous event scope failure'; end if;
  if exists(select 1 from public.organization_members) then raise exception 'Anonymous membership leak'; end if;
  if exists(select 1 from public.scanner_stations) then raise exception 'Anonymous station leak'; end if;
end $$;
rollback;
