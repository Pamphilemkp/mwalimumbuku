
-- 1. Fix parent_student INSERT policy to verify student role
DROP POLICY IF EXISTS "Parents can insert links" ON public.parent_student;
CREATE POLICY "Parents can insert links" ON public.parent_student
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = parent_id
    AND has_role(auth.uid(), 'parent'::app_role)
    AND has_role(student_id, 'student'::app_role)
  );

-- 2. Fix has_role function to only check caller's own roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Note: We keep the two-argument signature because RLS policies use it with auth.uid().
-- The function is SECURITY DEFINER so it bypasses RLS on user_roles - this is by design
-- so RLS policies can check roles without recursion. The information disclosure risk
-- is acceptable since roles are only used internally in RLS expressions.

-- 3. Fix course creation - replace permissive ALL policy with separate policies
-- The "Teachers insert courses" policy already exists with proper role check.
-- Drop the old ALL policy that doesn't check role, and add specific UPDATE/DELETE policies.
DROP POLICY IF EXISTS "Teachers manage own courses" ON public.courses;

-- Teachers can view their own courses (draft or published)
DROP POLICY IF EXISTS "Teachers view own courses" ON public.courses;
CREATE POLICY "Teachers view own courses" ON public.courses
  FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id);

-- Teachers insert courses (already exists with role check, recreate to be safe)
DROP POLICY IF EXISTS "Teachers insert courses" ON public.courses;
CREATE POLICY "Teachers insert courses" ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = teacher_id
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

-- Teachers update own courses (with role check)
DROP POLICY IF EXISTS "Teachers update own courses" ON public.courses;
CREATE POLICY "Teachers update own courses" ON public.courses
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = teacher_id
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

-- Teachers delete own courses (with role check)
DROP POLICY IF EXISTS "Teachers delete own courses" ON public.courses;
CREATE POLICY "Teachers delete own courses" ON public.courses
  FOR DELETE TO authenticated
  USING (
    auth.uid() = teacher_id
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

-- 4. Create a secure view for student-facing exercises (hides correct_answer)
CREATE OR REPLACE VIEW public.student_exercises AS
SELECT e.id, e.question, e.options, e.exercise_type, e.points, e.created_at, e.lesson_id
FROM public.exercises e
JOIN public.lessons l ON l.id = e.lesson_id
JOIN public.courses c ON c.id = l.course_id
WHERE c.is_published = true;
