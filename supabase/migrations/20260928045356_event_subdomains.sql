-- One application, one reserved hostname per event. No DNS mutations here.
create function public.valid_event_subdomain(p_label text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(length(p_label) between 3 and 63 and p_label ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' and p_label not like 'xn--%' and p_label <> all(array['www','admin','api','app','login','auth','support','mail','smtp','imap','pop','static','assets','cdn','status','help','docs','blog','dev','test','staging','preview','vercel','dashboard','account','accounts','register','billing','security','webhooks','figma','passflow','ns1','ns2']),false)
$$;
create table public.event_subdomains(
 event_id uuid primary key references public.events(id) on delete cascade,
 label text not null unique check(public.valid_event_subdomain(label)),
 updated_at timestamptz not null default now()
);
alter table public.event_subdomains enable row level security;
revoke all on public.event_subdomains from anon,authenticated;
grant select on public.event_subdomains to authenticated;
create policy subdomain_manager_read on public.event_subdomains for select to authenticated using(public.is_event_manager(event_id));

create function public.check_event_subdomain(p_event_id uuid,p_label text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_event_manager(p_event_id) then raise exception 'not_authorized' using errcode='42501'; end if;
 return public.valid_event_subdomain(p_label) and not exists(select 1 from public.event_subdomains where label=p_label and event_id<>p_event_id);
end;$$;
create function public.save_event_subdomain(p_event_id uuid,p_label text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_event_manager(p_event_id) then raise exception 'not_authorized' using errcode='42501'; end if;
 if not public.valid_event_subdomain(p_label) then raise exception 'invalid_subdomain'; end if;
 insert into public.event_subdomains(event_id,label) values(p_event_id,p_label)
 on conflict(event_id) do update set label=excluded.label,updated_at=now();
end;$$;
create function public.resolve_event_subdomain(p_label text) returns text language sql stable security definer set search_path='' as $$
 select e.slug from public.event_subdomains d join public.events e on e.id=d.event_id where d.label=p_label and e.status='published'
$$;
revoke all on function public.check_event_subdomain(uuid,text),public.save_event_subdomain(uuid,text) from public,anon;
grant execute on function public.check_event_subdomain(uuid,text),public.save_event_subdomain(uuid,text) to authenticated;
revoke all on function public.resolve_event_subdomain(text) from public;
grant execute on function public.resolve_event_subdomain(text) to anon,authenticated;
