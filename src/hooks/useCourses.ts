import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePublishedCourses() {
  return useQuery({
    queryKey: ['courses', 'published'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTeacherCourses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['courses', 'teacher', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCourseLessons(courseId: string | undefined) {
  return useQuery({
    queryKey: ['lessons', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId!)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
}

export function useLessonExercises(lessonId: string | undefined) {
  return useQuery({
    queryKey: ['exercises', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('lesson_id', lessonId!);
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: { title: string; subject: string; level: string; description: string }) => {
      const { data, error } = await supabase
        .from('courses')
        .insert({ ...values, teacher_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { title: string; content: string; course_id: string; sort_order: number }) => {
      const { data, error } = await supabase
        .from('lessons')
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['lessons', vars.course_id] }),
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { question: string; correct_answer: string; options: string[]; lesson_id: string; points: number }) => {
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          question: values.question,
          correct_answer: values.correct_answer,
          options: values.options,
          lesson_id: values.lesson_id,
          points: values.points,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['exercises', vars.lesson_id] }),
  });
}

export function useSubmitAnswer() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: { exercise_id: string; answer: string; is_correct: boolean; points_earned: number }) => {
      const { data, error } = await supabase
        .from('results')
        .insert({ ...values, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['results'] });
      qc.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}

export function useUserResults() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['results', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('results')
        .select('*, exercises(question, points, lesson_id)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUserBadges() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['badges', 'user', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAllBadges() {
  return useQuery({
    queryKey: ['badges', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('badges').select('*');
      if (error) throw error;
      return data;
    },
  });
}

export function useTogglePublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from('courses').update({ is_published }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}
