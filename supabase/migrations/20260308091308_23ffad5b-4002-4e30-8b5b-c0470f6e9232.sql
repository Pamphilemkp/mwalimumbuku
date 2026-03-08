ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

CREATE POLICY "Admins manage all lessons" ON public.lessons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));