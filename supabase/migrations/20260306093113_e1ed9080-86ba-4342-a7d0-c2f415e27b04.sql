
-- Fix: Add SELECT policy on exercises for admins (teachers already have ALL)
CREATE POLICY "Admins manage exercises"
ON public.exercises FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix: Add safe INSERT policy on results (check_answer RPC bypasses RLS via SECURITY DEFINER)
CREATE POLICY "Users insert own results"
ON public.results FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add admin management for results
CREATE POLICY "Admins manage results"
ON public.results FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
