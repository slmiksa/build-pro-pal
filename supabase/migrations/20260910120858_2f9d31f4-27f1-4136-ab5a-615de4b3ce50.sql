ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path text;

-- avatars bucket policies
CREATE POLICY "users manage own avatar" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "members read avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE OR REPLACE FUNCTION public.admin_delete_member(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;
  if _user_id = auth.uid() then
    raise exception 'cannot_delete_self';
  end if;

  delete from public.conversation_members where user_id = _user_id;
  delete from public.message_reads where user_id = _user_id;
  delete from public.user_roles where user_id = _user_id;
  delete from public.profiles where id = _user_id;
  delete from auth.users where id = _user_id;

  return true;
end;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_member(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_member(uuid) TO authenticated;