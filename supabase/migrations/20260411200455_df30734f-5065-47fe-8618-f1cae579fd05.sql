
DROP VIEW IF EXISTS public.student_exercises;
CREATE VIEW public.student_exercises
WITH (security_invoker = on)
AS
SELECT e.id, e.question, e.options, e.exercise_type, e.points, e.created_at, e.lesson_id
FROM public.exercises e
JOIN public.lessons l ON l.id = e.lesson_id
JOIN public.courses c ON c.id = l.course_id
WHERE c.is_published = true;
