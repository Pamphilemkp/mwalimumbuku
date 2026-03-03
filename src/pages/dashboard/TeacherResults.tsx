import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useTeacherCourses } from '@/hooks/useCourses';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function TeacherResults() {
  const { data: courses } = useTeacherCourses();
  const courseIds = courses?.map((c) => c.id) ?? [];

  const { data: lessons } = useQuery({
    queryKey: ['teacher-lessons', courseIds],
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select('id, course_id').in('course_id', courseIds);
      if (error) throw error;
      return data;
    },
    enabled: courseIds.length > 0,
  });

  const lessonIds = lessons?.map((l) => l.id) ?? [];

  const { data: exercises } = useQuery({
    queryKey: ['teacher-exercises', lessonIds],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercises').select('id, question, lesson_id').in('lesson_id', lessonIds);
      if (error) throw error;
      return data;
    },
    enabled: lessonIds.length > 0,
  });

  const exerciseIds = exercises?.map((e) => e.id) ?? [];

  const { data: results, isLoading } = useQuery({
    queryKey: ['teacher-results', exerciseIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('results')
        .select('*, profiles!results_user_id_fkey(full_name)')
        .in('exercise_id', exerciseIds)
        .order('created_at', { ascending: false })
        .limit(100);
      // profiles join may fail due to no FK — handle gracefully
      if (error) {
        const { data: d2, error: e2 } = await supabase
          .from('results')
          .select('*')
          .in('exercise_id', exerciseIds)
          .order('created_at', { ascending: false })
          .limit(100);
        if (e2) throw e2;
        return d2;
      }
      return data;
    },
    enabled: exerciseIds.length > 0,
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;

  const exerciseMap = new Map(exercises?.map((e) => [e.id, e.question]) ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Student Results</h1>
        <p className="mt-1 text-muted-foreground">Results from your course exercises.</p>
      </div>

      {!results || results.length === 0 ? (
        <p className="text-muted-foreground">No student results yet.</p>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Question</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Answer</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Correct</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Points</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{exerciseMap.get(r.exercise_id) ?? 'Exercise'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.answer}</td>
                    <td className="px-4 py-3">
                      {r.is_correct ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.points_earned}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
