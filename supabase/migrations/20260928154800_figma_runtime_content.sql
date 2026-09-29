-- Structured organizer content is separate from Figma's visual document.
create table public.event_website_content (
  event_id uuid primary key references public.events(id) on delete cascade,
  content jsonb not null default '{}'::jsonb check(jsonb_typeof(content)='object' and octet_length(content::text)<20000),
  updated_at timestamptz not null default now()
);
alter table public.event_website_content enable row level security;
grant select on public.event_website_content to anon,authenticated;
grant insert,update on public.event_website_content to authenticated;
create policy website_content_read on public.event_website_content for select to anon,authenticated
  using(public.is_event_manager(event_id) or exists(select 1 from public.events e where e.id=event_id and e.status='published'));
create policy website_content_insert on public.event_website_content for insert to authenticated with check(public.is_event_manager(event_id));
create policy website_content_update on public.event_website_content for update to authenticated
  using(public.is_event_manager(event_id)) with check(public.is_event_manager(event_id));

-- A published design remains an immutable snapshot; its number and publication time survive archival.
alter table public.event_studio_documents add column published_at timestamptz;
alter table public.event_studio_documents add column publication_number integer;
update public.event_studio_documents set published_at=updated_at,publication_number=1 where status='published';
create unique index studio_publication_number on public.event_studio_documents(event_id,kind,coalesce(ticket_type_id,'00000000-0000-0000-0000-000000000000'::uuid),publication_number) where publication_number is not null;

create or replace function public.publish_studio_document(p_event_id uuid,p_id uuid,p_revision integer)
returns void language plpgsql security definer set search_path='' as $$
declare v_doc public.event_studio_documents%rowtype; v_number integer;
begin
  if auth.uid() is null or not public.is_event_manager(p_event_id) then raise exception 'not_authorized' using errcode='42501'; end if;
  perform id from public.events where id=p_event_id for update;
  select * into v_doc from public.event_studio_documents where id=p_id and event_id=p_event_id for update;
  if not found or v_doc.status <> 'draft' or v_doc.revision<>p_revision then raise exception 'revision_conflict'; end if;
  select coalesce(max(publication_number),0)+1 into v_number from public.event_studio_documents
    where event_id=p_event_id and kind=v_doc.kind and ticket_type_id is not distinct from v_doc.ticket_type_id;
  update public.event_studio_documents set status='archived',updated_at=now()
    where event_id=p_event_id and kind=v_doc.kind and ticket_type_id is not distinct from v_doc.ticket_type_id and status='published';
  update public.event_studio_documents set status='published',revision=revision+1,publication_number=v_number,published_at=now(),updated_at=now() where id=p_id;
end;
$$;
revoke all on function public.publish_studio_document(uuid,uuid,integer) from public,anon;
grant execute on function public.publish_studio_document(uuid,uuid,integer) to authenticated;

-- Draft sync accepts both old flat documents and nested version 3. Only explicit publish changes the live row.
create or replace function public.figma_plugin_draft(p_token_hash text,p_document_id text,p_revision integer,p_document jsonb default null,p_payload_hash text default null)
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
  if octet_length(p_document::text)>900000 or coalesce(p_document->>'schema','') not in ('2','3') or p_document->>'source' is distinct from 'figma' then return jsonb_build_object('error','invalid_document'); end if;
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
revoke all on function public.figma_plugin_draft(text,text,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.figma_plugin_draft(text,text,integer,jsonb,text) to service_role;
