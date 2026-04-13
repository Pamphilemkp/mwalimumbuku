
-- Update student code to pure numeric format
UPDATE public.profiles 
SET student_code = LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0')
WHERE student_code IS NOT NULL AND student_code != '';

-- Update handle_new_user to generate numeric code
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
  RETURN NEW;
END;
$function$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all notifications"
ON public.notifications FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create platform_settings table for admin game/toolbox config
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
ON public.platform_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage settings"
ON public.platform_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default game settings
INSERT INTO public.platform_settings (key, value) VALUES
('game_settings', '{"easy_time": 120, "medium_time": 90, "hard_time": 60, "points_multiplier": 1}'::jsonb),
('toolbox_settings', '{"calculator": true, "spellcheck": true, "dictation": true, "tts": true, "recorder": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create function to notify students about assignments
CREATE OR REPLACE FUNCTION public.notify_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Notify all enrolled students
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT ce.user_id,
    'Nouveau devoir: ' || NEW.title,
    COALESCE(NEW.description, 'Un nouveau devoir a été ajouté à votre cours.'),
    'assignment',
    NEW.id
  FROM course_enrollments ce
  WHERE ce.course_id = NEW.course_id;

  -- Notify parents of enrolled students
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT ps.parent_id,
    'Devoir pour votre enfant: ' || NEW.title,
    'Date limite: ' || to_char(NEW.due_date, 'DD/MM/YYYY') || '. ' || COALESCE(NEW.description, ''),
    'assignment',
    NEW.id
  FROM course_enrollments ce
  JOIN parent_student ps ON ps.student_id = ce.user_id
  WHERE ce.course_id = NEW.course_id;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_assignment_created
AFTER INSERT ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_assignment();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
