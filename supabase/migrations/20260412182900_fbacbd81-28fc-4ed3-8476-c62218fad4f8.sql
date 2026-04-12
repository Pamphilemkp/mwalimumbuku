CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));

  _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'student'::public.app_role);
  -- Only allow student and parent from client signup; block teacher and admin
  IF _role NOT IN ('student', 'parent') THEN
    _role := 'student';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;