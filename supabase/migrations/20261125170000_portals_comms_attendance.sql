-- Portals, communication, attendance history, and live-session instructions.
-- Not applied to the hosted database by this change.
-- Does not claim an official curriculum or a video provider.
-- class_attendance.session_date is the school's calendar date, not a timestamptz.
-- Private messages are not added to supabase_realtime. Clients refresh on a timer
-- or when the page is focused. A live session stores the teacher's instructions
-- and an optional link. It does not connect a video vendor.

COMMENT ON COLUMN public.class_attendance.session_date IS
  'School calendar date for this register. Stored as a date so the school day does not shift with a timezone.';

CREATE TABLE IF NOT EXISTS public.attendance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid NOT NULL REFERENCES public.class_attendance (id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  class_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  session_date date NOT NULL,
  old_status text,
  new_status text NOT NULL,
  actor_id uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attendance_audit_register_idx
  ON public.attendance_audit (class_id, session_date, changed_at);

ALTER TABLE public.attendance_audit ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.attendance_audit TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_class_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.attendance_audit (
    attendance_id, school_id, class_id, membership_id, session_date,
    old_status, new_status, actor_id
  ) VALUES (
    NEW.id,
    NEW.school_id,
    NEW.class_id,
    NEW.membership_id,
    NEW.session_date,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    auth.uid()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS class_attendance_audit ON public.class_attendance;
CREATE TRIGGER class_attendance_audit
  AFTER INSERT OR UPDATE ON public.class_attendance
  FOR EACH ROW EXECUTE FUNCTION public.audit_class_attendance();

REVOKE ALL ON FUNCTION public.audit_class_attendance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_class_attendance() TO authenticated;

DROP POLICY IF EXISTS "Read attendance history" ON public.attendance_audit;
CREATE POLICY "Read attendance history"
  ON public.attendance_audit
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.active_membership(auth.uid(), school_id, 'school_admin')
    OR public.teaches_class(auth.uid(), class_id)
    OR EXISTS (
      SELECT 1
      FROM public.school_memberships AS membership
      WHERE membership.id = attendance_audit.membership_id
        AND membership.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.school_memberships AS membership
      WHERE membership.id = attendance_audit.membership_id
        AND public.parent_of(auth.uid(), membership.user_id)
    )
  );

-- Restate the class register rules. Students have no insert or update policy.
-- The unique key (class_id, membership_id, session_date) stays in place.

DROP POLICY IF EXISTS "Read visible class attendance" ON public.class_attendance;
CREATE POLICY "Read visible class attendance"
  ON public.class_attendance
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.active_membership(auth.uid(), school_id, 'school_admin')
    OR public.teaches_class(auth.uid(), class_id)
    OR EXISTS (
      SELECT 1
      FROM public.school_memberships AS membership
      WHERE membership.id = class_attendance.membership_id
        AND membership.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.school_memberships AS membership
      WHERE membership.id = class_attendance.membership_id
        AND public.parent_of(auth.uid(), membership.user_id)
    )
  );

DROP POLICY IF EXISTS "Assigned teachers mark class attendance" ON public.class_attendance;
CREATE POLICY "Assigned teachers mark class attendance"
  ON public.class_attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    public.teaches_class(auth.uid(), class_id)
    AND EXISTS (
      SELECT 1
      FROM public.school_memberships AS marker
      WHERE marker.id = class_attendance.marked_by
        AND marker.user_id = auth.uid()
        AND marker.membership_role = 'teacher'
        AND marker.status = 'active'
        AND marker.school_id = class_attendance.school_id
    )
  );

DROP POLICY IF EXISTS "Assigned teachers update class attendance" ON public.class_attendance;
CREATE POLICY "Assigned teachers update class attendance"
  ON public.class_attendance
  FOR UPDATE TO authenticated
  USING (public.teaches_class(auth.uid(), class_id))
  WITH CHECK (
    public.teaches_class(auth.uid(), class_id)
    AND EXISTS (
      SELECT 1
      FROM public.school_memberships AS marker
      WHERE marker.id = class_attendance.marked_by
        AND marker.user_id = auth.uid()
        AND marker.school_id = class_attendance.school_id
    )
  );

DROP POLICY IF EXISTS "Students insert own class attendance" ON public.class_attendance;
DROP POLICY IF EXISTS "Students update own class attendance" ON public.class_attendance;
DROP POLICY IF EXISTS "Students insert own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Students update own attendance" ON public.attendance;

-- Homework grades stay with the assigned teacher. This trigger is additional
-- to enforce_submission_grade and still rejects a student writing a grade.
-- Exercise points, XP, and purchases are separate tables and do not write this grade.

CREATE OR REPLACE FUNCTION public.reject_student_grade()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id THEN
    IF TG_OP = 'INSERT' AND (
      NEW.grade IS NOT NULL
      OR NEW.teacher_comment IS NOT NULL
      OR NEW.status IS DISTINCT FROM 'pending'
    ) THEN
      RAISE EXCEPTION 'students cannot set a grade';
    END IF;
    IF TG_OP = 'UPDATE' AND (
      NEW.grade IS DISTINCT FROM OLD.grade
      OR NEW.teacher_comment IS DISTINCT FROM OLD.teacher_comment
      OR NEW.status IS DISTINCT FROM OLD.status
    ) THEN
      RAISE EXCEPTION 'students cannot set a grade';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS homework_submissions_student_grade ON public.homework_submissions;
CREATE TRIGGER homework_submissions_student_grade
  BEFORE INSERT OR UPDATE ON public.homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public.reject_student_grade();

-- Active parent links only. A revoked row does not open the child's records.

DROP POLICY IF EXISTS "Parents can view own links" ON public.parent_student;
CREATE POLICY "Parents can view own links"
  ON public.parent_student
  FOR SELECT TO authenticated
  USING (auth.uid() = parent_id AND status = 'active');

DROP POLICY IF EXISTS "Parents view children results" ON public.results;
CREATE POLICY "Parents view children results"
  ON public.results
  FOR SELECT TO authenticated
  USING (public.parent_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Parents view children profiles" ON public.profiles;
CREATE POLICY "Parents view children profiles"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (public.parent_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Parents view child moods" ON public.daily_moods;
CREATE POLICY "Parents view child moods"
  ON public.daily_moods
  FOR SELECT TO authenticated
  USING (public.parent_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Parents view children recos" ON public.teacher_recommendations;
CREATE POLICY "Parents view children recos"
  ON public.teacher_recommendations
  FOR SELECT TO authenticated
  USING (public.parent_of(auth.uid(), student_id));

DROP POLICY IF EXISTS "Forum participants view profiles" ON public.profiles;

-- Live sessions: teacher ownership, class or course, instructions, optional link.

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS access_instructions text,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.live_sessions
    WHERE status NOT IN ('scheduled', 'live', 'ended', 'cancelled')
  ) THEN
    ALTER TABLE public.live_sessions DROP CONSTRAINT IF EXISTS live_sessions_status_check;
    ALTER TABLE public.live_sessions
      ADD CONSTRAINT live_sessions_status_check
      CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled'));
  END IF;
END $$;

ALTER TABLE public.live_sessions DROP CONSTRAINT IF EXISTS live_sessions_ends_at_check;
ALTER TABLE public.live_sessions
  ADD CONSTRAINT live_sessions_ends_at_check
  CHECK (ends_at IS NULL OR ends_at >= scheduled_at);

-- A school-scoped course and a class on the same session must share a school.
-- Course-only sessions stay valid. Catalog courses have no school to compare.

CREATE OR REPLACE FUNCTION public.session_class_in_course_school(target_course uuid, target_class uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_class IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.courses AS course
      JOIN public.classes AS class_row ON class_row.id = target_class
      WHERE course.id = target_course
        AND (course.school_id IS NULL OR class_row.school_id = course.school_id)
    );
$$;

REVOKE ALL ON FUNCTION public.session_class_in_course_school(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_class_in_course_school(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_live_session()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.teacher_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'session owner must be the signed-in teacher';
  END IF;
  IF auth.uid() IS NOT NULL
     AND public.has_role(auth.uid(), 'student'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'students cannot create a session';
  END IF;
  IF NOT public.session_class_in_course_school(NEW.course_id, NEW.class_id) THEN
    RAISE EXCEPTION 'session class is outside the course school';
  END IF;
  IF NEW.status NOT IN ('scheduled', 'live', 'ended', 'cancelled') THEN
    RAISE EXCEPTION 'session status is not available';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_sessions_owner ON public.live_sessions;
CREATE TRIGGER live_sessions_owner
  BEFORE INSERT OR UPDATE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_live_session();

DROP POLICY IF EXISTS "Teachers manage own sessions" ON public.live_sessions;
CREATE POLICY "Teachers manage own sessions"
  ON public.live_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (
    auth.uid() = teacher_id
    AND public.session_class_in_course_school(course_id, class_id)
    AND EXISTS (
      SELECT 1
      FROM public.courses AS course
      WHERE course.id = live_sessions.course_id
        AND course.teacher_id = auth.uid()
        AND (
          course.school_id IS NULL
          OR public.active_membership(auth.uid(), course.school_id, 'teacher')
        )
    )
    AND (
      class_id IS NULL
      OR public.teaches_class(auth.uid(), class_id)
    )
  );

-- Reads enrollment and class rows as the owner so a parent or student is not
-- blocked by the inner table's policies.

CREATE OR REPLACE FUNCTION public.can_read_live_session(target_course uuid, target_class uuid, target_teacher uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = target_teacher
    OR (
      public.is_platform_admin(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.courses AS course
        WHERE course.id = target_course AND course.school_id IS NULL
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.courses AS course
      WHERE course.id = target_course
        AND public.active_membership(auth.uid(), course.school_id, 'school_admin')
    )
    OR (
      target_class IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.classes AS class_row
        WHERE class_row.id = target_class
          AND public.active_membership(auth.uid(), class_row.school_id, 'school_admin')
      )
    )
    OR (target_class IS NULL AND EXISTS (
      SELECT 1 FROM public.course_enrollments AS enrollment
      WHERE enrollment.course_id = target_course
        AND enrollment.user_id = auth.uid()
    ))
    OR (target_class IS NULL AND EXISTS (
      SELECT 1 FROM public.course_enrollments AS enrollment
      WHERE enrollment.course_id = target_course
        AND public.parent_of(auth.uid(), enrollment.user_id)
    ))
    OR (target_class IS NOT NULL AND public.student_in_class(auth.uid(), target_class))
    OR (target_class IS NOT NULL AND public.parent_of_class(auth.uid(), target_class))
    OR (target_class IS NULL AND EXISTS (
      SELECT 1 FROM public.class_subjects AS offering
      WHERE offering.course_id = target_course
        AND (
          public.student_in_class(auth.uid(), offering.class_id)
          OR public.parent_of_class(auth.uid(), offering.class_id)
        )
    ));
$$;

REVOKE ALL ON FUNCTION public.can_read_live_session(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_live_session(uuid, uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Admins manage sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Platform admins read catalog sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "School admins read school sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Enrolled view sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Parents view children sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Readers view authorized sessions" ON public.live_sessions;
CREATE POLICY "Readers view authorized sessions"
  ON public.live_sessions
  FOR SELECT TO authenticated
  USING (public.can_read_live_session(course_id, class_id, teacher_id));

-- Messages: the signed-in user is the sender. Participants read the thread.

CREATE OR REPLACE FUNCTION public.enforce_message_sender()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND NEW.sender_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'sender must be the signed-in user';
    END IF;
    -- active_member_of_school reads memberships as the owner, so a hidden
    -- recipient row is not treated as "no membership". A school-scoped sender
    -- is rejected unless a shared school or a parent link is confirmed.
    IF auth.uid() IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM public.school_memberships AS sender_membership
         WHERE sender_membership.user_id = NEW.sender_id
           AND sender_membership.status = 'active'
       )
       AND NOT public.parent_of(NEW.sender_id, NEW.receiver_id)
       AND NOT public.parent_of(NEW.receiver_id, NEW.sender_id)
       AND NOT EXISTS (
         SELECT 1
         FROM public.school_memberships AS sender_membership
         WHERE sender_membership.user_id = NEW.sender_id
           AND sender_membership.status = 'active'
           AND public.active_member_of_school(NEW.receiver_id, sender_membership.school_id)
       ) THEN
      RAISE EXCEPTION 'message stays inside a shared school';
    END IF;
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() NOT IN (OLD.sender_id, OLD.receiver_id) THEN
    RAISE EXCEPTION 'only a participant can update a message';
  END IF;
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
     OR NEW.content IS DISTINCT FROM OLD.content THEN
    RAISE EXCEPTION 'message content is fixed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_sender ON public.messages;
CREATE TRIGGER messages_sender
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_sender();

DROP POLICY IF EXISTS "Users view own messages" ON public.messages;
CREATE POLICY "Users view own messages"
  ON public.messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Authenticated users send messages" ON public.messages;
DROP POLICY IF EXISTS "Parents and teachers send messages" ON public.messages;
CREATE POLICY "Authenticated users send messages"
  ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users update own received messages" ON public.messages;
CREATE POLICY "Users update own received messages"
  ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Notifications: a signed-in user cannot insert or close someone else's row.
-- Announcements go through publish_announcement, which runs as the owner.

CREATE OR REPLACE FUNCTION public.protect_notification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IS DISTINCT FROM 'authenticated' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'cannot insert a notification for another user';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF auth.uid() IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'cannot change another notification';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.message IS DISTINCT FROM OLD.message
       OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW.related_id IS DISTINCT FROM OLD.related_id THEN
      RAISE EXCEPTION 'notification content is fixed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_protect ON public.notifications;
CREATE TRIGGER notifications_protect
  BEFORE INSERT OR UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.protect_notification();

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins manage all notifications" ON public.notifications;
DROP POLICY IF EXISTS "No client notification insert" ON public.notifications;
CREATE POLICY "No client notification insert"
  ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.publish_announcement(_title text, _message text, _audience text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _audience NOT IN ('all', 'student', 'parent', 'teacher')
     OR _title IS NULL OR btrim(_title) = '' OR char_length(_title) > 120
     OR _message IS NULL OR btrim(_message) = '' OR char_length(_message) > 500 THEN
    RAISE EXCEPTION 'announcement is incomplete';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT role_row.user_id, btrim(_title), btrim(_message), 'announcement'
  FROM public.user_roles AS role_row
  WHERE _audience = 'all' OR role_row.role::text = _audience;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_announcement(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_announcement(text, text, text) TO authenticated;

CREATE OR REPLACE VIEW public.notification_preview
WITH (security_barrier = true, security_invoker = true) AS
SELECT id, user_id, title, left(message, 140) AS message, type, is_read, created_at
FROM public.notifications;

GRANT SELECT ON public.notification_preview TO authenticated;

-- Forums stay in the caller's school when they belong to one.
-- profile_labels exposes a display name for forum and message lists.

ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools (id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.forum_visible(target_school uuid, roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles AS role_row
      WHERE role_row.user_id = auth.uid()
        AND role_row.role::text = ANY (roles)
    )
    AND (
      target_school IS NULL
      OR public.active_member_of_school(auth.uid(), target_school)
    );
$$;

REVOKE ALL ON FUNCTION public.forum_visible(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forum_visible(uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_forum_author()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'author must be the signed-in user';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.school_id IS DISTINCT FROM OLD.school_id THEN
    RAISE EXCEPTION 'forum school is fixed';
  END IF;
  IF NEW.school_id IS NOT NULL AND NOT public.active_member_of_school(auth.uid(), NEW.school_id) THEN
    RAISE EXCEPTION 'forum school is outside your membership';
  END IF;
  IF NEW.school_id IS NULL
     AND NOT public.is_platform_admin(auth.uid())
     AND EXISTS (
       SELECT 1
       FROM public.school_memberships AS membership
       WHERE membership.user_id = auth.uid()
         AND membership.status = 'active'
     ) THEN
    RAISE EXCEPTION 'choose your school forum';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_posts_author ON public.forum_posts;
CREATE TRIGGER forum_posts_author
  BEFORE INSERT OR UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_forum_author();

CREATE OR REPLACE FUNCTION public.enforce_forum_reply_author()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'author must be the signed-in user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_replies_author ON public.forum_replies;
CREATE TRIGGER forum_replies_author
  BEFORE INSERT OR UPDATE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.enforce_forum_reply_author();

DROP POLICY IF EXISTS "Users view forum posts for their role" ON public.forum_posts;
CREATE POLICY "Users view forum posts for their role"
  ON public.forum_posts
  FOR SELECT TO authenticated
  USING (public.forum_visible(school_id, role_visibility));

DROP POLICY IF EXISTS "Users create forum posts" ON public.forum_posts;
CREATE POLICY "Users create forum posts"
  ON public.forum_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.forum_visible(school_id, role_visibility)
  );

DROP POLICY IF EXISTS "Users update own posts" ON public.forum_posts;
CREATE POLICY "Users update own posts"
  ON public.forum_posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.forum_visible(school_id, role_visibility));

DROP POLICY IF EXISTS "Users view replies" ON public.forum_replies;
CREATE POLICY "Users view replies"
  ON public.forum_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.forum_posts AS post
      WHERE post.id = forum_replies.post_id
        AND public.forum_visible(post.school_id, post.role_visibility)
    )
  );

DROP POLICY IF EXISTS "Users create replies" ON public.forum_replies;
CREATE POLICY "Users create replies"
  ON public.forum_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.forum_posts AS post
      WHERE post.id = forum_replies.post_id
        AND public.forum_visible(post.school_id, post.role_visibility)
    )
  );

CREATE OR REPLACE VIEW public.profile_labels
WITH (security_barrier = true) AS
SELECT profile.user_id, profile.full_name, profile.avatar_url
FROM public.profiles AS profile
WHERE profile.user_id = auth.uid()
   OR public.parent_of(auth.uid(), profile.user_id)
   OR EXISTS (
     SELECT 1
     FROM public.messages AS message
     WHERE auth.uid() IN (message.sender_id, message.receiver_id)
       AND profile.user_id IN (message.sender_id, message.receiver_id)
   )
   OR public.parent_of(profile.user_id, auth.uid())
   OR EXISTS (
     SELECT 1
     FROM public.forum_posts AS post
     WHERE post.user_id = profile.user_id
       AND public.forum_visible(post.school_id, post.role_visibility)
   )
   OR EXISTS (
     SELECT 1
     FROM public.forum_replies AS reply
     JOIN public.forum_posts AS post ON post.id = reply.post_id
     WHERE reply.user_id = profile.user_id
       AND public.forum_visible(post.school_id, post.role_visibility)
   )
   OR EXISTS (
     SELECT 1
     FROM public.student_enrollments AS viewer_enrollment
     JOIN public.school_memberships AS viewer_membership
       ON viewer_membership.id = viewer_enrollment.membership_id
     JOIN public.student_enrollments AS peer_enrollment
       ON peer_enrollment.class_id = viewer_enrollment.class_id
      AND peer_enrollment.status = 'active'
     JOIN public.school_memberships AS peer_membership
       ON peer_membership.id = peer_enrollment.membership_id
     WHERE viewer_enrollment.status = 'active'
       AND viewer_membership.user_id = auth.uid()
       AND viewer_membership.status = 'active'
       AND viewer_membership.membership_role = 'student'
       AND peer_membership.user_id = profile.user_id
       AND peer_membership.status = 'active'
       AND peer_membership.membership_role = 'student'
       AND peer_membership.user_id <> auth.uid()
   )
   OR EXISTS (
     SELECT 1
     FROM public.teacher_assignments AS assignment
     JOIN public.school_memberships AS teacher_membership
       ON teacher_membership.id = assignment.membership_id
     JOIN public.class_subjects AS offering
       ON offering.id = assignment.class_subject_id
     JOIN public.student_enrollments AS enrollment
       ON enrollment.class_id = offering.class_id
      AND enrollment.status = 'active'
     JOIN public.school_memberships AS student_membership
       ON student_membership.id = enrollment.membership_id
     WHERE assignment.ends_on IS NULL
       AND teacher_membership.status = 'active'
       AND student_membership.status = 'active'
       AND (
         (
           teacher_membership.user_id = profile.user_id
           AND (
             student_membership.user_id = auth.uid()
             OR public.parent_of(auth.uid(), student_membership.user_id)
           )
         )
         OR (
           student_membership.user_id = profile.user_id
           AND public.teaches_class(auth.uid(), enrollment.class_id)
         )
       )
   );

GRANT SELECT ON public.profile_labels TO authenticated;

-- Support tickets follow the requester and staff of the same school.
-- A platform admin reads catalog tickets whose school is unset.

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools (id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.support_ticket_visible(target_ticket uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.support_tickets AS ticket
    WHERE ticket.id = target_ticket
      AND (
        ticket.user_id = auth.uid()
        OR (ticket.school_id IS NULL AND public.is_platform_admin(auth.uid()))
        OR (
          ticket.school_id IS NOT NULL
          AND (
            public.active_membership(auth.uid(), ticket.school_id, 'school_admin')
            OR public.active_membership(auth.uid(), ticket.school_id, 'teacher')
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.support_ticket_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_ticket_visible(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_support_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'ticket owner must be the signed-in user';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.school_id IS DISTINCT FROM OLD.school_id
  ) THEN
    RAISE EXCEPTION 'ticket owner is fixed';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.school_id IS NOT NULL AND NOT public.active_member_of_school(NEW.user_id, NEW.school_id) THEN
    RAISE EXCEPTION 'ticket school is outside the requester membership';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_tickets_owner ON public.support_tickets;
CREATE TRIGGER support_tickets_owner
  BEFORE INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_support_owner();

CREATE OR REPLACE FUNCTION public.enforce_support_sender()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND NEW.sender_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'sender must be the signed-in user';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id THEN
    RAISE EXCEPTION 'sender is fixed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_messages_sender ON public.support_messages;
CREATE TRIGGER support_messages_sender
  BEFORE INSERT OR UPDATE ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_support_sender();

DROP POLICY IF EXISTS "Users view own tickets" ON public.support_tickets;
CREATE POLICY "Users view own tickets"
  ON public.support_tickets
  FOR SELECT TO authenticated
  USING (public.support_ticket_visible(id));

DROP POLICY IF EXISTS "Staff view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users create tickets" ON public.support_tickets;
CREATE POLICY "Users create tickets"
  ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      school_id IS NULL
      OR public.active_member_of_school(auth.uid(), school_id)
    )
  );

DROP POLICY IF EXISTS "Owner updates ticket" ON public.support_tickets;
CREATE POLICY "Owner updates ticket"
  ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff manage tickets" ON public.support_tickets;
CREATE POLICY "Staff manage tickets"
  ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.support_ticket_visible(id))
  WITH CHECK (public.support_ticket_visible(id));

DROP POLICY IF EXISTS "Participants view messages" ON public.support_messages;
CREATE POLICY "Participants view messages"
  ON public.support_messages
  FOR SELECT TO authenticated
  USING (public.support_ticket_visible(ticket_id));

DROP POLICY IF EXISTS "Participants send messages" ON public.support_messages;
CREATE POLICY "Participants send messages"
  ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.support_ticket_visible(ticket_id)
  );

DROP POLICY IF EXISTS "Mark messages read" ON public.support_messages;
CREATE POLICY "Mark messages read"
  ON public.support_messages
  FOR UPDATE TO authenticated
  USING (public.support_ticket_visible(ticket_id))
  WITH CHECK (public.support_ticket_visible(ticket_id));

DROP POLICY IF EXISTS "Typing visible to participants" ON public.support_typing;
CREATE POLICY "Typing visible to participants"
  ON public.support_typing
  FOR SELECT TO authenticated
  USING (public.support_ticket_visible(ticket_id));
