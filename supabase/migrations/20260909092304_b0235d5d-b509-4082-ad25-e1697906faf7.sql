REVOKE EXECUTE ON FUNCTION public.can_browse_directory(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.shares_conversation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_browse_directory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_conversation(uuid, uuid) TO authenticated;