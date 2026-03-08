
-- =====================================================
-- FIX: Convert ALL RLS policies from RESTRICTIVE to PERMISSIVE
-- =====================================================

-- ===== ASSIGNMENTS =====
DROP POLICY IF EXISTS "Admins manage assignments" ON assignments;
DROP POLICY IF EXISTS "Students view assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers manage assignments" ON assignments;

CREATE POLICY "Admins manage assignments" ON assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students view assignments" ON assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM course_enrollments ce WHERE ce.course_id = assignments.course_id AND ce.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Teachers manage assignments" ON assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid()));

-- ===== BADGES =====
DROP POLICY IF EXISTS "Admins manage badges" ON badges;
DROP POLICY IF EXISTS "Badges visible" ON badges;

CREATE POLICY "Admins manage badges" ON badges FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Badges visible" ON badges FOR SELECT TO authenticated USING (true);

-- ===== COURSE_ENROLLMENTS =====
DROP POLICY IF EXISTS "Admins manage enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Students enroll in published courses" ON course_enrollments;
DROP POLICY IF EXISTS "Students unenroll" ON course_enrollments;
DROP POLICY IF EXISTS "Teachers view course enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Users view own enrollments" ON course_enrollments;

CREATE POLICY "Users view own enrollments" ON course_enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers view course enrollments" ON course_enrollments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_enrollments.course_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Students enroll in published courses" ON course_enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM courses c WHERE c.id = course_enrollments.course_id AND c.is_published = true));

CREATE POLICY "Students unenroll" ON course_enrollments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage enrollments" ON course_enrollments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ===== COURSES =====
DROP POLICY IF EXISTS "Admins manage all courses" ON courses;
DROP POLICY IF EXISTS "Published courses visible" ON courses;
DROP POLICY IF EXISTS "Teachers delete own courses" ON courses;
DROP POLICY IF EXISTS "Teachers insert courses" ON courses;
DROP POLICY IF EXISTS "Teachers update own courses" ON courses;
DROP POLICY IF EXISTS "Teachers view own courses" ON courses;

CREATE POLICY "Published courses visible" ON courses FOR SELECT TO authenticated
  USING (is_published = true);

CREATE POLICY "Teachers view own courses" ON courses FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers insert courses" ON courses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers update own courses" ON courses FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers delete own courses" ON courses FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Admins manage all courses" ON courses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ===== DAILY_MOODS =====
DROP POLICY IF EXISTS "Parents view child moods" ON daily_moods;
DROP POLICY IF EXISTS "Users manage own moods" ON daily_moods;

CREATE POLICY "Users manage own moods" ON daily_moods FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parents view child moods" ON daily_moods FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM parent_student ps WHERE ps.parent_id = auth.uid() AND ps.student_id = daily_moods.user_id));

-- ===== EXERCISES =====
DROP POLICY IF EXISTS "Admins manage exercises" ON exercises;
DROP POLICY IF EXISTS "Enrolled students view exercises" ON exercises;
DROP POLICY IF EXISTS "Teachers manage exercises" ON exercises;

CREATE POLICY "Enrolled students view exercises" ON exercises FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM lessons l JOIN courses c ON c.id = l.course_id JOIN course_enrollments ce ON ce.course_id = c.id WHERE l.id = exercises.lesson_id AND ce.user_id = auth.uid()));

CREATE POLICY "Teachers manage exercises" ON exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = exercises.lesson_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = exercises.lesson_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Admins manage exercises" ON exercises FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ===== FORUM_POSTS =====
DROP POLICY IF EXISTS "Users create forum posts" ON forum_posts;
DROP POLICY IF EXISTS "Users delete own posts" ON forum_posts;
DROP POLICY IF EXISTS "Users update own posts" ON forum_posts;
DROP POLICY IF EXISTS "Users view forum posts for their role" ON forum_posts;

CREATE POLICY "Users view forum posts for their role" ON forum_posts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = ANY(forum_posts.role_visibility)));

CREATE POLICY "Users create forum posts" ON forum_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own posts" ON forum_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own posts" ON forum_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ===== FORUM_REPLIES =====
DROP POLICY IF EXISTS "Users create replies" ON forum_replies;
DROP POLICY IF EXISTS "Users delete own replies" ON forum_replies;
DROP POLICY IF EXISTS "Users view replies" ON forum_replies;

CREATE POLICY "Users view replies" ON forum_replies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM forum_posts fp JOIN user_roles ur ON ur.user_id = auth.uid() WHERE fp.id = forum_replies.post_id AND ur.role::text = ANY(fp.role_visibility)));

CREATE POLICY "Users create replies" ON forum_replies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own replies" ON forum_replies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ===== LESSONS =====
DROP POLICY IF EXISTS "Admins manage all lessons" ON lessons;
DROP POLICY IF EXISTS "Lessons visible if course accessible" ON lessons;
DROP POLICY IF EXISTS "Teachers manage own lessons" ON lessons;

CREATE POLICY "Lessons visible if course accessible" ON lessons FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = lessons.course_id AND (c.teacher_id = auth.uid() OR c.is_published = true OR EXISTS (SELECT 1 FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))));

CREATE POLICY "Teachers manage own lessons" ON lessons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = lessons.course_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = lessons.course_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Admins manage all lessons" ON lessons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ===== MESSAGES =====
DROP POLICY IF EXISTS "Authenticated users send messages" ON messages;
DROP POLICY IF EXISTS "Users delete own sent messages" ON messages;
DROP POLICY IF EXISTS "Users update own received messages" ON messages;
DROP POLICY IF EXISTS "Users view own messages" ON messages;

CREATE POLICY "Users view own messages" ON messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated users send messages" ON messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users update own received messages" ON messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users delete own sent messages" ON messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- ===== PARENT_STUDENT =====
DROP POLICY IF EXISTS "Admins can manage all links" ON parent_student;
DROP POLICY IF EXISTS "Parents can insert links" ON parent_student;
DROP POLICY IF EXISTS "Parents can view own links" ON parent_student;
DROP POLICY IF EXISTS "Students can view own parent links" ON parent_student;

CREATE POLICY "Parents can view own links" ON parent_student FOR SELECT TO authenticated
  USING (auth.uid() = parent_id);

CREATE POLICY "Students can view own parent links" ON parent_student FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Parents can insert links" ON parent_student FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = parent_id AND has_role(auth.uid(), 'parent'::app_role));

CREATE POLICY "Admins can manage all links" ON parent_student FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ===== PROFILES =====
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
DROP POLICY IF EXISTS "Forum participants view profiles" ON profiles;
DROP POLICY IF EXISTS "Message participants view profiles" ON profiles;
DROP POLICY IF EXISTS "Parents view children profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers view enrolled student profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users view own profile" ON profiles;

CREATE POLICY "Users view own profile" ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all profiles" ON profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Forum participants view profiles" ON profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM forum_posts fp WHERE fp.user_id = profiles.user_id) OR EXISTS (SELECT 1 FROM forum_replies fr WHERE fr.user_id = profiles.user_id));

CREATE POLICY "Message participants view profiles" ON profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM messages m WHERE (m.sender_id = auth.uid() AND m.receiver_id = profiles.user_id) OR (m.receiver_id = auth.uid() AND m.sender_id = profiles.user_id)));

CREATE POLICY "Parents view children profiles" ON profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM parent_student ps WHERE ps.student_id = profiles.user_id AND ps.parent_id = auth.uid()));

CREATE POLICY "Teachers view enrolled student profiles" ON profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM course_enrollments ce JOIN courses c ON c.id = ce.course_id WHERE ce.user_id = profiles.user_id AND c.teacher_id = auth.uid()));

-- ===== RESULTS =====
DROP POLICY IF EXISTS "Admins manage results" ON results;
DROP POLICY IF EXISTS "Parents view children results" ON results;
DROP POLICY IF EXISTS "Teachers view results for their course exercises" ON results;
DROP POLICY IF EXISTS "Users view own results" ON results;

CREATE POLICY "Users view own results" ON results FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Parents view children results" ON results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM parent_student ps WHERE ps.parent_id = auth.uid() AND ps.student_id = results.user_id));

CREATE POLICY "Teachers view results for their course exercises" ON results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM exercises e JOIN lessons l ON l.id = e.lesson_id JOIN courses c ON c.id = l.course_id WHERE e.id = results.exercise_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Admins manage results" ON results FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ===== SUBSCRIPTIONS =====
DROP POLICY IF EXISTS "Admins manage all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users view own subscription" ON subscriptions;

CREATE POLICY "Users view own subscription" ON subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all subscriptions" ON subscriptions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ===== USER_BADGES =====
DROP POLICY IF EXISTS "Users view own badges" ON user_badges;

CREATE POLICY "Users view own badges" ON user_badges FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ===== USER_ROLES =====
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;

CREATE POLICY "Users can view own roles" ON user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ===== RESTORE TRIGGER =====
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
