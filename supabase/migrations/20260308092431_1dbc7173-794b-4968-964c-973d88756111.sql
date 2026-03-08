-- Allow students to send messages (for notification system - messages to parents)
DROP POLICY IF EXISTS "Parents and teachers send messages" ON public.messages;
CREATE POLICY "Authenticated users send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Allow parents to view child moods
DROP POLICY IF EXISTS "Parents view child moods" ON public.daily_moods;
CREATE POLICY "Parents view child moods" ON public.daily_moods FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM parent_student ps WHERE ps.parent_id = auth.uid() AND ps.student_id = daily_moods.user_id)
);