
-- Trigger to notify teacher when a student submits homework
CREATE OR REPLACE FUNCTION public.notify_teacher_on_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _teacher_id uuid;
  _student_name text;
  _assignment_title text;
BEGIN
  -- Get assignment title and teacher
  SELECT a.title, c.teacher_id INTO _assignment_title, _teacher_id
  FROM assignments a
  JOIN courses c ON c.id = a.course_id
  WHERE a.id = NEW.assignment_id;

  -- Get student name
  SELECT full_name INTO _student_name FROM profiles WHERE user_id = NEW.user_id;

  -- Notify teacher
  IF _teacher_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (
      _teacher_id,
      'Devoir soumis: ' || COALESCE(_assignment_title, 'Devoir'),
      'L''élève ' || COALESCE(_student_name, 'Un élève') || ' a soumis son devoir.',
      'submission',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS on_homework_submitted ON homework_submissions;
CREATE TRIGGER on_homework_submitted
  AFTER INSERT ON homework_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_teacher_on_submission();
