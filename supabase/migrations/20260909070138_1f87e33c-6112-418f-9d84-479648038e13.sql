
alter table public.messages
  add column if not exists allow_forward boolean not null default false,
  add column if not exists forwarded_from uuid references public.messages(id),
  add column if not exists mentions uuid[] not null default '{}'::uuid[];

-- Only admins may create group conversations; anyone may start a direct one.
drop policy if exists "users create conversations" on public.conversations;
create policy "users create conversations"
on public.conversations for insert to authenticated
with check (
  auth.uid() = created_by
  and (kind = 'direct'::public.conversation_kind or public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- Admins can add members to any conversation (needed to build groups).
drop policy if exists "creator or member adds membership" on public.conversation_members;
create policy "creator or member adds membership"
on public.conversation_members for insert to authenticated
with check (
  public.is_member(conversation_id, auth.uid())
  or public.has_role(auth.uid(), 'admin'::public.app_role)
  or exists (
    select 1 from public.conversations c
    where c.id = conversation_members.conversation_id and c.created_by = auth.uid()
  )
);

-- Admins can read membership rows (to manage groups).
drop policy if exists "members read membership" on public.conversation_members;
create policy "members read membership"
on public.conversation_members for select to authenticated
using (
  public.is_member(conversation_id, auth.uid())
  or public.has_role(auth.uid(), 'admin'::public.app_role)
);

drop policy if exists "members read conversations" on public.conversations;
create policy "members read conversations"
on public.conversations for select to authenticated
using (
  public.is_member(id, auth.uid())
  or public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Secure forwarding: only if the source message allows sharing and the caller
-- is a member of both the source and the target conversation.
create or replace function public.forward_message(_message_id uuid, _target_conversation_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare m public.messages; new_id uuid;
begin
  select * into m from public.messages where id = _message_id;
  if m.id is null then raise exception 'not_found'; end if;
  if not public.is_member(m.conversation_id, auth.uid()) then raise exception 'forbidden'; end if;
  if not public.is_member(_target_conversation_id, auth.uid()) then raise exception 'forbidden'; end if;
  if m.revoked or not m.allow_forward then raise exception 'not_allowed'; end if;
  if m.expires_at is not null and m.expires_at <= now() then raise exception 'expired'; end if;

  insert into public.messages (
    conversation_id, sender_id, text, attachment, expires_at, allow_download,
    allow_copy, block_screenshot, watermark, expires_in_min, max_opens,
    allow_forward, forwarded_from
  ) values (
    _target_conversation_id, auth.uid(), m.text, m.attachment,
    case when m.expires_in_min > 0 then now() + make_interval(mins => m.expires_in_min) else null end,
    m.allow_download, m.allow_copy, m.block_screenshot, m.watermark,
    m.expires_in_min, m.max_opens, m.allow_forward, m.id
  ) returning id into new_id;

  return new_id;
end; $$;

revoke all on function public.forward_message(uuid, uuid) from public, anon;
grant execute on function public.forward_message(uuid, uuid) to authenticated;

-- Find a colleague by email to start a private conversation.
create or replace function public.find_profile_by_email(_email text)
returns table(id uuid, name text, email text, title text, disabled boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, p.name, p.email, p.title, p.disabled
  from public.profiles p
  where lower(p.email) = lower(trim(_email))
  limit 1
$$;

revoke all on function public.find_profile_by_email(text) from public, anon;
grant execute on function public.find_profile_by_email(text) to authenticated;
