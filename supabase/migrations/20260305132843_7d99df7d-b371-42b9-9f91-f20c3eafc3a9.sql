
-- 1. FIX EXERCISES ANSWER EXPOSURE: Remove open SELECT policy, keep teacher-only
DROP POLICY IF EXISTS "Exercises visible with lesson" ON public.exercises;

-- Students can only access exercises via get_lesson_exercises RPC (which excludes correct_answer)
-- Teachers keep full access via "Teachers manage exercises" ALL policy

-- 2. FIX RESULTS SCORE MANIPULATION: Remove direct INSERT policy, only check_answer RPC can insert
DROP POLICY IF EXISTS "Users insert own results" ON public.results;

-- 3. FIX SUBSCRIPTION TIER BYPASS: Remove user self-update policy
DROP POLICY IF EXISTS "Users update own subscription" ON public.subscriptions;
-- Users can only view their subscription, not modify tier directly
-- Tier changes go through edge function with service role

-- 4. FIX PROFILES PUBLIC EXPOSURE: Replace open SELECT with scoped policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Teachers can view profiles of students in their courses
CREATE POLICY "Teachers view enrolled student profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments ce
      JOIN courses c ON c.id = ce.course_id
      WHERE ce.user_id = profiles.user_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Parents can view their linked children's profiles
CREATE POLICY "Parents view children profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_student ps
      WHERE ps.student_id = profiles.user_id
        AND ps.parent_id = auth.uid()
    )
  );

-- Admins can view all profiles
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Message participants can view each other's profiles
CREATE POLICY "Message participants view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE (m.sender_id = auth.uid() AND m.receiver_id = profiles.user_id)
         OR (m.receiver_id = auth.uid() AND m.sender_id = profiles.user_id)
    )
  );
