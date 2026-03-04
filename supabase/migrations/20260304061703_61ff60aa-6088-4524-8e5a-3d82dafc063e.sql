
-- ======= SECURITY FIX: Server-side answer checking =======
CREATE OR REPLACE FUNCTION public.check_answer(_exercise_id uuid, _answer text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _correct text;
  _points int;
  _is_correct boolean;
  _earned int;
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT correct_answer, points INTO _correct, _points
  FROM exercises WHERE id = _exercise_id;

  IF _correct IS NULL THEN
    RAISE EXCEPTION 'Exercise not found';
  END IF;

  _is_correct := (_answer = _correct);
  _earned := CASE WHEN _is_correct THEN _points ELSE 0 END;

  INSERT INTO results (user_id, exercise_id, answer, is_correct, points_earned)
  VALUES (_user_id, _exercise_id, _answer, _is_correct, _earned);

  RETURN jsonb_build_object('is_correct', _is_correct, 'points_earned', _earned);
END;
$$;

-- ======= SECURITY FIX: Parent-child role validation =======
CREATE OR REPLACE FUNCTION public.link_parent_child(_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _parent_id uuid;
BEGIN
  _parent_id := auth.uid();
  IF _parent_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Verify caller is a parent
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _parent_id AND role = 'parent') THEN
    RAISE EXCEPTION 'Only parents can link children';
  END IF;

  -- Verify target is a student
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _student_id AND role = 'student') THEN
    RAISE EXCEPTION 'Target user is not a student';
  END IF;

  -- Prevent duplicate
  IF EXISTS (SELECT 1 FROM parent_student WHERE parent_id = _parent_id AND student_id = _student_id) THEN
    RAISE EXCEPTION 'Already linked';
  END IF;

  INSERT INTO parent_student (parent_id, student_id) VALUES (_parent_id, _student_id);
END;
$$;

-- ======= FORUMS =======
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  role_visibility text[] NOT NULL DEFAULT '{student,parent,teacher,admin}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

-- Forum posts: users can see posts visible to their role
CREATE POLICY "Users view forum posts for their role" ON public.forum_posts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role::text = ANY(forum_posts.role_visibility)
    )
  );

CREATE POLICY "Users create forum posts" ON public.forum_posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own posts" ON public.forum_posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own posts" ON public.forum_posts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Forum replies
CREATE POLICY "Users view replies" ON public.forum_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forum_posts fp
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE fp.id = forum_replies.post_id
      AND ur.role::text = ANY(fp.role_visibility)
    )
  );

CREATE POLICY "Users create replies" ON public.forum_replies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own replies" ON public.forum_replies
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ======= PRIVATE MESSAGING =======
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Only parents and teachers can send messages to each other
CREATE POLICY "Users view own messages" ON public.messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Parents and teachers send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      has_role(auth.uid(), 'parent') OR has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Users update own received messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

-- ======= SUBSCRIPTIONS =======
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own subscription" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own subscription" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Auto-create free subscription on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'student'::public.app_role));
  INSERT INTO public.subscriptions (user_id, tier)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;
