
-- COURSE MATERIALS
CREATE TABLE IF NOT EXISTS public.course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  lesson_id uuid,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_name text,
  material_type text NOT NULL DEFAULT 'file', -- 'pdf' | 'video' | 'presentation' | 'image' | 'file'
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_materials TO authenticated;
GRANT ALL ON public.course_materials TO service_role;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own course materials" ON public.course_materials FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()));
CREATE POLICY "Admins manage materials" ON public.course_materials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Enrolled view materials" ON public.course_materials FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM course_enrollments ce WHERE ce.course_id = course_materials.course_id AND ce.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_materials_course ON public.course_materials(course_id);

-- LIVE SESSIONS
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  meeting_url text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled|live|ended|cancelled
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_sessions TO authenticated;
GRANT ALL ON public.live_sessions TO service_role;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own sessions" ON public.live_sessions FOR ALL TO authenticated
  USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Admins manage sessions" ON public.live_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Enrolled view sessions" ON public.live_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM course_enrollments ce WHERE ce.course_id = live_sessions.course_id AND ce.user_id = auth.uid()));
CREATE POLICY "Parents view children sessions" ON public.live_sessions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM parent_student ps
    JOIN course_enrollments ce ON ce.user_id = ps.student_id
    WHERE ps.parent_id = auth.uid() AND ce.course_id = live_sessions.course_id
  ));

-- ATTENDANCE
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  course_id uuid NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'present', -- present|absent|late|excused
  marked_by uuid,
  marked_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  UNIQUE(session_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage attendance for their courses" ON public.attendance FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = attendance.course_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = attendance.course_id AND c.teacher_id = auth.uid()));
CREATE POLICY "Admins manage attendance" ON public.attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Students view own attendance" ON public.attendance FOR SELECT TO authenticated
  USING (auth.uid() = student_id);
CREATE POLICY "Parents view children attendance" ON public.attendance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM parent_student ps WHERE ps.parent_id = auth.uid() AND ps.student_id = attendance.student_id));

CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course ON public.attendance(course_id);

-- TEACHER RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS public.teacher_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  course_id uuid,
  subject text,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal', -- low|normal|high
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_recommendations TO authenticated;
GRANT ALL ON public.teacher_recommendations TO service_role;
ALTER TABLE public.teacher_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own recos" ON public.teacher_recommendations FOR ALL TO authenticated
  USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Students view own recos" ON public.teacher_recommendations FOR SELECT TO authenticated
  USING (auth.uid() = student_id);
CREATE POLICY "Parents view children recos" ON public.teacher_recommendations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM parent_student ps WHERE ps.parent_id = auth.uid() AND ps.student_id = teacher_recommendations.student_id));
CREATE POLICY "Admins manage recos" ON public.teacher_recommendations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- TRIGGERS for notifications
CREATE OR REPLACE FUNCTION public.notify_new_material()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, related_id)
  SELECT ce.user_id, 'Nouveau contenu de cours: ' || NEW.title,
         COALESCE(NEW.description, 'Un nouveau document a été ajouté.'),
         'material', NEW.course_id
  FROM course_enrollments ce WHERE ce.course_id = NEW.course_id;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_notify_new_material ON public.course_materials;
CREATE TRIGGER trg_notify_new_material AFTER INSERT ON public.course_materials
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_material();

CREATE OR REPLACE FUNCTION public.notify_live_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, related_id)
  SELECT ce.user_id, 'Session live: ' || NEW.title,
         'Prévue le ' || to_char(NEW.scheduled_at, 'DD/MM/YYYY HH24:MI'),
         'live_session', NEW.id
  FROM course_enrollments ce WHERE ce.course_id = NEW.course_id;
  -- parents
  INSERT INTO notifications (user_id, title, message, type, related_id)
  SELECT DISTINCT ps.parent_id, 'Session live de votre enfant: ' || NEW.title,
         'Prévue le ' || to_char(NEW.scheduled_at, 'DD/MM/YYYY HH24:MI'),
         'live_session', NEW.id
  FROM course_enrollments ce JOIN parent_student ps ON ps.student_id = ce.user_id
  WHERE ce.course_id = NEW.course_id;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_notify_live_session ON public.live_sessions;
CREATE TRIGGER trg_notify_live_session AFTER INSERT ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_live_session();

CREATE OR REPLACE FUNCTION public.notify_recommendation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, related_id)
  VALUES (NEW.student_id, 'Recommandation de votre enseignant',
          COALESCE(LEFT(NEW.message,140),'Conseil personnalisé'),
          'recommendation', NEW.id);
  -- parents
  INSERT INTO notifications (user_id, title, message, type, related_id)
  SELECT ps.parent_id, 'Recommandation pour votre enfant',
         COALESCE(LEFT(NEW.message,140),'Conseil personnalisé'),
         'recommendation', NEW.id
  FROM parent_student ps WHERE ps.student_id = NEW.student_id;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_notify_reco ON public.teacher_recommendations;
CREATE TRIGGER trg_notify_reco AFTER INSERT ON public.teacher_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.notify_recommendation();

-- Storage bucket
INSERT INTO storage.buckets (id,name,public) VALUES ('course-materials','course-materials',true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Course materials public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'course-materials');
CREATE POLICY "Teachers upload course materials" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners delete course materials" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Realtime
ALTER TABLE public.live_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.course_materials REPLICA IDENTITY FULL;
ALTER TABLE public.teacher_recommendations REPLICA IDENTITY FULL;
ALTER TABLE public.attendance REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_recommendations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
