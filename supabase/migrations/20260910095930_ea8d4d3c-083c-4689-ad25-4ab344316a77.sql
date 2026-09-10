create or replace function private.is_message_sender(_message_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.messages m
    where m.id = _message_id and m.sender_id = _user_id
  )
$$;

revoke all on function private.is_message_sender(uuid, uuid) from public, anon;
grant execute on function private.is_message_sender(uuid, uuid) to authenticated;

drop policy if exists "read own audit or admin all" on public.audit_events;
create policy "read own audit, own files, or admin"
on public.audit_events
for select
to authenticated
using (
  auth.uid() = actor_id
  or public.has_role(auth.uid(), 'admin'::app_role)
  or (message_id is not null and private.is_message_sender(message_id, auth.uid()))
);