REVOKE EXECUTE ON FUNCTION public.can_browse_directory(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.shares_conversation(uuid, uuid) FROM anon, authenticated, public;