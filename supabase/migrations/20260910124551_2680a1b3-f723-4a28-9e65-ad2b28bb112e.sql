-- 1. conversation extras
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS avatar_path text,
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- 2. per-conversation roles
DO $$ BEGIN
  CREATE TYPE public.conv_role AS ENUM ('owner','moderator','member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS role public.conv_role NOT NULL DEFAULT 'member';

UPDATE public.conversation_members cm
   SET role = 'owner'
  FROM public.conversations c
 WHERE c.id = cm.conversation_id
   AND c.created_by = cm.user_id
   AND cm.role <> 'owner';

-- 3. helpers
CREATE OR REPLACE FUNCTION public.conv_role_of(_conversation_id uuid, _user_id uuid)
RETURNS public.conv_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.conversation_members
   WHERE conversation_id = _conversation_id AND user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.can_manage_conversation(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
     WHERE conversation_id = _conversation_id
       AND user_id = _user_id
       AND role IN ('owner','moderator')
  )
$$;

REVOKE ALL ON FUNCTION public.conv_role_of(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_conversation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conv_role_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_conversation(uuid, uuid) TO authenticated;

-- 4. conversation update restricted to managers (direct chats: both sides manage)
DROP POLICY IF EXISTS "members update conversations" ON public.conversations;
CREATE POLICY "managers update conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (
  public.can_manage_conversation(id, auth.uid())
  OR (kind = 'direct' AND public.is_member(id, auth.uid()))
)
WITH CHECK (
  public.can_manage_conversation(id, auth.uid())
  OR (kind = 'direct' AND public.is_member(id, auth.uid()))
);

-- 5. locked groups: only owner/moderator can post
DROP POLICY IF EXISTS "members send messages" ON public.messages;
CREATE POLICY "members send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_member(conversation_id, auth.uid())
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.conversations c
       WHERE c.id = conversation_id AND c.locked
    )
    OR public.can_manage_conversation(conversation_id, auth.uid())
  )
);

-- 6. membership management
DROP POLICY IF EXISTS "creator or member adds membership" ON public.conversation_members;
CREATE POLICY "creator or manager adds membership"
ON public.conversation_members FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_conversation(conversation_id, auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.conversations c
     WHERE c.id = conversation_id AND c.created_by = auth.uid()
  )
  OR (
    EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.kind = 'direct')
    AND public.is_member(conversation_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "managers update membership roles" ON public.conversation_members;
CREATE POLICY "managers update membership roles"
ON public.conversation_members FOR UPDATE TO authenticated
USING (public.can_manage_conversation(conversation_id, auth.uid()))
WITH CHECK (public.can_manage_conversation(conversation_id, auth.uid()));

-- 7. leave / remove / delete
CREATE OR REPLACE FUNCTION public.remove_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _user_id = auth.uid() THEN
    IF public.conv_role_of(_conversation_id, auth.uid()) = 'owner' THEN
      RAISE EXCEPTION 'owner_cannot_leave';
    END IF;
  ELSE
    IF NOT public.can_manage_conversation(_conversation_id, auth.uid()) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    IF public.conv_role_of(_conversation_id, _user_id) = 'owner' THEN
      RAISE EXCEPTION 'cannot_remove_owner';
    END IF;
  END IF;

  DELETE FROM public.conversation_members
   WHERE conversation_id = _conversation_id AND user_id = _user_id;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_conversation(_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE k public.conversation_kind;
BEGIN
  SELECT kind INTO k FROM public.conversations WHERE id = _conversation_id;
  IF k IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;

  IF k = 'direct' THEN
    IF NOT public.is_member(_conversation_id, auth.uid()) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  ELSE
    IF public.conv_role_of(_conversation_id, auth.uid()) <> 'owner'
       AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  UPDATE public.conversations SET pinned_message_id = NULL WHERE id = _conversation_id;
  DELETE FROM public.message_reads mr
   USING public.messages m
   WHERE mr.message_id = m.id AND m.conversation_id = _conversation_id;
  DELETE FROM public.audit_events WHERE conversation_id = _conversation_id;
  UPDATE public.messages SET forwarded_from = NULL
   WHERE forwarded_from IN (SELECT id FROM public.messages WHERE conversation_id = _conversation_id);
  DELETE FROM public.messages WHERE conversation_id = _conversation_id;
  DELETE FROM public.conversation_members WHERE conversation_id = _conversation_id;
  DELETE FROM public.conversations WHERE id = _conversation_id;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.set_conversation_member_role(_conversation_id uuid, _user_id uuid, _role public.conv_role)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.conv_role_of(_conversation_id, auth.uid()) <> 'owner' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _role = 'owner' THEN RAISE EXCEPTION 'invalid_role'; END IF;
  IF public.conv_role_of(_conversation_id, _user_id) = 'owner' THEN
    RAISE EXCEPTION 'cannot_change_owner';
  END IF;
  UPDATE public.conversation_members SET role = _role
   WHERE conversation_id = _conversation_id AND user_id = _user_id;
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.remove_conversation_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_conversation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_conversation_member_role(uuid, uuid, public.conv_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_conversation_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_conversation_member_role(uuid, uuid, public.conv_role) TO authenticated;

-- 8. group avatars in the private avatars bucket under group/<conversation_id>/...
DROP POLICY IF EXISTS "group managers write group avatars" ON storage.objects;
CREATE POLICY "group managers write group avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'group'
  AND public.can_manage_conversation(((storage.foldername(name))[2])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "group managers update group avatars" ON storage.objects;
CREATE POLICY "group managers update group avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'group'
  AND public.can_manage_conversation(((storage.foldername(name))[2])::uuid, auth.uid())
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'group'
  AND public.can_manage_conversation(((storage.foldername(name))[2])::uuid, auth.uid())
);