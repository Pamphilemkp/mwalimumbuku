-- Fix: Course creation - add teacher role check
DROP POLICY IF EXISTS "Teachers manage own courses" ON public.courses;

CREATE POLICY "Teachers view own courses" ON public.courses
  FOR SELECT TO authenticated USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers insert courses" ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = teacher_id
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

CREATE POLICY "Teachers update own courses" ON public.courses
  FOR UPDATE TO authenticated USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers delete own courses" ON public.courses
  FOR DELETE TO authenticated USING (auth.uid() = teacher_id);