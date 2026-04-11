
-- Create homework submissions table
CREATE TABLE public.homework_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  teacher_comment TEXT,
  grade INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

-- Students can view own submissions
CREATE POLICY "Students view own submissions"
ON public.homework_submissions FOR SELECT
USING (auth.uid() = user_id);

-- Students can create own submissions
CREATE POLICY "Students create own submissions"
ON public.homework_submissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Teachers can view submissions for their courses
CREATE POLICY "Teachers view course submissions"
ON public.homework_submissions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM assignments a
  JOIN courses c ON c.id = a.course_id
  WHERE a.id = homework_submissions.assignment_id
  AND c.teacher_id = auth.uid()
));

-- Teachers can update submissions (add comments/grades)
CREATE POLICY "Teachers grade submissions"
ON public.homework_submissions FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM assignments a
  JOIN courses c ON c.id = a.course_id
  WHERE a.id = homework_submissions.assignment_id
  AND c.teacher_id = auth.uid()
));

-- Admins manage all
CREATE POLICY "Admins manage submissions"
ON public.homework_submissions FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_homework_submissions_updated_at
BEFORE UPDATE ON public.homework_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for homework files
INSERT INTO storage.buckets (id, name, public) VALUES ('homework-files', 'homework-files', false);

-- Students can upload their own files
CREATE POLICY "Students upload homework files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'homework-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Students can view their own files
CREATE POLICY "Students view own homework files"
ON storage.objects FOR SELECT
USING (bucket_id = 'homework-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Teachers can view homework files for their courses
CREATE POLICY "Teachers view homework files"
ON storage.objects FOR SELECT
USING (bucket_id = 'homework-files' AND EXISTS (
  SELECT 1 FROM homework_submissions hs
  JOIN assignments a ON a.id = hs.assignment_id
  JOIN courses c ON c.id = a.course_id
  WHERE c.teacher_id = auth.uid()
  AND hs.file_url LIKE '%' || storage.filename(name) || '%'
));
