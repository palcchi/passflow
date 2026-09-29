-- Copy an archived or published design into a fresh draft. The live snapshot remains unchanged.
create or replace function public.restore_figma_publication(p_event_id uuid,p_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_old public.event_studio_documents%rowtype; v_id uuid;
begin
 if auth.uid() is null or not public.is_event_manager(p_event_id) then raise exception 'not_authorized' using errcode='42501'; end if;
 select * into v_old from public.event_studio_documents where id=p_id and event_id=p_event_id and kind='website' and document->>'source'='figma' and status in ('published','archived') for update;
 if not found then raise exception 'version_unavailable'; end if;
 insert into public.event_studio_documents(event_id,kind,name,document,created_by)
 values(p_event_id,'website',v_old.name||' · restored',v_old.document,auth.uid()) returning id into v_id;
 return v_id;
end;
$$;
revoke all on function public.restore_figma_publication(uuid,uuid) from public,anon;
grant execute on function public.restore_figma_publication(uuid,uuid) to authenticated;
