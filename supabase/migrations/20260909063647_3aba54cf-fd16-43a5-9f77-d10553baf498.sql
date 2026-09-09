grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_member(uuid, uuid) to authenticated;

create policy "members read conversation files" on storage.objects
  for select to authenticated using (
    bucket_id = 'attachments'
    and public.is_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "members upload conversation files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'attachments'
    and public.is_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );