-- Fix handle_new_user: only allow 'student' and 'parent' from client metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));

  _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'student'::public.app_role);
  -- Only allow student, parent, teacher from client signup; block admin
  IF _role NOT IN ('student', 'parent', 'teacher') THEN
    _role := 'student';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

-- Create award_badge_if_eligible RPC
CREATE OR REPLACE FUNCTION public.award_badge_if_eligible(_badge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_points int;
  _required int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(SUM(points_earned), 0) INTO _total_points
  FROM results WHERE user_id = auth.uid();

  SELECT points_required INTO _required FROM badges WHERE id = _badge_id;

  IF _required IS NULL THEN
    RAISE EXCEPTION 'Badge not found';
  END IF;

  IF _total_points < _required THEN
    RAISE EXCEPTION 'Insufficient points to earn this badge';
  END IF;

  INSERT INTO user_badges (user_id, badge_id) VALUES (auth.uid(), _badge_id)
  ON CONFLICT DO NOTHING;
END;
$$;