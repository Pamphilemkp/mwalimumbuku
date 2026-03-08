-- Fix security vulnerabilities in RLS policies

-- 1. Fix parent_student INSERT policy to require parent role
DROP POLICY IF EXISTS "Parents can insert links" ON public.parent_student;
CREATE POLICY "Parents can insert links" ON public.parent_student
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = parent_id AND has_role(auth.uid(), 'parent'::app_role));

-- 2. Remove user-facing INSERT on subscriptions (should only be managed server-side)
DROP POLICY IF EXISTS "Users insert own subscription" ON public.subscriptions;

-- 3. Remove user-facing INSERT on user_badges (badges should be awarded server-side)
DROP POLICY IF EXISTS "Award own badges" ON public.user_badges;

-- 4. Remove user-facing INSERT on results (must go through check_answer RPC)
DROP POLICY IF EXISTS "Users insert own results" ON public.results;