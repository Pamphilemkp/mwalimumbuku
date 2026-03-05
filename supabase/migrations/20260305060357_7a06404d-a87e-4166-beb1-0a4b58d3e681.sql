
-- 1. Create RPC to fetch exercises WITHOUT correct_answer
CREATE OR REPLACE FUNCTION public.get_lesson_exercises(_lesson_id uuid)
RETURNS TABLE(id uuid, question text, options jsonb, exercise_type text, points int, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.id, e.question, e.options, e.exercise_type, e.points, e.created_at
  FROM exercises e
  JOIN lessons l ON l.id = e.lesson_id
  JOIN courses c ON c.id = l.course_id
  WHERE e.lesson_id = _lesson_id
    AND (c.is_published = true OR c.teacher_id = auth.uid());
$$;

-- 2. Add RLS policy for teachers to view results for their course exercises
CREATE POLICY "Teachers view results for their course exercises"
  ON public.results FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exercises e
      JOIN lessons l ON l.id = e.lesson_id
      JOIN courses c ON c.id = l.course_id
      WHERE e.id = results.exercise_id
      AND c.teacher_id = auth.uid()
    )
  );
