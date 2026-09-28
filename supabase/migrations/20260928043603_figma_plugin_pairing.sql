-- Pairing secrets are hashed; only the server can exchange codes or sync drafts.
create table public.figma_pairing_codes (
  code_hash text primary key check(code_hash ~ '^[a-f0-9]{64}$'),
  event_id uuid not null references public.events(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '10 minutes',
  consumed_at timestamptz
);
create index figma_pairing_owner_idx on public.figma_pairing_codes(created_by,created_at);
create index figma_pairing_event_idx on public.figma_pairing_codes(event_id);
create table public.figma_plugin_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  document_id text not null check(length(document_id) between 8 and 100),
  file_name text not null check(length(file_name) between 1 and 150),
  file_key text check(file_key is null or file_key ~ '^[a-zA-Z0-9]{10,100}$'),
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  draft_id uuid references public.event_studio_documents(id) on delete set null,
  payload_hash text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '30 days',
  revoked_at timestamptz,
  last_synced_at timestamptz,
  external_change_at timestamptz
);
create index figma_plugin_event_idx on public.figma_plugin_links(event_id);
create index figma_plugin_owner_idx on public.figma_plugin_links(created_by);
create index figma_plugin_draft_idx on public.figma_plugin_links(draft_id);
create index figma_plugin_file_idx on public.figma_plugin_links(file_key) where file_key is not null;
create table public.figma_pairing_attempts (
  bucket text primary key, window_start timestamptz not null, attempts integer not null
);
alter table public.figma_pairing_codes enable row level security;
alter table public.figma_plugin_links enable row level security;
alter table public.figma_pairing_attempts enable row level security;
revoke all on public.figma_pairing_codes,public.figma_plugin_links,public.figma_pairing_attempts from anon,authenticated;
grant all on public.figma_pairing_codes,public.figma_plugin_links,public.figma_pairing_attempts to service_role;
grant select on public.events,public.organization_members to service_role;
grant select,insert,update on public.event_studio_documents to service_role;
grant select(id,event_id,document_id,file_name,file_key,draft_id,created_at,expires_at,revoked_at,last_synced_at,external_change_at) on public.figma_plugin_links to authenticated;
grant update(revoked_at) on public.figma_plugin_links to authenticated;
create policy figma_links_manager_read on public.figma_plugin_links for select to authenticated using(public.is_event_manager(event_id));
create policy figma_links_manager_revoke on public.figma_plugin_links for update to authenticated using(public.is_event_manager(event_id)) with check(public.is_event_manager(event_id) and revoked_at is not null);

create function public.create_figma_pairing_code(p_event_id uuid,p_code_hash text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.is_event_manager(p_event_id) then raise exception 'not_authorized' using errcode='42501'; end if;
  perform id from public.events where id=p_event_id for update;
  if (select count(*) from public.figma_pairing_codes where event_id=p_event_id and created_at>now()-interval '10 minutes')>=5 then raise exception 'rate_limited'; end if;
  delete from public.figma_pairing_codes where event_id=p_event_id and expires_at<now()-interval '1 day';
  update public.figma_pairing_codes set consumed_at=now() where event_id=p_event_id and consumed_at is null;
  insert into public.figma_pairing_codes(code_hash,event_id,created_by) values(p_code_hash,p_event_id,auth.uid());
end;
$$;
revoke all on function public.create_figma_pairing_code(uuid,text) from public,anon;
grant execute on function public.create_figma_pairing_code(uuid,text) to authenticated;

-- Invoker functions are service-role-only: the browser never receives the server key.
create function public.exchange_figma_pairing_code(p_code_hash text,p_token_hash text,p_document_id text,p_file_name text,p_file_key text,p_bucket text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_code public.figma_pairing_codes%rowtype; v_attempts integer; v_id uuid;
begin
  delete from public.figma_pairing_attempts where window_start<now()-interval '1 day';
  insert into public.figma_pairing_attempts(bucket,window_start,attempts) values(p_bucket,now(),1)
    on conflict(bucket) do update set attempts=case when figma_pairing_attempts.window_start<now()-interval '10 minutes' then 1 else figma_pairing_attempts.attempts+1 end,
    window_start=case when figma_pairing_attempts.window_start<now()-interval '10 minutes' then now() else figma_pairing_attempts.window_start end returning attempts into v_attempts;
  -- Return failures, not exceptions, so failed attempts commit their rate-limit count.
  if v_attempts>10 then return jsonb_build_object('error','rate_limited'); end if;
  select * into v_code from public.figma_pairing_codes where code_hash=p_code_hash and consumed_at is null and expires_at>now() for update;
  if not found then return jsonb_build_object('error','invalid_pairing_code'); end if;
  if not exists(select 1 from public.events e join public.organization_members m on m.organization_id=e.organization_id where e.id=v_code.event_id and m.user_id=v_code.created_by and m.role in ('owner','admin')) then
    return jsonb_build_object('error','permission_revoked');
  end if;
  insert into public.figma_plugin_links(event_id,created_by,document_id,file_name,file_key,token_hash)
    values(v_code.event_id,v_code.created_by,p_document_id,p_file_name,p_file_key,p_token_hash) returning id into v_id;
  update public.figma_pairing_codes set consumed_at=now() where code_hash=p_code_hash;
  return jsonb_build_object('id',v_id,'eventId',v_code.event_id,'eventName',(select name from public.events where id=v_code.event_id),'revision',0);
end;
$$;

create function public.figma_plugin_draft(p_token_hash text,p_document_id text,p_revision integer,p_document jsonb default null,p_payload_hash text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_link public.figma_plugin_links%rowtype; v_draft public.event_studio_documents%rowtype; v_id uuid; v_revision integer;
begin
  select * into v_link from public.figma_plugin_links where token_hash=p_token_hash and document_id=p_document_id and revoked_at is null and expires_at>now() for update;
  if not found then return jsonb_build_object('error','connection_expired'); end if;
  if not exists(select 1 from public.events e join public.organization_members m on m.organization_id=e.organization_id where e.id=v_link.event_id and m.user_id=v_link.created_by and m.role in ('owner','admin')) then
    return jsonb_build_object('error','permission_revoked');
  end if;
  select * into v_draft from public.event_studio_documents where id=v_link.draft_id for update;
  if p_document is null then
    return jsonb_build_object('id',v_link.id,'eventId',v_link.event_id,'eventName',(select name from public.events where id=v_link.event_id),'revision',coalesce(v_draft.revision,0),'draftId',v_link.draft_id,'status',v_draft.status,'expiresAt',v_link.expires_at);
  end if;
  if octet_length(p_document::text)>900000 or p_document->>'schema' is distinct from '2' or p_document->>'source' is distinct from 'figma' then return jsonb_build_object('error','invalid_document'); end if;
  if v_draft.status='draft' and p_payload_hash=v_link.payload_hash then
    return jsonb_build_object('draftId',v_draft.id,'revision',v_draft.revision);
  end if;
  if v_draft.status='draft' then
    if p_revision is distinct from v_draft.revision then return jsonb_build_object('error','revision_conflict'); end if;
    update public.event_studio_documents set document=p_document,revision=revision+1,updated_at=now() where id=v_draft.id returning id,revision into v_id,v_revision;
  else
    insert into public.event_studio_documents(event_id,kind,name,document,created_by)
      values(v_link.event_id,'website',left(v_link.file_name,100),p_document,v_link.created_by) returning id,revision into v_id,v_revision;
  end if;
  update public.figma_plugin_links set draft_id=v_id,payload_hash=p_payload_hash,last_synced_at=now(),external_change_at=null where id=v_link.id;
  return jsonb_build_object('draftId',v_id,'revision',v_revision);
end;
$$;
revoke all on function public.exchange_figma_pairing_code(text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.figma_plugin_draft(text,text,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.exchange_figma_pairing_code(text,text,text,text,text,text),public.figma_plugin_draft(text,text,integer,jsonb,text) to service_role;

-- Webhooks only mark a potential offline change, never sync or publish content.
create function public.mark_figma_external_change(p_file_key text,p_at timestamptz)
returns void language sql security invoker set search_path='' as $$
 update public.figma_plugin_links set external_change_at=p_at
 where file_key=p_file_key and revoked_at is null and expires_at>now()
 and p_at<=now()+interval '5 minutes' and p_at>now()-interval '7 days'
 and (last_synced_at is null or last_synced_at<p_at)
 and (external_change_at is null or external_change_at<p_at)
$$;
revoke all on function public.mark_figma_external_change(text,timestamptz) from public,anon,authenticated;
grant execute on function public.mark_figma_external_change(text,timestamptz) to service_role;
