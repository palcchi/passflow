alter table public.access_zones add column if not exists is_active boolean not null default true;
alter table public.activities add column if not exists is_active boolean not null default true;
-- Event-scoped lifecycle mutations. Historical records are never silently cascaded.
create or replace function public.manage_event_resource(
  p_event_id uuid, p_id uuid, p_kind text, p_operation text, p_values jsonb default '{}'
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_table text;
  v_row jsonb;
  v_name text := trim(p_values->>'name');
  v_zone uuid;
begin
  if auth.uid() is null or not public.is_event_manager(p_event_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  v_table := case p_kind when 'station' then 'scanner_stations' when 'zone' then 'access_zones'
    when 'activity' then 'activities' when 'benefit' then 'benefits' when 'rule' then 'access_rules' end;
  if v_table is null or p_operation not in ('update','delete','activate','deactivate') then
    raise exception 'invalid_request';
  end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 and event_id=$2 for update', v_table)
    into v_row using p_id, p_event_id;
  if v_row is null then raise exception 'record_not_found'; end if;
  if p_operation = 'delete' then
    -- Serialize only destructive reference checks; ordinary resource edits must not stall scans.
    lock table public.scanner_stations, public.scan_logs, public.activity_logs, public.benefit_claims in share row exclusive mode;
    if (p_kind = 'station' and (
        exists(select 1 from public.scan_logs where scanner_station_id=p_id)
        or exists(select 1 from public.activity_logs where scanner_station_id=p_id)
        or exists(select 1 from public.benefit_claims where scanner_station_id=p_id)))
      or (p_kind = 'zone' and (
        exists(select 1 from public.scanner_stations where zone_id=p_id)
        or exists(select 1 from public.access_rules where zone_id=p_id)))
      or (p_kind = 'activity' and (
        exists(select 1 from public.activity_logs where activity_id=p_id)
        or exists(select 1 from public.scanner_stations where event_id=p_event_id and config->>'activity_code'=v_row->>'code')))
      or (p_kind = 'benefit' and (
        exists(select 1 from public.benefit_claims where event_id=p_event_id and benefit_code=v_row->>'code')
        or exists(select 1 from public.scanner_stations where event_id=p_event_id and config->>'benefit_code'=v_row->>'code'))) then
      raise exception 'record_in_use';
    end if;
    execute format('delete from public.%I where id=$1 and event_id=$2',v_table) using p_id,p_event_id;
  elsif p_operation in ('activate','deactivate') then
    if p_kind not in ('station','benefit','zone','activity') then raise exception 'invalid_operation'; end if;
    execute format('update public.%I set is_active=$1 where id=$2 and event_id=$3',v_table)
      using p_operation='activate',p_id,p_event_id;
    if p_operation='deactivate' and p_kind='zone' then
      update public.scanner_stations set is_active=false where event_id=p_event_id and zone_id=p_id;
    elsif p_operation='deactivate' and p_kind='activity' then
      update public.scanner_stations set is_active=false where event_id=p_event_id and config->>'activity_code'=v_row->>'code';
    end if;
  else
    if v_name is null or length(v_name) not between 1 and 100 then raise exception 'invalid_name'; end if;
    if p_kind='station' then
      if p_values->>'mode' is null or p_values->>'mode' not in ('check_in','zone_access','activity','claim') then raise exception 'invalid_mode'; end if;
      v_zone := nullif(p_values->>'zone_id','')::uuid;
      if v_zone is not null and not exists(select 1 from public.access_zones where id=v_zone and event_id=p_event_id and is_active) then raise exception 'invalid_zone'; end if;
      if p_values->>'mode'='zone_access' and v_zone is null then raise exception 'zone_required'; end if;
      if p_values->>'mode'='activity' and not exists(select 1 from public.activities where event_id=p_event_id and code=p_values->>'activity_code' and is_active) then raise exception 'activity_required'; end if;
      if p_values->>'mode'='claim' and not exists(select 1 from public.benefits where event_id=p_event_id and code=p_values->>'benefit_code' and is_active) then raise exception 'benefit_required'; end if;
      update public.scanner_stations set name=v_name, zone_id=v_zone,
        mode=(p_values->>'mode')::public.station_mode,
        config=coalesce(config,'{}') || jsonb_build_object('activity_code',p_values->>'activity_code','benefit_code',p_values->>'benefit_code')
        where id=p_id and event_id=p_event_id;
    elsif p_kind in ('zone','activity','benefit') then
      execute format('update public.%I set name=$1, description=$2 where id=$3 and event_id=$4',v_table)
        using v_name,nullif(left(trim(p_values->>'description'),500),''),p_id,p_event_id;
    else raise exception 'invalid_operation'; end if;
  end if;
end;
$$;
revoke all on function public.manage_event_resource(uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function public.manage_event_resource(uuid,uuid,text,text,jsonb) to authenticated;

-- Immutable published snapshots with private, optimistic-concurrency drafts.
create table public.event_studio_documents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_type_id uuid references public.ticket_types(id) on delete restrict,
  kind text not null check(kind in ('website','digital','id_card','wristband')),
  name text not null check(length(name) between 1 and 100),
  status text not null default 'draft' check(status in ('draft','published','archived')),
  revision integer not null default 1,
  document jsonb not null check(jsonb_typeof(document)='object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index event_studio_documents_event_idx on public.event_studio_documents(event_id,kind,status);
create index event_studio_documents_ticket_idx on public.event_studio_documents(ticket_type_id);
create index event_studio_documents_author_idx on public.event_studio_documents(created_by);
create unique index event_studio_one_published on public.event_studio_documents(event_id,kind,coalesce(ticket_type_id,'00000000-0000-0000-0000-000000000000'::uuid)) where status='published';
alter table public.event_studio_documents enable row level security;
grant select on public.event_studio_documents to anon,authenticated;
revoke insert,update,delete on public.event_studio_documents from anon,authenticated;
create policy studio_manager_read on public.event_studio_documents for select to authenticated using(public.is_event_manager(event_id));
create policy studio_public_read on public.event_studio_documents for select to anon,authenticated using(status='published' and exists(select 1 from public.events e where e.id=event_id and e.status='published'));

create or replace function public.save_studio_document(p_event_id uuid,p_id uuid,p_revision integer,p_kind text,p_ticket_type_id uuid,p_name text,p_document jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_revision integer;
begin
  if auth.uid() is null or not public.is_event_manager(p_event_id) then raise exception 'not_authorized' using errcode='42501'; end if;
  if p_kind not in ('website','digital','id_card','wristband') or length(trim(p_name)) not between 1 and 100
    or jsonb_typeof(p_document) <> 'object' or octet_length(p_document::text)>800000 then raise exception 'invalid_document'; end if;
  if p_ticket_type_id is not null and (p_kind='website' or not exists(select 1 from public.ticket_types where id=p_ticket_type_id and event_id=p_event_id)) then raise exception 'invalid_ticket'; end if;
  if p_id is null then
    insert into public.event_studio_documents(event_id,ticket_type_id,kind,name,document,created_by)
      values(p_event_id,p_ticket_type_id,p_kind,trim(p_name),p_document,auth.uid()) returning id,revision into v_id,v_revision;
  else
    update public.event_studio_documents set name=trim(p_name),document=p_document,revision=revision+1,updated_at=now(),ticket_type_id=p_ticket_type_id
      where id=p_id and event_id=p_event_id and kind=p_kind and status='draft' and revision=p_revision returning id,revision into v_id,v_revision;
    if v_id is null then raise exception 'revision_conflict'; end if;
  end if;
  return jsonb_build_object('id',v_id,'revision',v_revision);
end;
$$;
create or replace function public.publish_studio_document(p_event_id uuid,p_id uuid,p_revision integer)
returns void language plpgsql security definer set search_path='' as $$
declare v_doc public.event_studio_documents%rowtype;
begin
  if auth.uid() is null or not public.is_event_manager(p_event_id) then raise exception 'not_authorized' using errcode='42501'; end if;
  perform id from public.events where id=p_event_id for update;
  select * into v_doc from public.event_studio_documents where id=p_id and event_id=p_event_id for update;
  if not found or v_doc.status <> 'draft' or v_doc.revision<>p_revision then raise exception 'revision_conflict'; end if;
  update public.event_studio_documents set status='archived',updated_at=now() where event_id=p_event_id and kind=v_doc.kind and ticket_type_id is not distinct from v_doc.ticket_type_id and status='published';
  update public.event_studio_documents set status='published',revision=revision+1,updated_at=now() where id=p_id;
end;
$$;
revoke all on function public.save_studio_document(uuid,uuid,integer,text,uuid,text,jsonb) from public,anon;
revoke all on function public.publish_studio_document(uuid,uuid,integer) from public,anon;
grant execute on function public.save_studio_document(uuid,uuid,integer,text,uuid,text,jsonb) to authenticated;
grant execute on function public.publish_studio_document(uuid,uuid,integer) to authenticated;

-- Keep existing Figma designs live; future syncs are separate private drafts.
alter table public.event_designs add column if not exists status text not null default 'draft' check(status in ('draft','published','archived'));
with ranked as (select id,row_number() over(partition by event_id,kind,ticket_type_id order by updated_at desc,id) as n from public.event_designs)
update public.event_designs d set status=case when r.n=1 then 'published' else 'archived' end from ranked r where d.id=r.id;
drop policy if exists event_designs_public_published_select on public.event_designs;
create policy event_designs_public_published_select on public.event_designs for select to anon,authenticated
  using(status='published' and exists(select 1 from public.events e where e.id=event_id and e.status='published'));
create unique index event_designs_one_published on public.event_designs(event_id,kind,coalesce(ticket_type_id,'00000000-0000-0000-0000-000000000000'::uuid)) where status='published';
create or replace function public.publish_figma_draft(p_event_id uuid,p_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare v_doc public.event_designs%rowtype;
begin
  if auth.uid() is null or not public.is_event_manager(p_event_id) then raise exception 'not_authorized' using errcode='42501'; end if;
  perform id from public.events where id=p_event_id for update;
  select * into v_doc from public.event_designs where id=p_id and event_id=p_event_id for update;
  if not found or v_doc.status<>'draft' then raise exception 'not_a_draft'; end if;
  update public.event_designs set status='archived' where event_id=p_event_id and kind=v_doc.kind and ticket_type_id is not distinct from v_doc.ticket_type_id and status='published';
  update public.event_designs set status='published',updated_at=now() where id=p_id;
end;
$$;
revoke all on function public.publish_figma_draft(uuid,uuid) from public,anon;
grant execute on function public.publish_figma_draft(uuid,uuid) to authenticated;

-- Version aligned with the production migration record.
-- Keep deletion and credential revocation in a single RLS-checked transaction.
create or replace function public.delete_event_person_record(p_event_id uuid, p_id uuid, p_kind text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_event_manager(p_event_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_kind = 'attendee' then
    perform id from public.attendees where id = p_id and event_id = p_event_id for update;
    if not found then raise exception 'record_not_found'; end if;
    if exists(select 1 from public.scan_logs where attendee_id=p_id)
      or exists(select 1 from public.activity_logs where attendee_id=p_id)
      or exists(select 1 from public.benefit_claims where attendee_id=p_id) then
      raise exception 'record_in_use';
    end if;
    update public.qr_credentials set status = 'revoked', revoked_at = now()
      where attendee_id = p_id and event_id = p_event_id;
    delete from public.attendees where id = p_id and event_id = p_event_id;
  elsif p_kind = 'ticket' then
    perform id from public.ticket_types where id = p_id and event_id = p_event_id for update;
    if not found then raise exception 'record_not_found'; end if;
    if exists(select 1 from public.attendees where ticket_type_id = p_id)
      or exists(select 1 from public.access_rules where ticket_type_id = p_id)
      or exists(select 1 from public.event_designs where ticket_type_id = p_id) then
      raise exception 'record_in_use';
    end if;
    delete from public.ticket_types where id = p_id and event_id = p_event_id;
  else raise exception 'invalid_record_kind';
  end if;
end;
$$;
revoke all on function public.delete_event_person_record(uuid, uuid, text) from public, anon;
grant execute on function public.delete_event_person_record(uuid, uuid, text) to authenticated;

create or replace function public.retire_studio_document(p_event_id uuid,p_id uuid,p_revision integer,p_delete boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare v_doc public.event_studio_documents%rowtype;
begin
  if auth.uid() is null or not public.is_event_manager(p_event_id) then raise exception 'not_authorized' using errcode='42501'; end if;
  perform id from public.events where id=p_event_id for update;
  select * into v_doc from public.event_studio_documents where id=p_id and event_id=p_event_id for update;
  if not found or v_doc.revision<>p_revision then raise exception 'revision_conflict'; end if;
  if p_delete then
    if v_doc.status<>'draft' then raise exception 'preserve_history'; end if;
    delete from public.event_studio_documents where id=p_id;
  else
    if v_doc.status<>'published' then raise exception 'not_published'; end if;
    update public.event_studio_documents set status='archived',revision=revision+1,updated_at=now() where id=p_id;
  end if;
end;
$$;
revoke all on function public.retire_studio_document(uuid,uuid,integer,boolean) from public,anon;
grant execute on function public.retire_studio_document(uuid,uuid,integer,boolean) to authenticated;
