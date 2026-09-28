-- Event settings are staged while an event is live. Only an explicit publish
-- changes the columns read by registration, scanning and public pages.
create table public.event_config_drafts (
  event_id uuid primary key references public.events(id) on delete cascade,
  config jsonb not null,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(config) = 'object')
);
alter table public.event_config_drafts enable row level security;
revoke all on public.event_config_drafts from public, anon, authenticated;
grant select on public.event_config_drafts to authenticated;
create policy event_config_drafts_manager_read on public.event_config_drafts
  for select to authenticated using (public.is_event_manager(event_id));

create table public.event_publications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  version integer not null,
  config jsonb not null,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  unique (event_id, version)
);
create index event_publications_event_version_idx on public.event_publications(event_id, version desc);
alter table public.event_publications enable row level security;
revoke all on public.event_publications from public, anon, authenticated;
grant select on public.event_publications to authenticated;
create policy event_publications_manager_read on public.event_publications
  for select to authenticated using (public.is_event_manager(event_id));

alter table public.events add column published_version integer;
alter table public.events add column published_at timestamptz;

create function public.event_config(p_event public.events) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'name',p_event.name,'slug',p_event.slug,'description',p_event.description,
    'venue',p_event.venue,'starts_at',p_event.starts_at,'ends_at',p_event.ends_at,
    'capacity',p_event.capacity,'theme',p_event.theme,'qr_config',p_event.qr_config,
    'hero_image_url',p_event.hero_image_url,'logo_url',p_event.logo_url,
    'poster_url',p_event.poster_url
  );
$$;
revoke all on function public.event_config(public.events) from public, anon, authenticated;

create function public.guard_event_lifecycle() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' or exists(select 1 from public.event_publications where event_id=old.id)
      or exists(select 1 from public.attendees where event_id=old.id)
      or exists(select 1 from public.qr_credentials where event_id=old.id)
      or exists(select 1 from public.scan_logs where event_id=old.id)
      or exists(select 1 from public.activity_logs where event_id=old.id)
      or exists(select 1 from public.benefit_claims where event_id=old.id) then
      raise exception 'event_has_operational_history';
    end if;
    return old;
  end if;
  if new.organization_id is distinct from old.organization_id or new.created_by is distinct from old.created_by then
    raise exception 'event_ownership_immutable';
  end if;
  if (new.published_version is distinct from old.published_version or new.published_at is distinct from old.published_at)
    and current_setting('passflow.lifecycle',true) is distinct from 'authorized' then
    raise exception 'published_metadata_immutable';
  end if;
  if new.status is distinct from old.status and current_setting('passflow.lifecycle',true) is distinct from 'authorized' then
    raise exception 'use_event_lifecycle';
  end if;
  if old.status = 'archived' and public.event_config(new) is distinct from public.event_config(old) then
    raise exception 'archived_event_read_only';
  end if;
  if old.status = 'published' and new.status = 'published'
    and public.event_config(new) is distinct from public.event_config(old) then
    raise exception 'stage_changes_before_publish';
  end if;
  return new;
end;
$$;
create trigger guard_event_lifecycle before update or delete on public.events
for each row execute function public.guard_event_lifecycle();
revoke all on function public.guard_event_lifecycle() from public, anon, authenticated;

-- Existing published events receive a stable initial version without changing
-- their current public settings.
insert into public.event_publications(event_id,version,config)
select id,1,public.event_config(e) from public.events e where status='published';
update public.events set published_version=1,published_at=now() where status='published';

create function public.stage_event_config(p_event_id uuid,p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_event public.events%rowtype; v_config jsonb; v_revision integer;
begin
  if auth.uid() is null or not public.is_event_manager(p_event_id) then raise exception 'not_authorized'; end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' or p_patch='{}'::jsonb
    or exists(select 1 from jsonb_object_keys(p_patch) k where k not in
      ('name','slug','description','venue','starts_at','ends_at','capacity','theme','qr_config','hero_image_url','logo_url','poster_url')) then
    raise exception 'invalid_event_patch';
  end if;
  select * into v_event from public.events where id=p_event_id for update;
  if not found then raise exception 'event_not_found'; end if;
  if v_event.status='archived' then raise exception 'archived_event_read_only'; end if;
  v_config := public.event_config(v_event) || coalesce(
    (select config from public.event_config_drafts where event_id=p_event_id),'{}'::jsonb) || p_patch;
  if jsonb_typeof(v_config->'name') <> 'string' or length(v_config->>'name') > 120
    or jsonb_typeof(v_config->'slug') <> 'string' or (v_config->>'slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or length(v_config->>'slug') > 80
    or jsonb_typeof(v_config->'theme') <> 'object' or jsonb_typeof(v_config->'qr_config') <> 'object'
    or (v_config->'capacity' <> 'null'::jsonb and
      (jsonb_typeof(v_config->'capacity') <> 'number' or (v_config->>'capacity') !~ '^[0-9]{1,9}$')) then
    raise exception 'invalid_event_configuration';
  end if;
  if v_config->>'starts_at' is not null then perform (v_config->>'starts_at')::timestamptz; end if;
  if v_config->>'ends_at' is not null then perform (v_config->>'ends_at')::timestamptz; end if;
  if p_patch ? 'qr_config'
    and coalesce(p_patch->'qr_config'->>'claim_mode','') is distinct from coalesce(v_event.qr_config->>'claim_mode','')
    and exists(select 1 from public.attendees where event_id=p_event_id) then
    raise exception 'claim_mode_locked_after_registration';
  end if;
  if v_event.status='draft' then
    update public.events set
      name=v_config->>'name',slug=v_config->>'slug',description=v_config->>'description',
      venue=v_config->>'venue',starts_at=(v_config->>'starts_at')::timestamptz,
      ends_at=(v_config->>'ends_at')::timestamptz,capacity=(v_config->>'capacity')::integer,
      theme=v_config->'theme',qr_config=v_config->'qr_config',
      hero_image_url=v_config->>'hero_image_url',logo_url=v_config->>'logo_url',
      poster_url=v_config->>'poster_url',updated_at=now() where id=p_event_id;
    return jsonb_build_object('draft',true,'revision',0);
  end if;
  insert into public.event_config_drafts(event_id,config)
    values(p_event_id,v_config)
  on conflict(event_id) do update set config=excluded.config,
    revision=public.event_config_drafts.revision+1,updated_at=now()
  returning revision into v_revision;
  return jsonb_build_object('draft',true,'revision',v_revision);
end;
$$;
revoke all on function public.stage_event_config(uuid,jsonb) from public, anon;
grant execute on function public.stage_event_config(uuid,jsonb) to authenticated;

create function public.transition_event(p_event_id uuid,p_action text,p_version integer default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_event public.events%rowtype; v_config jsonb; v_version integer; v_target public.event_status;
begin
  if auth.uid() is null or not public.is_event_manager(p_event_id) then raise exception 'not_authorized'; end if;
  select * into v_event from public.events where id=p_event_id for update;
  if not found then raise exception 'event_not_found'; end if;
  if p_action='publish' and v_event.status in ('draft','published') then
    select config into v_config from public.event_config_drafts where event_id=p_event_id;
    if v_event.status='draft' and v_config is null then v_config:=public.event_config(v_event); end if;
    if v_config is null then raise exception 'no_draft_changes'; end if;
  elsif p_action='restore' and v_event.status in ('draft','published') and p_version is not null then
    select config into v_config from public.event_publications where event_id=p_event_id and version=p_version;
    if v_config is null then raise exception 'version_not_found'; end if;
    if coalesce(v_config->'qr_config'->>'claim_mode','') is distinct from coalesce(v_event.qr_config->>'claim_mode','')
      and exists(select 1 from public.attendees where event_id=p_event_id) then raise exception 'claim_mode_locked_after_registration'; end if;
    insert into public.event_config_drafts(event_id,config) values(p_event_id,v_config)
    on conflict(event_id) do update set config=excluded.config,revision=public.event_config_drafts.revision+1,updated_at=now();
    return jsonb_build_object('status',v_event.status,'restoredDraftFrom',p_version);
  elsif p_action='archive' and v_event.status in ('draft','published') then
    v_target:='archived';
  elsif p_action='reopen' and v_event.status='archived' then
    v_target:='draft';
  else
    raise exception 'invalid_event_transition';
  end if;
  perform set_config('passflow.lifecycle','authorized',true);
  if p_action='publish' then
    if nullif(trim(v_config->>'name'),'') is null or nullif(trim(v_config->>'slug'),'') is null
      or nullif(trim(v_config->>'venue'),'') is null or v_config->>'starts_at' is null
      or v_config->>'ends_at' is null or (v_config->>'ends_at')::timestamptz <= (v_config->>'starts_at')::timestamptz
      or (v_config->>'capacity')::integer < 0 then raise exception 'incomplete_event_configuration'; end if;
    if not exists(select 1 from public.ticket_types where event_id=p_event_id) then raise exception 'ticket_required_to_publish'; end if;
    if (v_config->>'capacity')::integer is not null and
      (select count(*) from public.attendees where event_id=p_event_id) > (v_config->>'capacity')::integer then
      raise exception 'capacity_below_registration'; end if;
    if v_event.status='published' and coalesce(v_config->'qr_config'->>'claim_mode','') is distinct from coalesce(v_event.qr_config->>'claim_mode','')
      and exists(select 1 from public.attendees where event_id=p_event_id) then raise exception 'claim_mode_locked_after_registration'; end if;
    -- One transaction: readers see the old live row until this commits.
    if v_event.status='published' then update public.events set status='draft' where id=p_event_id; end if;
    update public.events set
      name=v_config->>'name',slug=v_config->>'slug',description=v_config->>'description',
      venue=v_config->>'venue',starts_at=(v_config->>'starts_at')::timestamptz,
      ends_at=(v_config->>'ends_at')::timestamptz,capacity=(v_config->>'capacity')::integer,
      theme=v_config->'theme',qr_config=v_config->'qr_config',
      hero_image_url=v_config->>'hero_image_url',logo_url=v_config->>'logo_url',
      poster_url=v_config->>'poster_url',updated_at=now() where id=p_event_id;
    v_version:=coalesce(v_event.published_version,0)+1;
    insert into public.event_publications(event_id,version,config,published_by) values(p_event_id,v_version,v_config,auth.uid());
    update public.events set status='published',published_version=v_version,published_at=now(),updated_at=now() where id=p_event_id;
    delete from public.event_config_drafts where event_id=p_event_id;
    return jsonb_build_object('status','published','version',v_version);
  end if;
  update public.events set status=v_target,updated_at=now() where id=p_event_id;
  return jsonb_build_object('status',v_target);
end;
$$;
revoke all on function public.transition_event(uuid,text,integer) from public, anon;
grant execute on function public.transition_event(uuid,text,integer) to authenticated;
