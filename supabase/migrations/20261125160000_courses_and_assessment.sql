-- Courses, lessons, and assessment rules.
-- Adds columns and replaces grading. Does not delete users, courses, or submissions.
-- Subjects stay free text. This does not claim an official curriculum.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS education_stage text,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_education_stage_check;
ALTER TABLE public.courses
  ADD CONSTRAINT courses_education_stage_check
  CHECK (education_stage IS NULL OR education_stage IN ('primary', 'secondary'));

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS objectives text,
  ADD COLUMN IF NOT EXISTS examples text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS resource_url text;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS attempt_limit integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS partial_credit boolean NOT NULL DEFAULT false;

UPDATE public.exercises
SET exercise_type = 'multiple_choice'
WHERE exercise_type NOT IN ('multiple_choice', 'true_false', 'short_answer', 'matching', 'fill_blank');

ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_type_check;
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_type_check
  CHECK (exercise_type IN ('multiple_choice', 'true_false', 'short_answer', 'matching', 'fill_blank'));

ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_attempt_limit_check;
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_attempt_limit_check
  CHECK (attempt_limit BETWEEN 1 AND 10);

ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_partial_credit_check;
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_partial_credit_check
  CHECK (partial_credit = false OR exercise_type = 'matching');

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS allow_resubmit boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons (id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students record own lesson progress" ON public.lesson_progress;
CREATE POLICY "Students record own lesson progress"
  ON public.lesson_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.lessons AS lesson
      JOIN public.courses AS course ON course.id = lesson.course_id
      WHERE lesson.id = lesson_progress.lesson_id
        AND course.is_published = true
        AND course.archived = false
        AND (
          course.school_id IS NULL
          OR public.active_member_of_school(auth.uid(), course.school_id)
        )
    )
  );

DROP POLICY IF EXISTS "Students read own lesson progress" ON public.lesson_progress;
CREATE POLICY "Students read own lesson progress"
  ON public.lesson_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Parents read linked lesson progress" ON public.lesson_progress;
CREATE POLICY "Parents read linked lesson progress"
  ON public.lesson_progress
  FOR SELECT TO authenticated
  USING (
    public.parent_of(auth.uid(), lesson_progress.user_id)
  );

DROP POLICY IF EXISTS "Teachers read course lesson progress" ON public.lesson_progress;
CREATE POLICY "Teachers read course lesson progress"
  ON public.lesson_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons AS lesson
      JOIN public.courses AS course ON course.id = lesson.course_id
      WHERE lesson.id = lesson_progress.lesson_id
        AND course.teacher_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.lesson_progress TO authenticated;

CREATE OR REPLACE FUNCTION public.check_answer(_exercise_id uuid, _answer text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _correct text;
  _points int;
  _type text;
  _limit int;
  _partial boolean;
  _published boolean;
  _archived boolean;
  _school uuid;
  _teacher uuid;
  _used int;
  _given text;
  _expected text;
  _is_correct boolean := false;
  _earned int := 0;
  _part text;
  _left text;
  _right text;
  _expected_map jsonb := '{}'::jsonb;
  _given_map jsonb := '{}'::jsonb;
  _key text;
  _matched int := 0;
  _total int := 0;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _answer IS NULL OR char_length(btrim(_answer)) = 0 OR char_length(_answer) > 2000 THEN
    RAISE EXCEPTION 'answer is not valid';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_user::text), hashtext(_exercise_id::text));

  SELECT exercise.correct_answer, exercise.points, exercise.exercise_type, exercise.attempt_limit,
         exercise.partial_credit, course.is_published, course.archived, course.school_id, course.teacher_id
    INTO _correct, _points, _type, _limit, _partial, _published, _archived, _school, _teacher
  FROM public.exercises AS exercise
  JOIN public.lessons AS lesson ON lesson.id = exercise.lesson_id
  JOIN public.courses AS course ON course.id = lesson.course_id
  WHERE exercise.id = _exercise_id;

  IF _correct IS NULL OR NOT _published OR _archived THEN
    RAISE EXCEPTION 'exercise is not available';
  END IF;
  IF _school IS NOT NULL AND _teacher IS DISTINCT FROM _user AND NOT public.active_member_of_school(_user, _school) THEN
    RAISE EXCEPTION 'exercise is not available';
  END IF;

  SELECT count(*) INTO _used
  FROM public.results
  WHERE user_id = _user AND exercise_id = _exercise_id;
  IF _used >= _limit THEN
    RAISE EXCEPTION 'attempt limit reached';
  END IF;

  _given := btrim(_answer);
  _expected := btrim(_correct);

  IF _type = 'true_false' THEN
    _is_correct := lower(_given) IN ('true', 'false')
      AND lower(_expected) IN ('true', 'false')
      AND lower(_given) = lower(_expected);
    _earned := CASE WHEN _is_correct THEN _points ELSE 0 END;
  ELSIF _type IN ('short_answer', 'fill_blank') THEN
    _is_correct := lower(_given) = lower(_expected);
    _earned := CASE WHEN _is_correct THEN _points ELSE 0 END;
  ELSIF _type = 'multiple_choice' THEN
    _is_correct := _given = _expected;
    _earned := CASE WHEN _is_correct THEN _points ELSE 0 END;
  ELSIF _type = 'matching' THEN
    BEGIN
      FOREACH _part IN ARRAY string_to_array(_expected, '|') LOOP
        _left := lower(btrim(split_part(_part, '=', 1)));
        _right := lower(btrim(substr(_part, length(split_part(_part, '=', 1)) + 2)));
        IF _left = '' OR _right = '' OR _expected_map ? _left THEN
          RAISE EXCEPTION 'invalid matching key';
        END IF;
        _expected_map := _expected_map || jsonb_build_object(_left, _right);
      END LOOP;
      FOREACH _part IN ARRAY string_to_array(_given, '|') LOOP
        _left := lower(btrim(split_part(_part, '=', 1)));
        _right := lower(btrim(substr(_part, length(split_part(_part, '=', 1)) + 2)));
        IF _left = '' OR _right = '' OR _given_map ? _left THEN
          RAISE EXCEPTION 'invalid matching key';
        END IF;
        _given_map := _given_map || jsonb_build_object(_left, _right);
      END LOOP;
      FOR _key IN SELECT jsonb_object_keys(_expected_map) LOOP
        _total := _total + 1;
        IF _given_map ->> _key = _expected_map ->> _key THEN
          _matched := _matched + 1;
        END IF;
      END LOOP;
      _is_correct := _total > 0 AND _matched = _total AND (SELECT count(*) FROM jsonb_object_keys(_given_map)) = _total;
      IF _partial THEN
        _earned := round((_points::numeric * _matched) / GREATEST(_total, 1))::int;
      ELSE
        _earned := CASE WHEN _is_correct THEN _points ELSE 0 END;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      _is_correct := false;
      _earned := 0;
    END;
  ELSE
    RAISE EXCEPTION 'exercise is not available';
  END IF;

  INSERT INTO public.results (user_id, exercise_id, answer, is_correct, points_earned)
  VALUES (_user, _exercise_id, _given, _is_correct, _earned);

  RETURN jsonb_build_object(
    'is_correct', _is_correct,
    'points_earned', _earned,
    'attempts_used', _used + 1,
    'feedback', CASE WHEN _is_correct THEN 'Correct.' ELSE 'Not quite. Review the lesson and try again.' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_answer(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_answer(uuid, text) TO authenticated;

DROP FUNCTION IF EXISTS public.get_lesson_exercises(uuid);

CREATE OR REPLACE FUNCTION public.get_lesson_exercises(_lesson_id uuid)
RETURNS TABLE(id uuid, question text, options jsonb, exercise_type text, points int, created_at timestamptz, attempt_limit int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exercise.id, exercise.question, exercise.options, exercise.exercise_type, exercise.points,
         exercise.created_at, exercise.attempt_limit
  FROM public.exercises AS exercise
  JOIN public.lessons AS lesson ON lesson.id = exercise.lesson_id
  JOIN public.courses AS course ON course.id = lesson.course_id
  WHERE exercise.lesson_id = _lesson_id
    AND course.is_published = true
    AND course.archived = false
    AND (
      course.school_id IS NULL
      OR course.teacher_id = auth.uid()
      OR public.active_member_of_school(auth.uid(), course.school_id)
    );
$$;

REVOKE ALL ON FUNCTION public.get_lesson_exercises(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lesson_exercises(uuid) TO authenticated;

DROP POLICY IF EXISTS "Lessons visible if course accessible" ON public.lessons;
CREATE POLICY "Lessons visible if course accessible"
  ON public.lessons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses AS course
      WHERE course.id = lessons.course_id
        AND course.archived = false
        AND (
          course.teacher_id = auth.uid()
          OR (
            course.is_published = true
            AND (
              course.school_id IS NULL
              OR public.active_member_of_school(auth.uid(), course.school_id)
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Published catalog courses visible" ON public.courses;
CREATE POLICY "Published catalog courses visible"
  ON public.courses
  FOR SELECT TO authenticated
  USING (is_published = true AND archived = false AND school_id IS NULL);

DROP POLICY IF EXISTS "School members read published school courses" ON public.courses;
CREATE POLICY "School members read published school courses"
  ON public.courses
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND archived = false
    AND school_id IS NOT NULL
    AND public.active_member_of_school(auth.uid(), school_id)
  );

DROP POLICY IF EXISTS "Parents read a linked class course" ON public.courses;
CREATE POLICY "Parents read a linked class course"
  ON public.courses
  FOR SELECT TO authenticated
  USING (
    archived = false
    AND school_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.class_subjects AS offering
      WHERE offering.course_id = courses.id
        AND public.parent_of_class(auth.uid(), offering.class_id)
    )
  );

DROP POLICY IF EXISTS "Students enroll in published courses" ON public.course_enrollments;
CREATE POLICY "Students enroll in published courses"
  ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.courses AS course
      WHERE course.id = course_enrollments.course_id
        AND course.is_published = true
        AND course.archived = false
        AND course.school_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Users insert own results" ON public.results;

CREATE OR REPLACE FUNCTION public.enforce_homework_resubmit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _allowed boolean;
  _latest text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;
  IF NEW.grade IS NOT NULL OR NEW.teacher_comment IS NOT NULL OR NEW.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'students cannot set a grade';
  END IF;
  IF NEW.file_name !~* '\.(pdf|jpe?g|png|webp)$'
     OR NEW.file_url !~* '\.(pdf|jpe?g|png|webp)$' THEN
    RAISE EXCEPTION 'file type is not allowed';
  END IF;
  IF position('..' in NEW.file_url) > 0
     OR NEW.file_url !~ ('^' || NEW.user_id::text || '/[^/]+(/[^/]+)?$') THEN
    RAISE EXCEPTION 'file path is not allowed';
  END IF;
  IF to_regclass('storage.objects') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM storage.objects AS object
       WHERE object.bucket_id = 'homework-files'
         AND object.name = NEW.file_url
     ) THEN
    RAISE EXCEPTION 'file is missing';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text), hashtext(NEW.assignment_id::text));
  SELECT assignment.allow_resubmit INTO _allowed
  FROM public.assignments AS assignment
  WHERE assignment.id = NEW.assignment_id;
  SELECT submission.status INTO _latest
  FROM public.homework_submissions AS submission
  WHERE submission.assignment_id = NEW.assignment_id
    AND submission.user_id = NEW.user_id
  ORDER BY submission.created_at DESC
  LIMIT 1;
  IF _latest IS NOT NULL AND (NOT COALESCE(_allowed, false) OR _latest IS DISTINCT FROM 'returned') THEN
    RAISE EXCEPTION 'resubmission is closed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS homework_submissions_resubmit ON public.homework_submissions;
CREATE TRIGGER homework_submissions_resubmit
  BEFORE INSERT ON public.homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_homework_resubmit();

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    UPDATE storage.buckets
    SET file_size_limit = 5242880,
        allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    WHERE id = 'homework-files';
  END IF;
END $$;
