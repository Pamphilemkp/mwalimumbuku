import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { BookOpen, UserPlus, Trash2, Eye, EyeOff, Edit, Search, Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';

export default function AdminCourses() {
  const qc = useQueryClient();
  const [assignDialog, setAssignDialog] = useState<string | null>(null);
  const [studentCode, setStudentCode] = useState('');
  const [search, setSearch] = useState('');

  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-all-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ['admin-course-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('course_enrollments').select('course_id');
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles-for-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name');
      if (error) throw error;
      return data;
    },
  });

  const enrollmentCounts = new Map<string, number>();
  enrollments?.forEach(e => {
    enrollmentCounts.set(e.course_id, (enrollmentCounts.get(e.course_id) || 0) + 1);
  });

  const getTeacherName = (teacherId: string | null) => {
    if (!teacherId) return 'Aucun';
    return profiles?.find(p => p.user_id === teacherId)?.full_name || 'Inconnu';
  };

  const togglePublish = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await supabase.from('courses').update({ is_published: publish }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Statut mis à jour.'); qc.invalidateQueries({ queryKey: ['admin-all-courses'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      // Delete related data
      const { data: lessons } = await supabase.from('lessons').select('id').eq('course_id', id);
      if (lessons) {
        for (const l of lessons) {
          await supabase.from('exercises').delete().eq('lesson_id', l.id);
        }
        await supabase.from('lessons').delete().eq('course_id', id);
      }
      await supabase.from('course_enrollments').delete().eq('course_id', id);
      await supabase.from('assignments').delete().eq('course_id', id);
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Cours supprimé.'); qc.invalidateQueries({ queryKey: ['admin-all-courses'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const assignStudent = useMutation({
    mutationFn: async ({ courseId, code }: { courseId: string; code: string }) => {
      // Try by student code first, then by name
      let userId: string | null = null;
      const { data: byCode } = await supabase.from('profiles').select('user_id').eq('student_code', code).single();
      if (byCode) {
        userId = byCode.user_id;
      } else {
        const { data: byName } = await supabase.from('profiles').select('user_id').ilike('full_name', `%${code}%`).limit(1).single();
        if (byName) userId = byName.user_id;
      }
      if (!userId) throw new Error('Élève non trouvé. Utilisez le code STU-XXXX ou le nom.');
      const { error } = await supabase.from('course_enrollments').insert({ course_id: courseId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Élève inscrit au cours !');
      setStudentCode('');
      setAssignDialog(null);
      qc.invalidateQueries({ queryKey: ['admin-course-enrollments'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = courses?.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.title.toLowerCase().includes(s) || c.subject.toLowerCase().includes(s);
  });

  const pagination = usePagination(filtered, 5);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Gestion des Cours</h1>
          <p className="mt-1 text-muted-foreground">{courses?.length ?? 0} cours sur la plateforme.</p>
        </div>
        <Link to="/dashboard/create-course">
          <Button className="gap-2"><BookOpen className="h-4 w-4" /> Créer un cours</Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un cours..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Aucun cours trouvé.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Titre</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Matière</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Niveau</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Enseignant</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Inscrits</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedItems.map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.is_premium && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                        <span className="font-medium text-foreground">{c.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{c.level}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{getTeacherName(c.teacher_id)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{enrollmentCounts.get(c.id) || 0}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={c.is_published ? 'default' : 'outline'} className="text-xs">
                        {c.is_published ? 'Publié' : 'Brouillon'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/dashboard/courses/${c.id}/edit`}>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                        </Link>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                          onClick={() => togglePublish.mutate({ id: c.id, publish: !c.is_published })}>
                          {c.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setAssignDialog(c.id)}>
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm('Supprimer ce cours et tout son contenu ?')) deleteCourse.mutate(c.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls {...pagination} />
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={(o) => { if (!o) { setAssignDialog(null); setStudentCode(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Inscrire un élève</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code élève ou nom</Label>
              <Input value={studentCode} onChange={(e) => setStudentCode(e.target.value)} placeholder="STU-XXXXXX ou nom..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => assignDialog && assignStudent.mutate({ courseId: assignDialog, code: studentCode })}
              disabled={assignStudent.isPending || !studentCode}>
              Inscrire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
