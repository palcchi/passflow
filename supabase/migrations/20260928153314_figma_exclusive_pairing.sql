-- A copied/re-paired document must not retain a grant that can write to its old event.
-- Serialize pairs by document identity, even when two distinct codes are redeemed at once.
create or replace function public.exchange_figma_pairing_code(p_code_hash text,p_token_hash text,p_document_id text,p_file_name text,p_file_key text,p_bucket text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_code public.figma_pairing_codes%rowtype; v_attempts integer; v_id uuid;
begin
  delete from public.figma_pairing_attempts where window_start<now()-interval '1 day';
  insert into public.figma_pairing_attempts(bucket,window_start,attempts) values(p_bucket,now(),1)
    on conflict(bucket) do update set attempts=case when figma_pairing_attempts.window_start<now()-interval '10 minutes' then 1 else figma_pairing_attempts.attempts+1 end,
    window_start=case when figma_pairing_attempts.window_start<now()-interval '10 minutes' then now() else figma_pairing_attempts.window_start end returning attempts into v_attempts;
  if v_attempts>10 then return jsonb_build_object('error','rate_limited'); end if;
  select * into v_code from public.figma_pairing_codes where code_hash=p_code_hash and consumed_at is null and expires_at>now() for update;
  if not found then return jsonb_build_object('error','invalid_pairing_code'); end if;
  if not exists(select 1 from public.events e join public.organization_members m on m.organization_id=e.organization_id where e.id=v_code.event_id and m.user_id=v_code.created_by and m.role in ('owner','admin')) then
    return jsonb_build_object('error','permission_revoked');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_document_id,0));
  update public.figma_plugin_links set revoked_at=now()
    where document_id=p_document_id and revoked_at is null;
  insert into public.figma_plugin_links(event_id,created_by,document_id,file_name,file_key,token_hash)
    values(v_code.event_id,v_code.created_by,p_document_id,p_file_name,p_file_key,p_token_hash) returning id into v_id;
  update public.figma_pairing_codes set consumed_at=now() where code_hash=p_code_hash;
  return jsonb_build_object('id',v_id,'eventId',v_code.event_id,'eventName',(select name from public.events where id=v_code.event_id),'revision',0);
end;
$$;
