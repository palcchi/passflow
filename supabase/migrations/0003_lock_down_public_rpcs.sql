-- RPCs that mutate event access require a signed-in user. Keep authenticated
-- execution for server actions while removing anonymous REST execution.
revoke execute on function public.claim_qr(text, text) from anon;
revoke execute on function public.register_for_event(text, text, text, text) from anon;
revoke execute on function public.replace_qr(text, text) from anon;
revoke execute on function public.validate_scan(uuid, text) from anon;
revoke execute on function public.is_event_manager(uuid) from anon;
revoke execute on function public.is_event_member(uuid) from anon;
revoke execute on function public.is_org_manager(uuid) from anon;
revoke execute on function public.is_org_member(uuid) from anon;
