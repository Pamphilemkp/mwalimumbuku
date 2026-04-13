
-- Add student_code column to profiles
ALTER TABLE public.profiles ADD COLUMN student_code TEXT UNIQUE;

-- Generate codes for existing users
UPDATE public.profiles SET student_code = 'STU-' || UPPER(SUBSTR(REPLACE(id::text, '-', ''), 1, 6))
WHERE student_code IS NULL;

-- Make it not null with a default
ALTER TABLE public.profiles ALTER COLUMN student_code SET DEFAULT '';

-- Update the handle_new_user function to auto-generate student_code
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
  -- Generate unique student code
  _code := 'STU-' || UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6));

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
