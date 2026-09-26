begin;
do $$
declare org uuid; uid uuid; ev uuid; att uuid; ticket uuid;
begin
 select organization_id,user_id into org,uid from public.organization_members where role='owner' limit 1;
 if uid is null then raise exception 'test_owner_missing'; end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 insert into public.events(organization_id,name,slug,created_by) values(org,'Rollback verification','rollback-'||gen_random_uuid(),uid) returning id into ev;
 insert into public.ticket_types(event_id,name,code) values(ev,'Test','TEST') returning id into ticket;
 insert into public.attendees(event_id,ticket_type_id,name,attendee_code) values(ev,ticket,'Test','TEST') returning id into att;
 perform set_config('test.event_id',ev::text,true);
 perform set_config('test.attendee_id',att::text,true);
 perform set_config('test.ticket_id',ticket::text,true);
end $$;
set local role authenticated;
do $$
declare ev uuid:=current_setting('test.event_id')::uuid; att uuid:=current_setting('test.attendee_id')::uuid; ticket uuid:=current_setting('test.ticket_id')::uuid;
begin
 begin
  perform public.delete_event_person_record(ev,ticket,'ticket');
  raise exception 'test_failed_used_ticket_deleted';
 exception when others then if sqlerrm <> 'record_in_use' then raise; end if;
 end;
 perform public.delete_event_person_record(ev,att,'attendee');
 if exists(select 1 from public.attendees where id=att) then raise exception 'test_failed_attendee_remains'; end if;
 if not exists(select 1 from public.qr_credentials where event_id=ev and attendee_id is null and status='revoked') then raise exception 'test_failed_qr_not_revoked'; end if;
 perform public.delete_event_person_record(ev,ticket,'ticket');
 if exists(select 1 from public.ticket_types where id=ticket) then raise exception 'test_failed_ticket_remains'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin
  perform public.delete_event_person_record(ev,att,'attendee');
  raise exception 'test_failed_foreign_user_allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;
