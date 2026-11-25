-- Multi-school schema.
-- Adds schools, memberships, years, classes, and isolation.
-- Does not update existing users, courses, parent links, or free-text school names.
-- Does not add a global role. School administration is a membership.

-- Helpers read membership rows as the owner so policies do not recurse.
-- A browser-supplied school id is never treated as permission: every check
-- compares auth.uid() with a membership row.

CREATE OR REPLACE FUNCTION public.is_platform_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(uid, 'admin'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.active_membership(uid uuid, target_school uuid, target_role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.school_memberships AS membership
    WHERE membership.user_id = uid
      AND membership.school_id = target_school
      AND membership.membership_role = target_role
      AND membership.status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.active_member_of_school(uid uuid, target_school uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.school_memberships AS membership
    WHERE membership.user_id = uid
      AND membership.school_id = target_school
      AND membership.status = 'active'
  );
END;
$$;

-- Until parent_student.status exists, every current link is treated as active.
-- The following migration replaces this function once that column exists.
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
  );
$$;

CREATE OR REPLACE FUNCTION public.teaches_class_subject(uid uuid, target_class_subject uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.teacher_assignments AS assignment
    JOIN public.school_memberships AS membership
      ON membership.id = assignment.membership_id
    WHERE assignment.class_subject_id = target_class_subject
      AND membership.user_id = uid
      AND membership.membership_role = 'teacher'
      AND membership.status = 'active'
      AND assignment.ends_on IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.teaches_class(uid uuid, target_class uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.teacher_assignments AS assignment
    JOIN public.class_subjects AS offering
      ON offering.id = assignment.class_subject_id
    JOIN public.school_memberships AS membership
      ON membership.id = assignment.membership_id
    WHERE offering.class_id = target_class
      AND membership.user_id = uid
      AND membership.membership_role = 'teacher'
      AND membership.status = 'active'
      AND assignment.ends_on IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.student_in_class(uid uuid, target_class uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.student_enrollments AS enrollment
    JOIN public.school_memberships AS membership
      ON membership.id = enrollment.membership_id
    WHERE enrollment.class_id = target_class
      AND enrollment.status = 'active'
      AND membership.user_id = uid
      AND membership.membership_role = 'student'
      AND membership.status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.parent_of_class(uid uuid, target_class uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.student_enrollments AS enrollment
    JOIN public.school_memberships AS membership
      ON membership.id = enrollment.membership_id
    WHERE enrollment.class_id = target_class
      AND enrollment.status = 'active'
      AND membership.status = 'active'
      AND public.parent_of(uid, membership.user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.active_membership(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.active_member_of_school(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.parent_of(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teaches_class_subject(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teaches_class(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.student_in_class(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.parent_of_class(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_membership(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_member_of_school(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.parent_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teaches_class_subject(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teaches_class(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_in_class(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.parent_of_class(uuid, uuid) TO authenticated;

-- Tables

CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.school_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  membership_role text NOT NULL CHECK (membership_role IN ('school_admin', 'teacher', 'student', 'parent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'left')),
  invited_by uuid REFERENCES auth.users (id),
  started_on date,
  ended_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, user_id, membership_role),
  CHECK (status <> 'active' OR ended_on IS NULL)
);

CREATE UNIQUE INDEX school_memberships_one_active_student
  ON public.school_memberships (user_id)
  WHERE membership_role = 'student' AND status = 'active';

CREATE INDEX school_memberships_school_status_idx
  ON public.school_memberships (school_id, status);

CREATE INDEX school_memberships_user_status_idx
  ON public.school_memberships (user_id, status);

CREATE TABLE public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (id) ON DELETE CASCADE,
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'current', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name),
  CHECK (ends_on > starts_on)
);

CREATE UNIQUE INDEX academic_years_one_current
  ON public.academic_years (school_id)
  WHERE status = 'current';

CREATE TABLE public.terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years (id) ON DELETE CASCADE,
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  sort_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (academic_year_id, name),
  CHECK (ends_on > starts_on)
);

CREATE INDEX terms_year_start_idx
  ON public.terms (academic_year_id, starts_on);

CREATE TABLE public.grade_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);

CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years (id) ON DELETE CASCADE,
  grade_level_id uuid NOT NULL REFERENCES public.grade_levels (id) ON DELETE RESTRICT,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (academic_year_id, grade_level_id, name)
);

CREATE INDEX classes_school_year_idx
  ON public.classes (school_id, academic_year_id);

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);

CREATE TABLE public.class_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects (id) ON DELETE RESTRICT,
  course_id uuid REFERENCES public.courses (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, subject_id)
);

CREATE INDEX class_subjects_class_idx ON public.class_subjects (class_id);
CREATE INDEX class_subjects_subject_idx ON public.class_subjects (subject_id);

CREATE TABLE public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (id) ON DELETE CASCADE,
  class_subject_id uuid NOT NULL REFERENCES public.class_subjects (id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.school_memberships (id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT true,
  starts_on date,
  ends_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_subject_id, membership_id)
);

CREATE UNIQUE INDEX teacher_assignments_one_primary
  ON public.teacher_assignments (class_subject_id)
  WHERE is_primary AND ends_on IS NULL;

CREATE INDEX teacher_assignments_membership_idx
  ON public.teacher_assignments (membership_id);

CREATE TABLE public.student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.school_memberships (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'completed')),
  enrolled_on date NOT NULL,
  withdrawn_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, membership_id)
);

CREATE UNIQUE INDEX student_enrollments_one_active_class
  ON public.student_enrollments (academic_year_id, membership_id)
  WHERE status = 'active';

CREATE INDEX student_enrollments_class_status_idx
  ON public.student_enrollments (class_id, status);

CREATE TABLE public.class_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.school_memberships (id) ON DELETE CASCADE,
  session_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by uuid NOT NULL REFERENCES public.school_memberships (id),
  notes text,
  marked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, membership_id, session_date)
);

CREATE INDEX class_attendance_register_idx
  ON public.class_attendance (class_id, session_date);

-- Integrity triggers. They reject a school id that does not match the parent row.

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
        AND link.student_id <> NEW.user_id
        AND public.parent_of(NEW.user_id, link.student_id)
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

CREATE TRIGGER school_memberships_enforce
  BEFORE INSERT OR UPDATE ON public.school_memberships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_school_membership();

CREATE TRIGGER school_memberships_updated_at
  BEFORE UPDATE ON public.school_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_school_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'school creator is fixed';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND auth.uid() IS NOT NULL
       AND NOT public.is_platform_admin(auth.uid()) THEN
      RAISE EXCEPTION 'only a platform administrator can change school status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER schools_status_enforce
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.enforce_school_status_change();

CREATE TRIGGER schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_term_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _school uuid;
  _starts date;
  _ends date;
BEGIN
  SELECT year.school_id, year.starts_on, year.ends_on
    INTO _school, _starts, _ends
  FROM public.academic_years AS year
  WHERE year.id = NEW.academic_year_id;

  IF _school IS NULL OR _school <> NEW.school_id THEN
    RAISE EXCEPTION 'term school does not match its academic year';
  END IF;

  IF NEW.starts_on < _starts OR NEW.ends_on > _ends THEN
    RAISE EXCEPTION 'term dates must sit inside the academic year';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.terms AS term
    WHERE term.academic_year_id = NEW.academic_year_id
      AND term.id IS DISTINCT FROM NEW.id
      AND daterange(term.starts_on, term.ends_on, '[]')
          && daterange(NEW.starts_on, NEW.ends_on, '[]')
  ) THEN
    RAISE EXCEPTION 'terms in one academic year cannot overlap';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER terms_calendar
  BEFORE INSERT OR UPDATE ON public.terms
  FOR EACH ROW EXECUTE FUNCTION public.enforce_term_calendar();

CREATE TRIGGER terms_updated_at
  BEFORE UPDATE ON public.terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER academic_years_updated_at
  BEFORE UPDATE ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER grade_levels_updated_at
  BEFORE UPDATE ON public.grade_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_class_school()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year_school uuid;
  _grade_school uuid;
BEGIN
  SELECT year.school_id INTO _year_school
  FROM public.academic_years AS year
  WHERE year.id = NEW.academic_year_id;

  SELECT grade.school_id INTO _grade_school
  FROM public.grade_levels AS grade
  WHERE grade.id = NEW.grade_level_id;

  IF _year_school IS NULL OR _grade_school IS NULL
     OR _year_school <> NEW.school_id
     OR _grade_school <> NEW.school_id THEN
    RAISE EXCEPTION 'class school does not match its year and grade';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER classes_school
  BEFORE INSERT OR UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_class_school();

CREATE TRIGGER classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_class_subject_school()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _class_school uuid;
  _subject_school uuid;
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

  IF NEW.course_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.courses AS course WHERE course.id = NEW.course_id
  ) THEN
    RAISE EXCEPTION 'class subject course does not exist';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER class_subjects_school
  BEFORE INSERT OR UPDATE ON public.class_subjects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_class_subject_school();

CREATE TRIGGER class_subjects_updated_at
  BEFORE UPDATE ON public.class_subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_teacher_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _offering_school uuid;
  _role text;
  _status text;
  _member_school uuid;
BEGIN
  SELECT offering.school_id INTO _offering_school
  FROM public.class_subjects AS offering
  WHERE offering.id = NEW.class_subject_id;

  SELECT membership.membership_role, membership.status, membership.school_id
    INTO _role, _status, _member_school
  FROM public.school_memberships AS membership
  WHERE membership.id = NEW.membership_id;

  IF _offering_school IS NULL OR _offering_school <> NEW.school_id THEN
    RAISE EXCEPTION 'teacher assignment school does not match the class subject';
  END IF;

  IF _role IS DISTINCT FROM 'teacher'
     OR _status IS DISTINCT FROM 'active'
     OR _member_school IS DISTINCT FROM NEW.school_id THEN
    RAISE EXCEPTION 'teacher assignment requires an active teacher membership at that school';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER teacher_assignments_enforce
  BEFORE INSERT OR UPDATE ON public.teacher_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_teacher_assignment();

CREATE TRIGGER teacher_assignments_updated_at
  BEFORE UPDATE ON public.teacher_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_student_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _class_school uuid;
  _class_year uuid;
  _role text;
  _status text;
  _member_school uuid;
BEGIN
  SELECT class_row.school_id, class_row.academic_year_id
    INTO _class_school, _class_year
  FROM public.classes AS class_row
  WHERE class_row.id = NEW.class_id;

  SELECT membership.membership_role, membership.status, membership.school_id
    INTO _role, _status, _member_school
  FROM public.school_memberships AS membership
  WHERE membership.id = NEW.membership_id;

  IF _class_school IS NULL
     OR _class_school <> NEW.school_id
     OR _class_year IS DISTINCT FROM NEW.academic_year_id THEN
    RAISE EXCEPTION 'enrollment school does not match the class';
  END IF;

  IF _role IS DISTINCT FROM 'student'
     OR _status IS DISTINCT FROM 'active'
     OR _member_school IS DISTINCT FROM NEW.school_id THEN
    RAISE EXCEPTION 'enrollment requires an active student membership at that school';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER student_enrollments_enforce
  BEFORE INSERT OR UPDATE ON public.student_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_enrollment();

CREATE TRIGGER student_enrollments_updated_at
  BEFORE UPDATE ON public.student_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
  WHERE offering.class_id = NEW.class_id
    AND offering.course_id IS NOT NULL
  ON CONFLICT (course_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER student_enrollments_course
  AFTER INSERT OR UPDATE ON public.student_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.enroll_class_students_in_course();

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
  WHERE enrollment.class_id = NEW.class_id
    AND enrollment.status = 'active'
    AND enrollment.school_id = NEW.school_id
  ON CONFLICT (course_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER class_subjects_enroll_roster
  AFTER INSERT OR UPDATE ON public.class_subjects
  FOR EACH ROW EXECUTE FUNCTION public.enroll_roster_in_class_course();

CREATE OR REPLACE FUNCTION public.enforce_class_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _class_school uuid;
  _student_role text;
  _student_status text;
  _student_school uuid;
  _marker_role text;
  _marker_status text;
  _marker_school uuid;
  _marker_user uuid;
BEGIN
  SELECT class_row.school_id INTO _class_school
  FROM public.classes AS class_row
  WHERE class_row.id = NEW.class_id;

  IF _class_school IS NULL OR _class_school <> NEW.school_id THEN
    RAISE EXCEPTION 'attendance school does not match the class';
  END IF;

  SELECT membership.membership_role, membership.status, membership.school_id
    INTO _student_role, _student_status, _student_school
  FROM public.school_memberships AS membership
  WHERE membership.id = NEW.membership_id;

  IF _student_role IS DISTINCT FROM 'student'
     OR _student_status IS DISTINCT FROM 'active'
     OR _student_school IS DISTINCT FROM NEW.school_id
     OR NOT EXISTS (
       SELECT 1
       FROM public.student_enrollments AS enrollment
       WHERE enrollment.class_id = NEW.class_id
         AND enrollment.membership_id = NEW.membership_id
         AND enrollment.status = 'active'
     ) THEN
    RAISE EXCEPTION 'attendance requires an active student enrollment in that class';
  END IF;

  SELECT membership.membership_role, membership.status, membership.school_id, membership.user_id
    INTO _marker_role, _marker_status, _marker_school, _marker_user
  FROM public.school_memberships AS membership
  WHERE membership.id = NEW.marked_by;

  IF _marker_role IS DISTINCT FROM 'teacher'
     OR _marker_status IS DISTINCT FROM 'active'
     OR _marker_school IS DISTINCT FROM NEW.school_id
     OR NOT public.teaches_class(_marker_user, NEW.class_id) THEN
    RAISE EXCEPTION 'attendance can only be marked by an assigned teacher of that class';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM _marker_user THEN
    RAISE EXCEPTION 'marked_by must be the signed-in teacher';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER class_attendance_enforce
  BEFORE INSERT OR UPDATE ON public.class_attendance
  FOR EACH ROW EXECUTE FUNCTION public.enforce_class_attendance();

-- Row Level Security. No policy uses a client-supplied school id as proof.

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.schools TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.school_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academic_years TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.terms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.grade_levels TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.classes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.class_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.teacher_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.class_attendance TO authenticated;

CREATE POLICY "Platform admins insert schools"
  ON public.schools
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Members read their schools"
  ON public.schools
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.active_member_of_school(auth.uid(), id)
  );

CREATE POLICY "School admins update their school"
  ON public.schools
  FOR UPDATE TO authenticated
  USING (public.active_membership(auth.uid(), id, 'school_admin'))
  WITH CHECK (public.active_membership(auth.uid(), id, 'school_admin'));

CREATE POLICY "Platform admins update schools"
  ON public.schools
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Read visible memberships"
  ON public.school_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR public.active_membership(auth.uid(), school_id, 'school_admin')
    OR (
      membership_role = 'student'
      AND public.parent_of(auth.uid(), user_id)
    )
  );

CREATE POLICY "Create a membership"
  ON public.school_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.is_platform_admin(auth.uid())
      AND membership_role = 'school_admin'
      AND user_id <> auth.uid()
    )
    OR (
      public.active_membership(auth.uid(), school_id, 'school_admin')
      AND user_id <> auth.uid()
    )
    OR (
      user_id = auth.uid()
      AND membership_role = 'student'
      AND status = 'pending'
      AND public.has_role(auth.uid(), 'student'::public.app_role)
    )
  );

CREATE POLICY "Manage a membership"
  ON public.school_memberships
  FOR UPDATE TO authenticated
  USING (
    (
      public.is_platform_admin(auth.uid())
      AND membership_role = 'school_admin'
    )
    OR public.active_membership(auth.uid(), school_id, 'school_admin')
  )
  WITH CHECK (
    (
      public.is_platform_admin(auth.uid())
      AND membership_role = 'school_admin'
    )
    OR public.active_membership(auth.uid(), school_id, 'school_admin')
  );

CREATE POLICY "Platform admins read years"
  ON public.academic_years
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "School members read years"
  ON public.academic_years
  FOR SELECT TO authenticated
  USING (public.active_member_of_school(auth.uid(), school_id));

CREATE POLICY "School admins manage years"
  ON public.academic_years
  FOR INSERT TO authenticated
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "School admins update years"
  ON public.academic_years
  FOR UPDATE TO authenticated
  USING (public.active_membership(auth.uid(), school_id, 'school_admin'))
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "Platform admins read terms"
  ON public.terms
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "School members read terms"
  ON public.terms
  FOR SELECT TO authenticated
  USING (public.active_member_of_school(auth.uid(), school_id));

CREATE POLICY "School admins manage terms"
  ON public.terms
  FOR INSERT TO authenticated
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "School admins update terms"
  ON public.terms
  FOR UPDATE TO authenticated
  USING (public.active_membership(auth.uid(), school_id, 'school_admin'))
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "Platform admins read grade levels"
  ON public.grade_levels
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "School members read grade levels"
  ON public.grade_levels
  FOR SELECT TO authenticated
  USING (public.active_member_of_school(auth.uid(), school_id));

CREATE POLICY "School admins manage grade levels"
  ON public.grade_levels
  FOR INSERT TO authenticated
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "School admins update grade levels"
  ON public.grade_levels
  FOR UPDATE TO authenticated
  USING (public.active_membership(auth.uid(), school_id, 'school_admin'))
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "Read visible classes"
  ON public.classes
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.active_membership(auth.uid(), school_id, 'school_admin')
    OR public.teaches_class(auth.uid(), id)
    OR public.student_in_class(auth.uid(), id)
    OR public.parent_of_class(auth.uid(), id)
  );

CREATE POLICY "School admins create classes"
  ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "School admins update classes"
  ON public.classes
  FOR UPDATE TO authenticated
  USING (public.active_membership(auth.uid(), school_id, 'school_admin'))
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "Platform admins read subjects"
  ON public.subjects
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "School admins read subjects"
  ON public.subjects
  FOR SELECT TO authenticated
  USING (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "Read subjects of a visible class"
  ON public.subjects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.class_subjects AS offering
      WHERE offering.subject_id = subjects.id
        AND (
          public.teaches_class(auth.uid(), offering.class_id)
          OR public.student_in_class(auth.uid(), offering.class_id)
          OR public.parent_of_class(auth.uid(), offering.class_id)
        )
    )
  );

CREATE POLICY "School admins manage subjects"
  ON public.subjects
  FOR INSERT TO authenticated
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "School admins update subjects"
  ON public.subjects
  FOR UPDATE TO authenticated
  USING (public.active_membership(auth.uid(), school_id, 'school_admin'))
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "Read visible class subjects"
  ON public.class_subjects
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.active_membership(auth.uid(), school_id, 'school_admin')
    OR public.teaches_class(auth.uid(), class_id)
    OR public.student_in_class(auth.uid(), class_id)
    OR public.parent_of_class(auth.uid(), class_id)
  );

CREATE POLICY "School admins create class subjects"
  ON public.class_subjects
  FOR INSERT TO authenticated
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "School admins update class subjects"
  ON public.class_subjects
  FOR UPDATE TO authenticated
  USING (public.active_membership(auth.uid(), school_id, 'school_admin'))
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "Read visible teacher assignments"
  ON public.teacher_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.active_membership(auth.uid(), school_id, 'school_admin')
    OR EXISTS (
      SELECT 1
      FROM public.school_memberships AS membership
      WHERE membership.id = teacher_assignments.membership_id
        AND membership.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.class_subjects AS offering
      WHERE offering.id = teacher_assignments.class_subject_id
        AND (
          public.student_in_class(auth.uid(), offering.class_id)
          OR public.parent_of_class(auth.uid(), offering.class_id)
        )
    )
  );

CREATE POLICY "School admins create teacher assignments"
  ON public.teacher_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "School admins update teacher assignments"
  ON public.teacher_assignments
  FOR UPDATE TO authenticated
  USING (public.active_membership(auth.uid(), school_id, 'school_admin'))
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "Read visible enrollments"
  ON public.student_enrollments
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.active_membership(auth.uid(), school_id, 'school_admin')
    OR public.teaches_class(auth.uid(), class_id)
    OR EXISTS (
      SELECT 1
      FROM public.school_memberships AS membership
      WHERE membership.id = student_enrollments.membership_id
        AND membership.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.school_memberships AS membership
      WHERE membership.id = student_enrollments.membership_id
        AND public.parent_of(auth.uid(), membership.user_id)
    )
  );

CREATE POLICY "School admins create enrollments"
  ON public.student_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

CREATE POLICY "School admins update enrollments"
  ON public.student_enrollments
  FOR UPDATE TO authenticated
  USING (public.active_membership(auth.uid(), school_id, 'school_admin'))
  WITH CHECK (public.active_membership(auth.uid(), school_id, 'school_admin'));

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
