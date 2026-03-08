
-- ============================================================
-- Convert ALL restrictive RLS policies to PERMISSIVE
-- Must drop + recreate each one
-- ============================================================

-- === ASSIGNMENTS ===
DROP POLICY IF EXISTS "Admins manage assignments" ON public.assignments;
CREATE POLICY "Admins manage assignments" ON public.assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Students view assignments" ON public.assignments;
CREATE POLICY "Students view assignments" ON public.assignments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM course_enrollments ce WHERE ce.course_id = assignments.course_id AND ce.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "Teachers manage assignments" ON public.assignments;
CREATE POLICY "Teachers manage assignments" ON public.assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid()));

-- === BADGES ===
DROP POLICY IF EXISTS "Admins manage badges" ON public.badges;
CREATE POLICY "Admins manage badges" ON public.badges FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Badges visible" ON public.badges;
CREATE POLICY "Badges visible" ON public.badges FOR SELECT TO authenticated USING (true);

-- === COURSE_ENROLLMENTS ===
DROP POLICY IF EXISTS "Admins manage enrollments" ON public.course_enrollments;
CREATE POLICY "Admins manage enrollments" ON public.course_enrollments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Students enroll in published courses" ON public.course_enrollments;
CREATE POLICY "Students enroll in published courses" ON public.course_enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM courses c WHERE c.id = course_enrollments.course_id AND c.is_published = true));

DROP POLICY IF EXISTS "Students unenroll" ON public.course_enrollments;
CREATE POLICY "Students unenroll" ON public.course_enrollments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers view course enrollments" ON public.course_enrollments;
CREATE POLICY "Teachers view course enrollments" ON public.course_enrollments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_enrollments.course_id AND c.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Users view own enrollments" ON public.course_enrollments;
CREATE POLICY "Users view own enrollments" ON public.course_enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- === COURSES ===
DROP POLICY IF EXISTS "Admins manage all courses" ON public.courses;
CREATE POLICY "Admins manage all courses" ON public.courses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Published courses visible" ON public.courses;
CREATE POLICY "Published courses visible" ON public.courses FOR SELECT TO authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "Teachers delete own courses" ON public.courses;
CREATE POLICY "Teachers delete own courses" ON public.courses FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers insert courses" ON public.courses;
CREATE POLICY "Teachers insert courses" ON public.courses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

DROP POLICY IF EXISTS "Teachers update own courses" ON public.courses;
CREATE POLICY "Teachers update own courses" ON public.courses FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers view own courses" ON public.courses;
CREATE POLICY "Teachers view own courses" ON public.courses FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id);

-- === DAILY_MOODS ===
DROP POLICY IF EXISTS "Parents view child moods" ON public.daily_moods;
CREATE POLICY "Parents view child moods" ON public.daily_moods FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM parent_student ps WHERE ps.parent_id = auth.uid() AND ps.student_id = daily_moods.user_id));

DROP POLICY IF EXISTS "Users manage own moods" ON public.daily_moods;
CREATE POLICY "Users manage own moods" ON public.daily_moods FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- === EXERCISES ===
DROP POLICY IF EXISTS "Admins manage exercises" ON public.exercises;
CREATE POLICY "Admins manage exercises" ON public.exercises FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Enrolled students view exercises" ON public.exercises;
CREATE POLICY "Enrolled students view exercises" ON public.exercises FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM lessons l
    JOIN courses c ON c.id = l.course_id
    JOIN course_enrollments ce ON ce.course_id = c.id
    WHERE l.id = exercises.lesson_id AND ce.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Teachers manage exercises" ON public.exercises;
CREATE POLICY "Teachers manage exercises" ON public.exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = exercises.lesson_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = exercises.lesson_id AND c.teacher_id = auth.uid()));

-- === FORUM_POSTS ===
DROP POLICY IF EXISTS "Users create forum posts" ON public.forum_posts;
CREATE POLICY "Users create forum posts" ON public.forum_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own posts" ON public.forum_posts;
CREATE POLICY "Users delete own posts" ON public.forum_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own posts" ON public.forum_posts;
CREATE POLICY "Users update own posts" ON public.forum_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view forum posts for their role" ON public.forum_posts;
CREATE POLICY "Users view forum posts for their role" ON public.forum_posts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = ANY(forum_posts.role_visibility)));

-- === FORUM_REPLIES ===
DROP POLICY IF EXISTS "Users create replies" ON public.forum_replies;
CREATE POLICY "Users create replies" ON public.forum_replies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own replies" ON public.forum_replies;
CREATE POLICY "Users delete own replies" ON public.forum_replies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view replies" ON public.forum_replies;
CREATE POLICY "Users view replies" ON public.forum_replies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM forum_posts fp JOIN user_roles ur ON ur.user_id = auth.uid() WHERE fp.id = forum_replies.post_id AND ur.role::text = ANY(fp.role_visibility)));

-- === LESSONS ===
DROP POLICY IF EXISTS "Admins manage all lessons" ON public.lessons;
CREATE POLICY "Admins manage all lessons" ON public.lessons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Lessons visible if course accessible" ON public.lessons;
CREATE POLICY "Lessons visible if course accessible" ON public.lessons FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM courses c WHERE c.id = lessons.course_id
    AND (c.teacher_id = auth.uid() OR c.is_published = true
      OR EXISTS (SELECT 1 FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin'::app_role))
  ));

DROP POLICY IF EXISTS "Teachers manage own lessons" ON public.lessons;
CREATE POLICY "Teachers manage own lessons" ON public.lessons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = lessons.course_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = lessons.course_id AND c.teacher_id = auth.uid()));

-- === MESSAGES ===
DROP POLICY IF EXISTS "Authenticated users send messages" ON public.messages;
CREATE POLICY "Authenticated users send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users delete own sent messages" ON public.messages;
CREATE POLICY "Users delete own sent messages" ON public.messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users update own received messages" ON public.messages;
CREATE POLICY "Users update own received messages" ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users view own messages" ON public.messages;
CREATE POLICY "Users view own messages" ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- === PARENT_STUDENT ===
DROP POLICY IF EXISTS "Admins can manage all links" ON public.parent_student;
CREATE POLICY "Admins can manage all links" ON public.parent_student FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Parents can insert links" ON public.parent_student;
CREATE POLICY "Parents can insert links" ON public.parent_student FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = parent_id AND has_role(auth.uid(), 'parent'::app_role));

DROP POLICY IF EXISTS "Parents can view own links" ON public.parent_student;
CREATE POLICY "Parents can view own links" ON public.parent_student FOR SELECT TO authenticated
  USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Students can view own parent links" ON public.parent_student;
CREATE POLICY "Students can view own parent links" ON public.parent_student FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

-- === PROFILES ===
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Forum participants view profiles" ON public.profiles;
CREATE POLICY "Forum participants view profiles" ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM forum_posts fp WHERE fp.user_id = profiles.user_id)
    OR EXISTS (SELECT 1 FROM forum_replies fr WHERE fr.user_id = profiles.user_id)
  );

DROP POLICY IF EXISTS "Message participants view profiles" ON public.profiles;
CREATE POLICY "Message participants view profiles" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM messages m WHERE (m.sender_id = auth.uid() AND m.receiver_id = profiles.user_id) OR (m.receiver_id = auth.uid() AND m.sender_id = profiles.user_id)));

DROP POLICY IF EXISTS "Parents view children profiles" ON public.profiles;
CREATE POLICY "Parents view children profiles" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM parent_student ps WHERE ps.student_id = profiles.user_id AND ps.parent_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers view enrolled student profiles" ON public.profiles;
CREATE POLICY "Teachers view enrolled student profiles" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM course_enrollments ce JOIN courses c ON c.id = ce.course_id WHERE ce.user_id = profiles.user_id AND c.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- === RESULTS ===
DROP POLICY IF EXISTS "Admins manage results" ON public.results;
CREATE POLICY "Admins manage results" ON public.results FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Parents view children results" ON public.results;
CREATE POLICY "Parents view children results" ON public.results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM parent_student ps WHERE ps.parent_id = auth.uid() AND ps.student_id = results.user_id));

DROP POLICY IF EXISTS "Teachers view results for their course exercises" ON public.results;
CREATE POLICY "Teachers view results for their course exercises" ON public.results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM exercises e JOIN lessons l ON l.id = e.lesson_id JOIN courses c ON c.id = l.course_id WHERE e.id = results.exercise_id AND c.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Users view own results" ON public.results;
CREATE POLICY "Users view own results" ON public.results FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- === SUBSCRIPTIONS ===
DROP POLICY IF EXISTS "Admins manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins manage all subscriptions" ON public.subscriptions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users view own subscription" ON public.subscriptions;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- === USER_BADGES ===
DROP POLICY IF EXISTS "Users view own badges" ON public.user_badges;
CREATE POLICY "Users view own badges" ON public.user_badges FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- === USER_ROLES ===
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- === Restore auth trigger if missing ===
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
