ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_browse_directory boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hidden_in_directory boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.can_browse_directory(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.can_browse_directory FROM public.profiles p WHERE p.id = _user_id), false)
$$;

CREATE OR REPLACE FUNCTION public.shares_conversation(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members m1
    JOIN public.conversation_members m2 ON m1.conversation_id = m2.conversation_id
    WHERE m1.user_id = _a AND m2.user_id = _b
  )
$$;

DROP POLICY IF EXISTS "profiles readable by signed-in users" ON public.profiles;

CREATE POLICY "profiles visible per directory rules"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.shares_conversation(auth.uid(), id)
  OR (public.can_browse_directory(auth.uid()) AND NOT hidden_in_directory)
);