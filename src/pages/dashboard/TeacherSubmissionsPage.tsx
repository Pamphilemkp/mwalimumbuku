import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { NotebookPen, FileText, CheckCircle2, Clock, Download, User as UserIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';
import { cn } from '@/lib/utils';

export default function TeacherSubmissionsPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [grade, setGrade] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['teacher-submissions', user?.id, role],
    queryFn: async () => {
      // Admins can see all; teachers see their courses' submissions via RLS
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*, assignments(title, due_date, course_id, courses(title, subject, teacher_id)), profiles:user_id(full_name, student_code)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filtered = (submissions ?? []).filter((s: any) => {
    if (filter === 'pending') return s.status !== 'graded';
    if (filter === 'graded') return s.status === 'graded';
    return true;
  });

  const pagination = usePagination(filtered, 5);

  const openGrade = (s: any) => {
    setSelected(s);
    setGrade(s.grade !== null && s.grade !== undefined ? String(s.grade) : '');
    setComment(s.teacher_comment ?? '');
  };

  const saveGrade = useMutation({
    mutationFn: async () => {
      const g = grade === '' ? null : Number(grade);
      if (g !== null && (isNaN(g) || g < 0 || g > 100)) {
        throw new Error('La note doit être un nombre entre 0 et 100.');
      }
      const { error } = await supabase
        .from('homework_submissions')
        .update({ grade: g, teacher_comment: comment || null, status: g !== null ? 'graded' : 'pending' })
        .eq('id', selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Note enregistrée. L\'élève a été notifié.');
      qc.invalidateQueries({ queryKey: ['teacher-submissions'] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e?.message || 'Échec de l\'enregistrement.'),
    onSettled: () => setSaving(false),
  });

  const counts = {
    all: submissions?.length ?? 0,
    pending: submissions?.filter((s: any) => s.status !== 'graded').length ?? 0,
    graded: submissions?.filter((s: any) => s.status === 'graded').length ?? 0,
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-accent/10 via-primary/5 to-secondary/10 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-card shadow-sm">
            <NotebookPen className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Soumissions des devoirs</h1>
            <p className="text-sm text-muted-foreground">Notez et commentez chaque devoir remis par vos élèves.</p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-3 grid-cols-3">
        {[
          { key: 'all' as const, label: 'Total', value: counts.all },
          { key: 'pending' as const, label: 'À noter', value: counts.pending },
          { key: 'graded' as const, label: 'Notées', value: counts.graded },
        ].map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className={cn('rounded-xl border p-3 text-left transition-all',
              filter === c.key ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
            )}>
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="font-display text-xl font-bold text-foreground">{c.value}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            {filter === 'all' ? 'Toutes les soumissions' : filter === 'pending' ? 'En attente de notation' : 'Devoirs notés'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune soumission dans cette catégorie.</p>
          )}
          {pagination.paginatedItems.map((s: any) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="secondary" className="text-[10px]">{s.assignments?.courses?.subject}</Badge>
                    <Badge variant="outline" className="text-[10px]">{s.assignments?.courses?.title}</Badge>
                    {s.status === 'graded' ? (
                      <Badge className="text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" /> Noté {s.grade}/100</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]"><Clock className="h-3 w-3 mr-1" /> En attente</Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">{s.assignments?.title}</h4>
                  <div className="mt-2 grid gap-1 sm:grid-cols-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><UserIcon className="h-3 w-3" /> {s.profiles?.full_name || 'Élève'} {s.profiles?.student_code && <span className="font-mono text-primary">#{s.profiles.student_code}</span>}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Soumis le {format(new Date(s.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</span>
                  </div>
                  {s.teacher_comment && (
                    <p className="mt-2 text-sm text-foreground rounded-lg bg-muted p-2">{s.teacher_comment}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <a href={s.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5 w-full"><Download className="h-3.5 w-3.5" /> {s.file_name}</Button>
                  </a>
                  <Button size="sm" onClick={() => openGrade(s)} className="gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> {s.status === 'graded' ? 'Modifier la note' : 'Noter'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <PaginationControls {...pagination} />
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Noter le devoir</DialogTitle>
            <DialogDescription>
              {selected?.assignments?.title} — {selected?.profiles?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="grade">Note (sur 100)</Label>
              <Input id="grade" type="number" min="0" max="100" value={grade}
                onChange={(e) => setGrade(e.target.value)} placeholder="ex: 85" />
            </div>
            <div>
              <Label htmlFor="comment">Commentaire (optionnel)</Label>
              <Textarea id="comment" rows={4} value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Retour pédagogique pour l'élève…" />
            </div>
            {selected?.file_url && (
              <a href={selected.file_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" /> Télécharger la soumission
              </a>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Annuler</Button>
            <Button onClick={() => { setSaving(true); saveGrade.mutate(); }} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer & notifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
