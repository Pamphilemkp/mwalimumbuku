
-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS preferred_language text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0;

-- 2. student_profiles
CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id uuid PRIMARY KEY,
  school_name text,
  student_id_external text,
  class_level text,
  academic_goals text,
  subjects_of_interest text[] DEFAULT '{}',
  weak_subjects text[] DEFAULT '{}',
  learning_language text,
  emergency_contact_name text,
  emergency_contact_phone text,
  guardian_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own profile" ON public.student_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage student profiles" ON public.student_profiles
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers view enrolled student profiles" ON public.student_profiles
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM course_enrollments ce JOIN courses c ON c.id = ce.course_id
    WHERE ce.user_id = student_profiles.user_id AND c.teacher_id = auth.uid()
  ));
CREATE POLICY "Parents view children student profiles" ON public.student_profiles
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM parent_student ps WHERE ps.parent_id = auth.uid() AND ps.student_id = student_profiles.user_id
  ));

-- 3. parent_profiles
CREATE TABLE IF NOT EXISTS public.parent_profiles (
  user_id uuid PRIMARY KEY,
  occupation text,
  communication_language text,
  relationship_to_child text,
  number_of_children integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_profiles TO authenticated;
GRANT ALL ON public.parent_profiles TO service_role;
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage own profile" ON public.parent_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage parent profiles" ON public.parent_profiles
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. children_info
CREATE TABLE IF NOT EXISTS public.children_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  full_name text NOT NULL,
  class_level text,
  age integer,
  learning_difficulties text,
  weaknesses text,
  strengths text,
  behavioral_notes text,
  goals text,
  linked_student_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.children_info TO authenticated;
GRANT ALL ON public.children_info TO service_role;
ALTER TABLE public.children_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage own children" ON public.children_info
  FOR ALL TO authenticated USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Admins manage all children" ON public.children_info
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers view linked children" ON public.children_info
  FOR SELECT TO authenticated USING (
    linked_student_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM course_enrollments ce JOIN courses c ON c.id = ce.course_id
      WHERE ce.user_id = children_info.linked_student_id AND c.teacher_id = auth.uid()
    )
  );

-- 5. teacher_profiles
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  user_id uuid PRIMARY KEY,
  qualification text,
  years_experience integer DEFAULT 0,
  subjects_taught text[] DEFAULT '{}',
  levels_handled text[] DEFAULT '{}',
  certifications text[] DEFAULT '{}',
  bio text,
  availability jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_profiles TO authenticated;
GRANT ALL ON public.teacher_profiles TO service_role;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own profile" ON public.teacher_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage teacher profiles" ON public.teacher_profiles
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated view teacher profiles" ON public.teacher_profiles
  FOR SELECT TO authenticated USING (true);

-- 6. updated_at triggers
CREATE TRIGGER trg_student_profiles_updated BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_parent_profiles_updated BEFORE UPDATE ON public.parent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_children_info_updated BEFORE UPDATE ON public.children_info
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_teacher_profiles_updated BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Extend handle_new_user to seed role-specific rows
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
  _code text;
BEGIN
  _code := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');

  INSERT INTO public.profiles (user_id, full_name, student_code)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), _code);

  _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'student'::public.app_role);
  IF _role NOT IN ('student', 'parent') THEN
    _role := 'student';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'free');

  IF _role = 'student' THEN
    INSERT INTO public.student_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSIF _role = 'parent' THEN
    INSERT INTO public.parent_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 8. Avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
