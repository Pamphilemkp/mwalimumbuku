-- Scope existing records by school without assigning a school to current rows.
-- courses.school_id, assignments.class_subject_id, and parent_student.school_id
-- stay null on every existing row. Null means the shared catalog or an
-- unscoped family link. A request cannot choose another school's id.

ALTER TABLE public.courses
  ADD COLUMN school_id uuid REFERENCES public.schools (id) ON DELETE RESTRICT;

CREATE INDEX courses_school_id_idx ON public.courses (school_id);

ALTER TABLE public.assignments
  ADD COLUMN class_subject_id uuid REFERENCES public.class_subjects (id) ON DELETE RESTRICT;

CREATE INDEX assignments_class_subject_id_idx ON public.assignments (class_subject_id);

ALTER TABLE public.parent_student
  ADD COLUMN school_id uuid REFERENCES public.schools (id) ON DELETE RESTRICT,
  ADD COLUMN relationship text,
  ADD COLUMN status text NOT NULL DEFAULT 'active',
  ADD CONSTRAINT parent_student_relationship_check
    CHECK (relationship IS NULL OR relationship IN ('mother', 'father', 'guardian', 'other')),
  ADD CONSTRAINT parent_student_status_check
    CHECK (status IN ('active', 'revoked'));

CREATE INDEX parent_student_student_id_idx ON public.parent_student (student_id);
CREATE INDEX parent_student_school_student_idx ON public.parent_student (school_id, student_id);
CREATE INDEX homework_submissions_assignment_user_idx
  ON public.homework_submissions (assignment_id, user_id);

CREATE OR REPLACE FUNCTION public.parent_of(uid uuid, student_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_student AS link
    WHERE link.parent_id = uid
      AND link.student_id = student_user_id
      AND link.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_school_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF NEW.status = 'left' AND NEW.ended_on IS NULL THEN
    NEW.ended_on := current_date;
  END IF;

  IF NEW.status = 'active' THEN
    NEW.ended_on := NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.school_id IS DISTINCT FROM OLD.school_id
       OR NEW.membership_role IS DISTINCT FROM OLD.membership_role THEN
      RAISE EXCEPTION 'membership identity is fixed';
    END IF;
  END IF;

  IF NEW.membership_role = 'teacher' AND NOT public.has_role(NEW.user_id, 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'teacher membership requires the teacher role';
  END IF;

  IF NEW.membership_role = 'student' AND NOT public.has_role(NEW.user_id, 'student'::public.app_role) THEN
    RAISE EXCEPTION 'student membership requires the student role';
  END IF;

  IF NEW.membership_role = 'parent' THEN
    IF NOT public.has_role(NEW.user_id, 'parent'::public.app_role) THEN
      RAISE EXCEPTION 'parent membership requires the parent role';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.parent_student AS link
      JOIN public.school_memberships AS child
        ON child.user_id = link.student_id
       AND child.school_id = NEW.school_id
       AND child.membership_role = 'student'
       AND child.status = 'active'
      WHERE link.parent_id = NEW.user_id
        AND link.school_id = NEW.school_id
        AND link.status = 'active'
    ) THEN
      RAISE EXCEPTION 'parent membership follows a child at that school';
    END IF;
  END IF;

  IF _caller IS NOT NULL AND NEW.user_id = _caller AND NEW.membership_role IN ('teacher', 'school_admin') THEN
    RAISE EXCEPTION 'a user cannot grant themselves a staff membership';
  END IF;

  IF NEW.membership_role = 'school_admin'
     AND _caller IS NOT NULL
     AND NOT public.is_platform_admin(_caller)
     AND NOT public.has_role(NEW.user_id, 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'only a platform administrator can appoint this school administrator';
  END IF;

  IF _caller IS NOT NULL
     AND NEW.user_id = _caller
     AND NEW.membership_role = 'student'
     AND NOT public.is_platform_admin(_caller)
     AND NOT public.active_membership(_caller, NEW.school_id, 'school_admin') THEN
    IF TG_OP <> 'INSERT' OR NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'a student cannot activate their own membership';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_class_subject_school()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _class_school uuid;
  _subject_school uuid;
  _course_school uuid;
BEGIN
  SELECT class_row.school_id INTO _class_school
  FROM public.classes AS class_row
  WHERE class_row.id = NEW.class_id;

  SELECT subject.school_id INTO _subject_school
  FROM public.subjects AS subject
  WHERE subject.id = NEW.subject_id;

  IF _class_school IS NULL OR _subject_school IS NULL
     OR _class_school <> NEW.school_id
     OR _subject_school <> NEW.school_id THEN
    RAISE EXCEPTION 'class subject school does not match its class and subject';
  END IF;

  IF NEW.course_id IS NOT NULL THEN
    SELECT course.school_id INTO _course_school
    FROM public.courses AS course
    WHERE course.id = NEW.course_id;

    IF _course_school IS NULL OR _course_school <> NEW.school_id THEN
      RAISE EXCEPTION 'a class subject can only use a course from the same school';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enroll_class_students_in_course()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  SELECT membership.user_id INTO _user
  FROM public.school_memberships AS membership
  WHERE membership.id = NEW.membership_id;

  INSERT INTO public.course_enrollments (course_id, user_id)
  SELECT offering.course_id, _user
  FROM public.class_subjects AS offering
  JOIN public.courses AS course ON course.id = offering.course_id
  WHERE offering.class_id = NEW.class_id
    AND offering.course_id IS NOT NULL
    AND course.school_id = NEW.school_id
  ON CONFLICT (course_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enroll_roster_in_class_course()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.course_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.course_id IS NOT DISTINCT FROM OLD.course_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.course_enrollments (course_id, user_id)
  SELECT NEW.course_id, membership.user_id
  FROM public.student_enrollments AS enrollment
  JOIN public.school_memberships AS membership
    ON membership.id = enrollment.membership_id
  JOIN public.courses AS course ON course.id = NEW.course_id
  WHERE enrollment.class_id = NEW.class_id
    AND enrollment.status = 'active'
    AND enrollment.school_id = NEW.school_id
    AND course.school_id = NEW.school_id
  ON CONFLICT (course_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_course_school()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.school_id IS NOT NULL
     AND NEW.school_id IS DISTINCT FROM OLD.school_id THEN
    RAISE EXCEPTION 'course school is fixed';
  END IF;

  IF NEW.school_id IS NOT NULL
     AND auth.uid() IS NOT NULL
     AND NOT public.active_membership(auth.uid(), NEW.school_id, 'teacher')
     AND NOT public.active_membership(auth.uid(), NEW.school_id, 'school_admin') THEN
    RAISE EXCEPTION 'course school is not one of your schools';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER courses_school
  BEFORE INSERT OR UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_course_school();

CREATE OR REPLACE FUNCTION public.enforce_assignment_class()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _offering_school uuid;
  _offering_course uuid;
  _course_school uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.class_subject_id IS NOT NULL
     AND NEW.class_subject_id IS DISTINCT FROM OLD.class_subject_id THEN
    RAISE EXCEPTION 'class assignment is fixed';
  END IF;

  IF NEW.class_subject_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT offering.school_id, offering.course_id
    INTO _offering_school, _offering_course
  FROM public.class_subjects AS offering
  WHERE offering.id = NEW.class_subject_id;

  SELECT course.school_id INTO _course_school
  FROM public.courses AS course
  WHERE course.id = NEW.course_id;

  IF _offering_school IS NULL
     OR _course_school IS NULL
     OR _offering_school <> _course_school
     OR _offering_course IS DISTINCT FROM NEW.course_id THEN
    RAISE EXCEPTION 'class assignment must use the class subject course from the same school';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER assignments_class
  BEFORE INSERT OR UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_assignment_class();

CREATE OR REPLACE FUNCTION public.enforce_parent_link_school()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _school uuid;
BEGIN
  SELECT membership.school_id INTO _school
  FROM public.school_memberships AS membership
  WHERE membership.user_id = NEW.student_id
    AND membership.membership_role = 'student'
    AND membership.status = 'active';

  IF TG_OP = 'UPDATE' THEN
    IF NEW.parent_id IS DISTINCT FROM OLD.parent_id
       OR NEW.student_id IS DISTINCT FROM OLD.student_id THEN
      RAISE EXCEPTION 'parent link identity is fixed';
    END IF;
    IF OLD.school_id IS NOT NULL AND NEW.school_id IS DISTINCT FROM OLD.school_id THEN
      RAISE EXCEPTION 'parent link school is fixed';
    END IF;
  END IF;

  IF NEW.school_id IS NOT NULL AND NEW.school_id IS DISTINCT FROM _school THEN
    RAISE EXCEPTION 'parent link school does not match the student membership';
  END IF;

  -- A new link omits the school. The student's membership supplies it.
  -- Existing rows are not rewritten, so a null school stays null.
  IF TG_OP = 'INSERT' AND NEW.school_id IS NULL THEN
    NEW.school_id := _school;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER parent_student_school
  BEFORE INSERT OR UPDATE ON public.parent_student
  FOR EACH ROW EXECUTE FUNCTION public.enforce_parent_link_school();

CREATE OR REPLACE FUNCTION public.caller_can_grade_assignment(target_assignment uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments AS assignment
    JOIN public.courses AS course ON course.id = assignment.course_id
    WHERE assignment.id = target_assignment
      AND assignment.class_subject_id IS NULL
      AND course.teacher_id = auth.uid()
      AND (
        course.school_id IS NULL
        OR public.active_membership(auth.uid(), course.school_id, 'teacher')
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.assignments AS assignment
    WHERE assignment.id = target_assignment
      AND assignment.class_subject_id IS NOT NULL
      AND public.teaches_class_subject(auth.uid(), assignment.class_subject_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_submission_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.assignment_id IS DISTINCT FROM OLD.assignment_id THEN
      RAISE EXCEPTION 'submission owner is fixed';
    END IF;
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.caller_can_grade_assignment(NEW.assignment_id) THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.grade IS NOT NULL
         OR NEW.status IS DISTINCT FROM 'pending'
         OR NEW.teacher_comment IS NOT NULL THEN
        RAISE EXCEPTION 'students cannot set a grade';
      END IF;
    ELSIF NEW.grade IS DISTINCT FROM OLD.grade
          OR NEW.status IS DISTINCT FROM OLD.status
          OR NEW.teacher_comment IS DISTINCT FROM OLD.teacher_comment THEN
      RAISE EXCEPTION 'only the assigned teacher can grade';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER homework_submissions_grade
  BEFORE INSERT OR UPDATE ON public.homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_submission_grade();

REVOKE ALL ON FUNCTION public.caller_can_grade_assignment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caller_can_grade_assignment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.link_parent_by_student_code(
  p_student_code text,
  p_relationship text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _parent uuid := auth.uid();
  _student uuid;
  _school uuid;
  _link uuid;
BEGIN
  IF _parent IS NULL OR NOT public.has_role(_parent, 'parent'::public.app_role) THEN
    RAISE EXCEPTION 'only a parent can link a child';
  END IF;

  IF p_relationship NOT IN ('mother', 'father', 'guardian', 'other') THEN
    RAISE EXCEPTION 'invalid relationship';
  END IF;

  SELECT profile.user_id INTO _student
  FROM public.profiles AS profile
  WHERE profile.student_code = p_student_code;

  IF _student IS NOT NULL THEN
    SELECT membership.school_id INTO _school
    FROM public.school_memberships AS membership
    WHERE membership.user_id = _student
      AND membership.membership_role = 'student'
      AND membership.status = 'active';
  END IF;

  IF _student IS NULL OR _school IS NULL THEN
    RAISE EXCEPTION 'student code is not an active student';
  END IF;

  INSERT INTO public.parent_student (parent_id, student_id, school_id, relationship, status)
  VALUES (_parent, _student, _school, p_relationship, 'active')
  ON CONFLICT (parent_id, student_id) DO UPDATE
    SET school_id = EXCLUDED.school_id,
        relationship = EXCLUDED.relationship,
        status = 'active'
  RETURNING id INTO _link;

  INSERT INTO public.school_memberships (
    school_id, user_id, membership_role, status, invited_by, started_on
  )
  VALUES (_school, _parent, 'parent', 'active', _parent, current_date)
  ON CONFLICT (school_id, user_id, membership_role) DO UPDATE
    SET status = 'active',
        ended_on = NULL;

  RETURN _link;
END;
$$;

REVOKE ALL ON FUNCTION public.link_parent_by_student_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_parent_by_student_code(text, text) TO authenticated;

-- Courses. Catalog rows stay open. A school id is checked against membership.

DROP POLICY IF EXISTS "Admins manage all courses" ON public.courses;
DROP POLICY IF EXISTS "Published courses visible" ON public.courses;
DROP POLICY IF EXISTS "Teachers manage own courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers delete own courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers insert courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers update own courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers view own courses" ON public.courses;

CREATE POLICY "Platform admins manage catalog courses"
  ON public.courses
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()) AND school_id IS NULL)
  WITH CHECK (public.is_platform_admin(auth.uid()) AND school_id IS NULL);

CREATE POLICY "Platform admins read school courses"
  ON public.courses
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()) AND school_id IS NOT NULL);

CREATE POLICY "Published catalog courses visible"
  ON public.courses
  FOR SELECT TO authenticated
  USING (is_published = true AND school_id IS NULL);

CREATE POLICY "School members read published school courses"
  ON public.courses
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND school_id IS NOT NULL
    AND public.active_member_of_school(auth.uid(), school_id)
  );

CREATE POLICY "Parents read a linked class course"
  ON public.courses
  FOR SELECT TO authenticated
  USING (
    school_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.class_subjects AS offering
      WHERE offering.course_id = courses.id
        AND public.parent_of_class(auth.uid(), offering.class_id)
    )
  );

CREATE POLICY "School admins read school courses"
  ON public.courses
  FOR SELECT TO authenticated
  USING (
    school_id IS NOT NULL
    AND public.active_membership(auth.uid(), school_id, 'school_admin')
  );

CREATE POLICY "School admins update school courses"
  ON public.courses
  FOR UPDATE TO authenticated
  USING (
    school_id IS NOT NULL
    AND public.active_membership(auth.uid(), school_id, 'school_admin')
  )
  WITH CHECK (
    school_id IS NOT NULL
    AND public.active_membership(auth.uid(), school_id, 'school_admin')
  );

CREATE POLICY "Teachers read own courses"
  ON public.courses
  FOR SELECT TO authenticated
  USING (
    auth.uid() = teacher_id
    AND (
      school_id IS NULL
      OR public.active_membership(auth.uid(), school_id, 'teacher')
      OR public.active_membership(auth.uid(), school_id, 'school_admin')
    )
  );

CREATE POLICY "Teachers insert courses"
  ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = teacher_id
    AND public.has_role(auth.uid(), 'teacher'::public.app_role)
    AND (
      school_id IS NULL
      OR public.active_membership(auth.uid(), school_id, 'teacher')
    )
  );

CREATE POLICY "Teachers update own courses"
  ON public.courses
  FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (
    auth.uid() = teacher_id
    AND public.has_role(auth.uid(), 'teacher'::public.app_role)
    AND (
      school_id IS NULL
      OR public.active_membership(auth.uid(), school_id, 'teacher')
    )
  );

CREATE POLICY "Teachers delete own catalog courses"
  ON public.courses
  FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id AND school_id IS NULL);

-- Enrollments. Open signup stays on the catalog only.

DROP POLICY IF EXISTS "Admins manage enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Students enroll in published courses" ON public.course_enrollments;
DROP POLICY IF EXISTS "Students unenroll" ON public.course_enrollments;

CREATE POLICY "Platform admins manage catalog enrollments"
  ON public.course_enrollments
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.courses AS course
      WHERE course.id = course_enrollments.course_id
        AND course.school_id IS NULL
    )
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.courses AS course
      WHERE course.id = course_enrollments.course_id
        AND course.school_id IS NULL
    )
  );

CREATE POLICY "Platform admins read enrollments"
  ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Students enroll in published courses"
  ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.courses AS course
      WHERE course.id = course_enrollments.course_id
        AND course.is_published = true
        AND course.school_id IS NULL
    )
  );

CREATE POLICY "Students unenroll"
  ON public.course_enrollments
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.courses AS course
      WHERE course.id = course_enrollments.course_id
        AND course.school_id IS NULL
    )
  );

-- Assignments and the grade stored on homework_submissions.

DROP POLICY IF EXISTS "Admins manage assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers manage assignments" ON public.assignments;

CREATE POLICY "Platform admins manage catalog assignments"
  ON public.assignments
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    AND class_subject_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.courses AS course
      WHERE course.id = assignments.course_id
        AND course.school_id IS NULL
    )
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    AND class_subject_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.courses AS course
      WHERE course.id = assignments.course_id
        AND course.school_id IS NULL
    )
  );

CREATE POLICY "Platform admins read assignments"
  ON public.assignments
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Teachers read catalog assignments"
  ON public.assignments
  FOR SELECT TO authenticated
  USING (
    class_subject_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.courses AS course
      WHERE course.id = assignments.course_id
        AND course.teacher_id = auth.uid()
        AND (
          course.school_id IS NULL
          OR public.active_membership(auth.uid(), course.school_id, 'teacher')
        )
    )
  );

CREATE POLICY "Teachers write catalog assignments"
  ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    class_subject_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.courses AS course
      WHERE course.id = assignments.course_id
        AND course.teacher_id = auth.uid()
        AND (
          course.school_id IS NULL
          OR public.active_membership(auth.uid(), course.school_id, 'teacher')
        )
    )
  );

CREATE POLICY "Teachers update catalog assignments"
  ON public.assignments
  FOR UPDATE TO authenticated
  USING (
    class_subject_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.courses AS course
      WHERE course.id = assignments.course_id
        AND course.teacher_id = auth.uid()
        AND (
          course.school_id IS NULL
          OR public.active_membership(auth.uid(), course.school_id, 'teacher')
        )
    )
  )
  WITH CHECK (
    class_subject_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.courses AS course
      WHERE course.id = assignments.course_id
        AND course.teacher_id = auth.uid()
        AND (
          course.school_id IS NULL
          OR public.active_membership(auth.uid(), course.school_id, 'teacher')
        )
    )
  );

CREATE POLICY "Assigned teachers read class assignments"
  ON public.assignments
  FOR SELECT TO authenticated
  USING (
    class_subject_id IS NOT NULL
    AND public.teaches_class_subject(auth.uid(), class_subject_id)
  );

CREATE POLICY "Assigned teachers write class assignments"
  ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    class_subject_id IS NOT NULL
    AND public.teaches_class_subject(auth.uid(), class_subject_id)
  );

CREATE POLICY "Assigned teachers update class assignments"
  ON public.assignments
  FOR UPDATE TO authenticated
  USING (
    class_subject_id IS NOT NULL
    AND public.teaches_class_subject(auth.uid(), class_subject_id)
  )
  WITH CHECK (
    class_subject_id IS NOT NULL
    AND public.teaches_class_subject(auth.uid(), class_subject_id)
  );

CREATE POLICY "Students view assignments"
  ON public.assignments
  FOR SELECT TO authenticated
  USING (
    (
      class_subject_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.course_enrollments AS enrollment
        WHERE enrollment.course_id = assignments.course_id
          AND enrollment.user_id = auth.uid()
      )
    )
    OR (
      class_subject_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.class_subjects AS offering
        WHERE offering.id = assignments.class_subject_id
          AND public.student_in_class(auth.uid(), offering.class_id)
      )
    )
    OR public.caller_can_grade_assignment(id)
  );

CREATE POLICY "Parents read class assignments"
  ON public.assignments
  FOR SELECT TO authenticated
  USING (
    class_subject_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.class_subjects AS offering
      WHERE offering.id = assignments.class_subject_id
        AND public.parent_of_class(auth.uid(), offering.class_id)
    )
  );

CREATE POLICY "School admins read school assignments"
  ON public.assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses AS course
      WHERE course.id = assignments.course_id
        AND public.active_membership(auth.uid(), course.school_id, 'school_admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.class_subjects AS offering
      WHERE offering.id = assignments.class_subject_id
        AND public.active_membership(auth.uid(), offering.school_id, 'school_admin')
    )
  );

DROP POLICY IF EXISTS "Students view own submissions" ON public.homework_submissions;
DROP POLICY IF EXISTS "Students create own submissions" ON public.homework_submissions;
DROP POLICY IF EXISTS "Teachers view course submissions" ON public.homework_submissions;
DROP POLICY IF EXISTS "Teachers grade submissions" ON public.homework_submissions;
DROP POLICY IF EXISTS "Admins manage submissions" ON public.homework_submissions;

CREATE POLICY "Students view own submissions"
  ON public.homework_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Students create own submissions"
  ON public.homework_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND grade IS NULL
    AND status = 'pending'
    AND teacher_comment IS NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.assignments AS assignment
        JOIN public.course_enrollments AS enrollment
          ON enrollment.course_id = assignment.course_id
         AND enrollment.user_id = auth.uid()
        WHERE assignment.id = homework_submissions.assignment_id
          AND assignment.class_subject_id IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM public.assignments AS assignment
        JOIN public.class_subjects AS offering
          ON offering.id = assignment.class_subject_id
        WHERE assignment.id = homework_submissions.assignment_id
          AND public.student_in_class(auth.uid(), offering.class_id)
      )
    )
  );

CREATE POLICY "Parents read linked submissions"
  ON public.homework_submissions
  FOR SELECT TO authenticated
  USING (
    public.parent_of(auth.uid(), user_id)
    AND EXISTS (
      SELECT 1
      FROM public.assignments AS assignment
      LEFT JOIN public.courses AS course ON course.id = assignment.course_id
      WHERE assignment.id = homework_submissions.assignment_id
        AND (
          assignment.class_subject_id IS NOT NULL
          OR course.school_id IS NOT NULL
        )
    )
  );

CREATE POLICY "Teachers read gradeable submissions"
  ON public.homework_submissions
  FOR SELECT TO authenticated
  USING (public.caller_can_grade_assignment(assignment_id));

CREATE POLICY "Teachers grade submissions"
  ON public.homework_submissions
  FOR UPDATE TO authenticated
  USING (public.caller_can_grade_assignment(assignment_id))
  WITH CHECK (public.caller_can_grade_assignment(assignment_id));

CREATE POLICY "School admins read school submissions"
  ON public.homework_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assignments AS assignment
      LEFT JOIN public.courses AS course ON course.id = assignment.course_id
      LEFT JOIN public.class_subjects AS offering ON offering.id = assignment.class_subject_id
      WHERE assignment.id = homework_submissions.assignment_id
        AND (
          public.active_membership(auth.uid(), course.school_id, 'school_admin')
          OR public.active_membership(auth.uid(), offering.school_id, 'school_admin')
        )
    )
  );

CREATE POLICY "Platform admins read submissions"
  ON public.homework_submissions
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Live-session attendance. Catalog courses keep the course teacher.
-- School courses also require the student to be enrolled.

DROP POLICY IF EXISTS "Teachers manage attendance for their courses" ON public.attendance;
DROP POLICY IF EXISTS "Admins manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Parents view children attendance" ON public.attendance;

CREATE POLICY "Teachers manage attendance for their courses"
  ON public.attendance
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses AS course
      WHERE course.id = attendance.course_id
        AND course.teacher_id = auth.uid()
        AND (
          course.school_id IS NULL
          OR (
            public.active_membership(auth.uid(), course.school_id, 'teacher')
            AND (
              EXISTS (
                SELECT 1
                FROM public.course_enrollments AS enrollment
                WHERE enrollment.course_id = course.id
                  AND enrollment.user_id = attendance.student_id
              )
              OR EXISTS (
                SELECT 1
                FROM public.class_subjects AS offering
                JOIN public.student_enrollments AS enrollment
                  ON enrollment.class_id = offering.class_id
                 AND enrollment.status = 'active'
                JOIN public.school_memberships AS membership
                  ON membership.id = enrollment.membership_id
                WHERE offering.course_id = course.id
                  AND membership.user_id = attendance.student_id
                  AND membership.status = 'active'
              )
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.courses AS course
      WHERE course.id = attendance.course_id
        AND course.teacher_id = auth.uid()
        AND (
          course.school_id IS NULL
          OR (
            public.active_membership(auth.uid(), course.school_id, 'teacher')
            AND (
              EXISTS (
                SELECT 1
                FROM public.course_enrollments AS enrollment
                WHERE enrollment.course_id = course.id
                  AND enrollment.user_id = attendance.student_id
              )
              OR EXISTS (
                SELECT 1
                FROM public.class_subjects AS offering
                JOIN public.student_enrollments AS enrollment
                  ON enrollment.class_id = offering.class_id
                 AND enrollment.status = 'active'
                JOIN public.school_memberships AS membership
                  ON membership.id = enrollment.membership_id
                WHERE offering.course_id = course.id
                  AND membership.user_id = attendance.student_id
                  AND membership.status = 'active'
              )
            )
          )
        )
    )
  );

CREATE POLICY "Parents view children attendance"
  ON public.attendance
  FOR SELECT TO authenticated
  USING (public.parent_of(auth.uid(), student_id));

CREATE POLICY "School admins read school attendance"
  ON public.attendance
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses AS course
      WHERE course.id = attendance.course_id
        AND public.active_membership(auth.uid(), course.school_id, 'school_admin')
    )
  );

CREATE POLICY "Platform admins read attendance"
  ON public.attendance
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Student records.

DROP POLICY IF EXISTS "Admins manage student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Teachers view enrolled student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Parents view children student profiles" ON public.student_profiles;

CREATE POLICY "Platform admins read student profiles"
  ON public.student_profiles
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Teachers view enrolled student profiles"
  ON public.student_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_enrollments AS enrollment
      JOIN public.courses AS course ON course.id = enrollment.course_id
      WHERE enrollment.user_id = student_profiles.user_id
        AND course.teacher_id = auth.uid()
        AND course.school_id IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.student_enrollments AS enrollment
      JOIN public.school_memberships AS membership
        ON membership.id = enrollment.membership_id
      WHERE membership.user_id = student_profiles.user_id
        AND enrollment.status = 'active'
        AND public.teaches_class(auth.uid(), enrollment.class_id)
    )
  );

CREATE POLICY "Parents view children student profiles"
  ON public.student_profiles
  FOR SELECT TO authenticated
  USING (public.parent_of(auth.uid(), user_id));

CREATE POLICY "School admins read student profiles"
  ON public.student_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.school_memberships AS membership
      WHERE membership.user_id = student_profiles.user_id
        AND membership.membership_role = 'student'
        AND membership.status = 'active'
        AND public.active_membership(auth.uid(), membership.school_id, 'school_admin')
    )
  );

-- Parent links. The client does not get to pick the school.

DROP POLICY IF EXISTS "Parents can insert links" ON public.parent_student;
DROP POLICY IF EXISTS "Admins can manage all links" ON public.parent_student;

CREATE POLICY "Parents can insert links"
  ON public.parent_student
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = parent_id
    AND public.has_role(auth.uid(), 'parent'::public.app_role)
    AND school_id IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.school_memberships AS membership
      WHERE membership.user_id = parent_student.student_id
        AND membership.membership_role = 'student'
        AND membership.status = 'active'
    )
  );

CREATE POLICY "Parents revoke own links"
  ON public.parent_student
  FOR UPDATE TO authenticated
  USING (auth.uid() = parent_id AND status = 'active')
  WITH CHECK (auth.uid() = parent_id AND status = 'revoked');

CREATE POLICY "School admins read parent links"
  ON public.parent_student
  FOR SELECT TO authenticated
  USING (
    school_id IS NOT NULL
    AND public.active_membership(auth.uid(), school_id, 'school_admin')
  );

CREATE POLICY "School admins revoke parent links"
  ON public.parent_student
  FOR UPDATE TO authenticated
  USING (
    school_id IS NOT NULL
    AND status = 'active'
    AND public.active_membership(auth.uid(), school_id, 'school_admin')
  )
  WITH CHECK (
    school_id IS NOT NULL
    AND status = 'revoked'
    AND public.active_membership(auth.uid(), school_id, 'school_admin')
  );

CREATE POLICY "Platform admins read parent links"
  ON public.parent_student
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins manage unscoped parent links"
  ON public.parent_student
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()) AND school_id IS NULL)
  WITH CHECK (public.is_platform_admin(auth.uid()) AND school_id IS NULL);
