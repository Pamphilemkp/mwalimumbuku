
-- 1. Course enrollments table
CREATE TABLE public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Students can view their own enrollments
CREATE POLICY "Users view own enrollments" ON public.course_enrollments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Students can enroll themselves in published courses
CREATE POLICY "Students enroll in published courses" ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.is_published = true)
  );

-- Teachers can view enrollments for their courses
CREATE POLICY "Teachers view course enrollments" ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()));

-- Admins manage all enrollments
CREATE POLICY "Admins manage enrollments" ON public.course_enrollments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Students can unenroll
CREATE POLICY "Students unenroll" ON public.course_enrollments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Add deadline and visibility columns to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS deadline timestamptz DEFAULT NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_open_enrollment boolean NOT NULL DEFAULT true;

-- 3. Homework/assignments table
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Assignments visible to enrolled students and teachers
CREATE POLICY "Students view assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM course_enrollments ce WHERE ce.course_id = assignments.course_id AND ce.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid())
  );

CREATE POLICY "Teachers manage assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Admins manage assignments" ON public.assignments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix security: prevent admin role self-assignment in handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));

  _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'student'::public.app_role);
  IF _role = 'admin' THEN
    _role := 'student';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

-- 5. Fix security: allow users to delete their sent messages
CREATE POLICY "Users delete own sent messages" ON public.messages
  FOR DELETE TO authenticated USING (auth.uid() = sender_id);
