-- Fix RESTRICTIVE policies to PERMISSIVE and add enrollment check for lessons

-- Fix lessons policy to require enrollment
DROP POLICY IF EXISTS "Lessons visible if course accessible" ON public.lessons;
CREATE POLICY "Lessons visible if course accessible" ON public.lessons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c 
      WHERE c.id = lessons.course_id 
      AND (
        c.teacher_id = auth.uid() 
        OR c.is_open_enrollment = true
        OR EXISTS (SELECT 1 FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.user_id = auth.uid())
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );