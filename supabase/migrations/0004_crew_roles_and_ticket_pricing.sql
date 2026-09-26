alter table public.ticket_types add column if not exists price numeric(12,2) not null default 0 check (price >= 0);
alter table public.ticket_types add column if not exists currency text not null default 'IDR';
alter table public.organizations add column if not exists plan text not null default 'free';
alter table public.organizations add column if not exists plan_event_limit integer not null default 3;

create table if not exists public.event_members (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_title text not null default 'Crew',
  access_role text not null default 'crew' check (access_role in ('crew','lead','scanner')),
  status text not null default 'active' check (status in ('invited','active','revoked')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists event_members_user_id_idx on public.event_members(user_id);

create table if not exists public.event_invitations (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  token text not null unique, job_title text not null default 'Crew',
  access_role text not null default 'crew' check (access_role in ('crew','lead','scanner')),
  invited_email text, expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz, accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists event_invitations_event_id_idx on public.event_invitations(event_id);
alter table public.event_members enable row level security;
alter table public.event_invitations enable row level security;
grant select on public.event_members to authenticated;
grant select on public.event_invitations to anon, authenticated;
drop policy if exists "members read own event crew" on public.event_members;
create policy "members read own event crew" on public.event_members for select to authenticated using (user_id = auth.uid() or public.is_event_manager(event_id));
drop policy if exists "managers manage event crew" on public.event_members;
create policy "managers manage event crew" on public.event_members for all to authenticated using (public.is_event_manager(event_id)) with check (public.is_event_manager(event_id));
drop policy if exists "public read valid invitations" on public.event_invitations;
create policy "public read valid invitations" on public.event_invitations for select to anon, authenticated using (accepted_at is null and expires_at > now());
drop policy if exists "managers manage invitations" on public.event_invitations;
create policy "managers manage invitations" on public.event_invitations for all to authenticated using (public.is_event_manager(event_id)) with check (public.is_event_manager(event_id));

create or replace function public.accept_event_invitation(p_token text) returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare v_user uuid := auth.uid(); v_inv public.event_invitations%rowtype; v_event public.events%rowtype;
begin
 if v_user is null then return jsonb_build_object('ok',false,'reason','unauthenticated'); end if;
 select * into v_inv from public.event_invitations where token = p_token and accepted_at is null and expires_at > now() for update;
 if not found then return jsonb_build_object('ok',false,'reason','invalid_invitation'); end if;
 select * into v_event from public.events where id = v_inv.event_id;
 if v_inv.invited_email is not null and lower(v_inv.invited_email) <> lower((select email from auth.users where id=v_user)) then return jsonb_build_object('ok',false,'reason','email_mismatch'); end if;
 insert into public.event_members(event_id,user_id,job_title,access_role,status) values(v_inv.event_id,v_user,v_inv.job_title,v_inv.access_role,'active') on conflict(event_id,user_id) do update set job_title=excluded.job_title,access_role=excluded.access_role,status='active';
 update public.event_invitations set accepted_at=now(),accepted_by=v_user where id=v_inv.id;
 return jsonb_build_object('ok',true,'event_id',v_event.id,'event_slug',v_event.slug,'job_title',v_inv.job_title);
end; $$;
revoke all on function public.accept_event_invitation(text) from public;
grant execute on function public.accept_event_invitation(text) to authenticated;
