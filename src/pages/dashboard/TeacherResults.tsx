import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useTeacherCourses } from '@/hooks/useCourses';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Users, BookOpen, TrendingUp, Search, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';

export default function TeacherResults() {
  const { data: courses } = useTeacherCourses();
  const courseIds = courses?.map((c) => c.id) ?? [];
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const { data: enrollments } = useQuery({
    queryKey: ['teacher-enrollments', courseIds],
    queryFn: async () => {
      const { data, error } = await supabase.from('course_enrollments')
        .select('*, courses(title, subject), profiles!course_enrollments_user_id_fkey(full_name, student_code)')
        .in('course_id', courseIds);
      if (error) {
        // Fallback without profile join
        const { data: d2, error: e2 } = await supabase.from('course_enrollments')
          .select('*, courses(title, subject)')
          .in('course_id', courseIds);
        if (e2) throw e2;
        return d2;
      }
      return data;
    },
    enabled: courseIds.length > 0,
  });

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
      const { data, error } = await supabase.from('results').select('*')
        .in('exercise_id', exerciseIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: exerciseIds.length > 0,
  });

  const { data: studentProfiles } = useQuery({
    queryKey: ['teacher-student-profiles', courseIds],
    queryFn: async () => {
      const studentIds = [...new Set(enrollments?.map(e => e.user_id) ?? [])];
      if (studentIds.length === 0) return [];
      const { data, error } = await supabase.from('profiles').select('*').in('user_id', studentIds);
      if (error) throw error;
      return data;
    },
    enabled: (enrollments?.length ?? 0) > 0,
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;

  const exerciseMap = new Map(exercises?.map((e) => [e.id, e.question]) ?? []);
  const profileMap = new Map(studentProfiles?.map(p => [p.user_id, p]) ?? []);

  // Get unique students enrolled
  const uniqueStudents = [...new Set(enrollments?.map(e => e.user_id) ?? [])];
  
  const getStudentStats = (studentId: string) => {
    const studentResults = results?.filter(r => r.user_id === studentId) ?? [];
    const total = studentResults.length;
    const correct = studentResults.filter(r => r.is_correct).length;
    const points = studentResults.reduce((s, r) => s + r.points_earned, 0);
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, correct, points, accuracy, results: studentResults };
  };

  const filteredStudents = uniqueStudents.filter(id => {
    if (!search) return true;
    const profile = profileMap.get(id);
    const s = search.toLowerCase();
    return profile?.full_name?.toLowerCase().includes(s) || (profile as any)?.student_code?.toLowerCase().includes(s);
  });

  const studentPagination = usePagination(filteredStudents, 15);

  const selectedProfile = selectedStudent ? profileMap.get(selectedStudent) : null;
  const selectedStats = selectedStudent ? getStudentStats(selectedStudent) : null;
  const selectedEnrollments = selectedStudent ? enrollments?.filter(e => e.user_id === selectedStudent) ?? [] : [];

  const totalStudents = uniqueStudents.length;
  const totalExercises = results?.length ?? 0;
  const overallCorrect = results?.filter(r => r.is_correct).length ?? 0;
  const overallAccuracy = totalExercises > 0 ? Math.round((overallCorrect / totalExercises) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Résultats des Élèves</h1>
        <p className="mt-1 text-muted-foreground">Suivi détaillé de la performance de vos élèves.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Élèves inscrits', value: totalStudents, icon: Users, gradient: 'from-primary/15 to-primary/5' },
          { label: 'Exercices faits', value: totalExercises, icon: BookOpen, gradient: 'from-accent/15 to-accent/5' },
          { label: 'Réponses correctes', value: overallCorrect, icon: CheckCircle2, gradient: 'from-secondary/15 to-secondary/5' },
          { label: 'Précision moyenne', value: `${overallAccuracy}%`, icon: TrendingUp, gradient: 'from-primary/15 to-primary/5' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={cn('rounded-xl border border-border bg-gradient-to-br p-4', s.gradient)}>
            <s.icon className="mb-2 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un élève par nom ou code..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Students list */}
      {filteredStudents.length === 0 ? (
        <p className="text-muted-foreground">Aucun élève inscrit à vos cours.</p>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Élève</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Exercices</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Précision</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Points</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Détails</th>
                </tr>
              </thead>
              <tbody>
                {studentPagination.paginated.map((studentId) => {
                  const profile = profileMap.get(studentId);
                  const stats = getStudentStats(studentId);
                  return (
                    <tr key={studentId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{profile?.full_name || 'Élève'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{(profile as any)?.student_code || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{stats.total}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={stats.accuracy} className="h-2 w-16" />
                          <span className="text-xs text-muted-foreground">{stats.accuracy}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-medium">{stats.points}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedStudent(studentId)} className="gap-1">
                          <Eye className="h-3.5 w-3.5" /> Voir
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationControls {...studentPagination} />
        </div>
      )}

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(o) => !o && setSelectedStudent(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProfile?.full_name || 'Élève'} — <span className="font-mono text-sm text-muted-foreground">{(selectedProfile as any)?.student_code}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-primary/10 p-3">
                  <p className="text-lg font-bold text-foreground">{selectedStats.points}</p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3">
                  <p className="text-lg font-bold text-foreground">{selectedStats.correct}/{selectedStats.total}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3">
                  <p className="text-lg font-bold text-foreground">{selectedStats.accuracy}%</p>
                  <p className="text-xs text-muted-foreground">Précision</p>
                </div>
              </div>

              {selectedStats.accuracy > 0 && <Progress value={selectedStats.accuracy} className="h-3" />}

              {selectedEnrollments.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Cours inscrits</h4>
                  <div className="space-y-1">
                    {selectedEnrollments.map((e: any) => (
                      <div key={e.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        <span className="text-foreground">{e.courses?.title || 'Cours'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedStats.results.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Derniers résultats</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedStats.results.slice(0, 20).map(r => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          {r.is_correct ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                          <span className="text-foreground truncate max-w-[200px]">{exerciseMap.get(r.exercise_id) || 'Exercice'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">+{r.points_earned}</span>
                          <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
