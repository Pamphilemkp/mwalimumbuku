import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Users, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

export default function ParentHome() {
  const { user } = useAuth();

  const { data: children, isLoading } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_student')
        .select('*, profiles!parent_student_student_id_fkey(full_name, avatar_url)')
        .eq('parent_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Welcome, {user?.user_metadata?.full_name || 'Parent'}!
        </h1>
        <p className="mt-1 text-muted-foreground">Monitor your children's learning.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-5">
          <Users className="mb-2 h-5 w-5 text-secondary" />
          <p className="text-2xl font-bold text-foreground">{children?.length ?? 0}</p>
          <p className="text-sm text-muted-foreground">Linked Children</p>
        </motion.div>
        <Link to="/dashboard/child-progress">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer">
            <BarChart3 className="mb-2 h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">View Progress</h3>
            <p className="text-sm text-muted-foreground">See how your children are doing</p>
          </motion.div>
        </Link>
      </div>

      <div>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">Your Children</h2>
        {isLoading ? <Skeleton className="h-20" /> : children?.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">No children linked yet.</p>
            <Link to="/dashboard/children" className="mt-2 inline-block text-sm text-primary hover:underline">
              Link a child →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {children?.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10">
                  <Users className="h-4 w-4 text-secondary" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {c.profiles?.full_name || 'Student'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
