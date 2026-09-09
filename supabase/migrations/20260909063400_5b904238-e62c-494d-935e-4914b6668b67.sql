-- ===== enums =====
create type public.app_role as enum ('admin','manager');
create type public.conversation_kind as enum ('direct','group');

-- ===== shared trigger fn =====
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  title text not null default 'مدير',
  color text not null default 'oklch(0.72 0.12 190)',
  online boolean not null default false,
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ===== user_roles =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ===== conversations =====
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null default 'direct',
  name text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default 'epoch'::timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
grant select, insert, update, delete on public.conversation_members to authenticated;
grant all on public.conversation_members to service_role;
alter table public.conversation_members enable row level security;

create or replace function public.is_member(_conversation_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = _conversation_id and user_id = _user_id
  )
$$;

-- ===== messages =====
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  text text,
  attachment jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked boolean not null default false,
  opens integer not null default 0,
  allow_download boolean not null default false,
  allow_copy boolean not null default false,
  block_screenshot boolean not null default true,
  watermark boolean not null default true,
  expires_in_min integer not null default 0,
  max_opens integer not null default 0
);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;

create table public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
grant select, insert on public.message_reads to authenticated;
grant all on public.message_reads to service_role;
alter table public.message_reads enable row level security;

-- ===== audit =====
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  actor_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  detail text not null default ''
);
create index audit_events_at_idx on public.audit_events (at desc);
grant select, insert on public.audit_events to authenticated;
grant all on public.audit_events to service_role;
alter table public.audit_events enable row level security;

-- ===== invites =====
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  email text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours',
  used boolean not null default false
);
grant select, insert, update, delete on public.invites to authenticated;
grant all on public.invites to service_role;
alter table public.invites enable row level security;

-- ===== policies =====
create policy "profiles readable by signed-in users" on public.profiles
  for select to authenticated using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "admins update any profile" on public.profiles
  for update to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create policy "users read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create policy "members read conversations" on public.conversations
  for select to authenticated using (public.is_member(id, auth.uid()));
create policy "users create conversations" on public.conversations
  for insert to authenticated with check (auth.uid() = created_by);
create policy "members update conversations" on public.conversations
  for update to authenticated using (public.is_member(id, auth.uid()))
  with check (public.is_member(id, auth.uid()));

create policy "members read membership" on public.conversation_members
  for select to authenticated using (public.is_member(conversation_id, auth.uid()));
create policy "creator or member adds membership" on public.conversation_members
  for insert to authenticated with check (
    public.is_member(conversation_id, auth.uid())
    or exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid())
  );
create policy "users update own membership" on public.conversation_members
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "members read live messages" on public.messages
  for select to authenticated using (
    public.is_member(conversation_id, auth.uid())
    and (expires_at is null or expires_at > now())
  );
create policy "members send messages" on public.messages
  for insert to authenticated with check (
    auth.uid() = sender_id and public.is_member(conversation_id, auth.uid())
  );
create policy "sender revokes own message" on public.messages
  for update to authenticated using (auth.uid() = sender_id) with check (auth.uid() = sender_id);

create policy "members read reads" on public.message_reads
  for select to authenticated using (
    exists (select 1 from public.messages m where m.id = message_id and public.is_member(m.conversation_id, auth.uid()))
  );
create policy "users mark own read" on public.message_reads
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (select 1 from public.messages m where m.id = message_id and public.is_member(m.conversation_id, auth.uid()))
  );

create policy "users write own audit" on public.audit_events
  for insert to authenticated with check (auth.uid() = actor_id);
create policy "read own audit or admin all" on public.audit_events
  for select to authenticated using (auth.uid() = actor_id or public.has_role(auth.uid(),'admin'));

create policy "admins manage invites" on public.invites
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- ===== new user handling =====
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;

  insert into public.profiles (id, name, email, title)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)),
    coalesce(new.email,''),
    coalesce(nullif(new.raw_user_meta_data->>'title',''), 'مدير')
  );

  insert into public.user_roles (user_id, role)
  values (new.id, case when first_user then 'admin'::public.app_role else 'manager'::public.app_role end)
  on conflict do nothing;

  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();
create trigger conversations_updated_at before update on public.conversations
  for each row execute function public.update_updated_at_column();

-- ===== secure RPCs =====
-- open counter that any conversation member may increment
create or replace function public.register_message_open(_message_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare m public.messages;
begin
  select * into m from public.messages where id = _message_id;
  if m.id is null then return 'limit'; end if;
  if not public.is_member(m.conversation_id, auth.uid()) then return 'limit'; end if;
  if m.max_opens > 0 and m.opens >= m.max_opens then return 'limit'; end if;
  update public.messages set opens = opens + 1 where id = _message_id;
  return 'ok';
end; $$;
revoke all on function public.register_message_open(uuid) from public, anon;
grant execute on function public.register_message_open(uuid) to authenticated;

-- invite lookup for signed-out visitors: returns status only, no member data
create or replace function public.check_invite(_code text)
returns table (email text, expires_at timestamptz, used boolean)
language sql stable security definer set search_path = public as $$
  select i.email, i.expires_at, i.used from public.invites i
  where lower(i.code) = lower(_code)
$$;
grant execute on function public.check_invite(text) to anon, authenticated;

create or replace function public.consume_invite(_code text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.invites set used = true
  where lower(code) = lower(_code) and used = false and expires_at > now();
  return found;
end; $$;
grant execute on function public.consume_invite(text) to authenticated;

-- realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.audit_events;