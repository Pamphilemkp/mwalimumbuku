
-- Enable scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Notify student when their submission is graded or commented
CREATE OR REPLACE FUNCTION public.notify_student_on_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _title text;
BEGIN
  IF (NEW.grade IS DISTINCT FROM OLD.grade)
     OR (NEW.teacher_comment IS DISTINCT FROM OLD.teacher_comment)
     OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'graded') THEN
    SELECT a.title INTO _title FROM assignments a WHERE a.id = NEW.assignment_id;
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.user_id,
      'Devoir noté: ' || COALESCE(_title, 'Devoir'),
      CASE
        WHEN NEW.grade IS NOT NULL THEN 'Vous avez obtenu la note: ' || NEW.grade::text || '. ' || COALESCE(NEW.teacher_comment, '')
        ELSE COALESCE(NEW.teacher_comment, 'Votre devoir a été évalué.')
      END,
      'grade',
      NEW.assignment_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_submission_graded ON public.homework_submissions;
CREATE TRIGGER on_submission_graded
AFTER UPDATE ON public.homework_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_student_on_grade();

-- Ensure the assignment-created notify trigger exists
DROP TRIGGER IF EXISTS on_assignment_created ON public.assignments;
CREATE TRIGGER on_assignment_created
AFTER INSERT ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_assignment();

-- Ensure the homework-submitted teacher notify trigger exists
DROP TRIGGER IF EXISTS on_homework_submitted ON public.homework_submissions;
CREATE TRIGGER on_homework_submitted
AFTER INSERT ON public.homework_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_teacher_on_submission();

-- 24h reminder function: insert reminders for assignments due in ~24h
-- Dedupes via notifications.type='reminder' + related_id=assignment_id
CREATE OR REPLACE FUNCTION public.send_assignment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify enrolled students who haven't submitted yet
  INSERT INTO notifications (user_id, title, message, type, related_id)
  SELECT DISTINCT ce.user_id,
    'Rappel: devoir à rendre demain - ' || a.title,
    'Échéance: ' || to_char(a.due_date, 'DD/MM/YYYY HH24:MI') || '. Pensez à soumettre votre travail.',
    'reminder',
    a.id
  FROM assignments a
  JOIN course_enrollments ce ON ce.course_id = a.course_id
  WHERE a.due_date BETWEEN now() + interval '23 hours' AND now() + interval '25 hours'
    AND NOT EXISTS (
      SELECT 1 FROM homework_submissions hs
      WHERE hs.assignment_id = a.id AND hs.user_id = ce.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = ce.user_id AND n.type = 'reminder' AND n.related_id = a.id
    );

  -- Notify parents of those students
  INSERT INTO notifications (user_id, title, message, type, related_id)
  SELECT DISTINCT ps.parent_id,
    'Rappel: devoir de votre enfant - ' || a.title,
    'Échéance: ' || to_char(a.due_date, 'DD/MM/YYYY HH24:MI') || '.',
    'reminder',
    a.id
  FROM assignments a
  JOIN course_enrollments ce ON ce.course_id = a.course_id
  JOIN parent_student ps ON ps.student_id = ce.user_id
  WHERE a.due_date BETWEEN now() + interval '23 hours' AND now() + interval '25 hours'
    AND NOT EXISTS (
      SELECT 1 FROM homework_submissions hs
      WHERE hs.assignment_id = a.id AND hs.user_id = ce.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = ps.parent_id AND n.type = 'reminder' AND n.related_id = a.id
    );
END;
$$;
