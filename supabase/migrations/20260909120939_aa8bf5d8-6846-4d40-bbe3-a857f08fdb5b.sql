-- Groups: any authenticated member may create one
DROP POLICY IF EXISTS "users create conversations" ON public.conversations;
CREATE POLICY "users create conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Invites: members can create and read their own; admins manage everything
DROP POLICY IF EXISTS "admins manage invites" ON public.invites;
CREATE POLICY "admins manage invites"
ON public.invites FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "members create own invites"
ON public.invites FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "members read own invites"
ON public.invites FOR SELECT TO authenticated
USING (auth.uid() = created_by);