import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Award, Target, FileText, Zap, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function StudentGradesPage() {
  const { user } = useAuth();

  const { data: results } = useQuery({
    queryKey: ['my-results', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('results')
        .select('*, exercises(question, points, lesson_id, lessons(title, course_id, courses(title, subject)))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: submissions } = useQuery({
    queryKey: ['my-graded-submissions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*, assignments(title, course_id, courses(title, subject))')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalPoints = results?.reduce((s, r) => s + (r.points_earned || 0), 0) ?? 0;
  const correct = results?.filter(r => r.is_correct).length ?? 0;
  const total = results?.length ?? 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const graded = (submissions ?? []).filter(s => s.grade !== null);
  const avgGrade = graded.length > 0 ? Math.round(graded.reduce((s, x) => s + (x.grade || 0), 0) / graded.length) : 0;

  const exPagination = usePagination(results, 5);
  const subPagination = usePagination(submissions, 5);

  const stats = [
    { label: 'Points totaux', value: totalPoints, icon: Zap, color: 'text-primary', bg: 'from-primary/15 to-primary/5' },
    { label: 'Précision', value: `${accuracy}%`, icon: Target, color: 'text-secondary', bg: 'from-secondary/15 to-secondary/5' },
    { label: 'Devoirs notés', value: graded.length, icon: FileText, color: 'text-accent', bg: 'from-accent/15 to-accent/5' },
    { label: 'Note moyenne', value: graded.length > 0 ? `${avgGrade}/100` : '—', icon: Award, color: 'text-primary', bg: 'from-primary/15 to-accent/5' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-card shadow-sm">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Mes notes & points</h1>
            <p className="text-sm text-muted-foreground">Suivez vos résultats d'exercices et les notes de vos devoirs.</p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={cn('rounded-2xl border border-border/50 bg-gradient-to-br p-5', s.bg)}>
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl bg-card shadow-sm', s.color)}>
              <s.icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {total > 0 && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <TrendingUp className="h-4 w-4 text-primary" /> Précision globale
              </div>
              <span className="text-sm text-primary font-medium">{correct}/{total}</span>
            </div>
            <Progress value={accuracy} className="h-2.5" />
          </CardContent>
      </Card>
      )}

      {graded.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" /> Évolution des notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...graded].reverse().map((g: any, i) => ({
                  name: `#${i + 1}`,
                  note: g.grade,
                  label: g.assignments?.title?.slice(0, 20) ?? '',
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="note" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {graded[0].grade > graded[graded.length - 1].grade
                ? '📈 Vos notes progressent. Continuez ainsi !'
                : graded[0].grade < graded[graded.length - 1].grade
                ? '📉 Concentrez-vous sur vos points faibles pour progresser.'
                : '➡️ Tendance stable. Visez plus haut !'}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" /> Notes des devoirs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(!submissions || submissions.length === 0) && (
            <p className="text-sm text-muted-foreground">Aucun devoir soumis pour le moment.</p>
          )}
          {subPagination.paginatedItems.map((s: any) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="secondary" className="text-[10px]">{s.assignments?.courses?.subject}</Badge>
                    <Badge variant="outline" className="text-[10px]">{s.assignments?.courses?.title}</Badge>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">{s.assignments?.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">Soumis le {format(new Date(s.created_at), 'dd MMM yyyy', { locale: fr })}</p>
                  {s.teacher_comment && (
                    <p className="mt-2 text-sm text-foreground rounded-lg bg-primary/5 p-2">{s.teacher_comment}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {s.grade !== null ? (
                    <div>
                      <p className="font-display text-2xl font-bold text-primary">{s.grade}<span className="text-sm text-muted-foreground">/100</span></p>
                      <Badge className="text-[10px] mt-1">Noté</Badge>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="text-xs">En attente</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
          <PaginationControls {...subPagination} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" /> Historique des exercices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(!results || results.length === 0) && (
            <p className="text-sm text-muted-foreground">Aucun exercice complété pour le moment.</p>
          )}
          {exPagination.paginatedItems.map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', r.is_correct ? 'bg-primary/10' : 'bg-destructive/10')}>
                {r.is_correct ? <Award className="h-4 w-4 text-primary" /> : <Target className="h-4 w-4 text-destructive" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{r.exercises?.question ?? 'Exercice'}</p>
                <p className="text-xs text-muted-foreground truncate">{r.exercises?.lessons?.courses?.title} · {format(new Date(r.created_at), 'dd MMM HH:mm', { locale: fr })}</p>
              </div>
              <span className={cn('text-xs font-semibold rounded-full px-2 py-0.5', r.is_correct ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted')}>
                +{r.points_earned}
              </span>
            </div>
          ))}
          <PaginationControls {...exPagination} />
        </CardContent>
      </Card>
    </div>
  );
}
