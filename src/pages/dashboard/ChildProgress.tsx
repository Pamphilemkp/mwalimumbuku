import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, BarChart3, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChildProgress() {
  const { user } = useAuth();

  const { data: children } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_student')
        .select('student_id, profiles!parent_student_student_id_fkey(full_name)')
        .eq('parent_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const studentIds = children?.map((c) => c.student_id) ?? [];

  const { data: results, isLoading } = useQuery({
    queryKey: ['child-results', studentIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('results')
        .select('*')
        .in('user_id', studentIds)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: studentIds.length > 0,
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Children's Progress</h1>
        <p className="mt-1 text-muted-foreground">See how your children are performing.</p>
      </div>

      {children?.length === 0 ? (
        <p className="text-muted-foreground">Link a child first to see their progress.</p>
      ) : (
        children?.map((child: any) => {
          const childResults = results?.filter((r) => r.user_id === child.student_id) ?? [];
          const total = childResults.length;
          const correct = childResults.filter((r) => r.is_correct).length;
          const points = childResults.reduce((s, r) => s + r.points_earned, 0);
          const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

          return (
            <div key={child.student_id} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                  <Users className="h-5 w-5 text-secondary" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {child.profiles?.full_name || 'Student'}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-bold text-foreground">{points}</p>
                  <p className="text-sm text-muted-foreground">Total Points</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{correct}/{total}</p>
                  <p className="text-sm text-muted-foreground">Correct</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{accuracy}%</p>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                  <Progress value={accuracy} className="mt-1 h-2" />
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
