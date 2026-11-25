"use client";

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuth } from '@/src/hooks/useAuth';
import { Card, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Label } from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { Users, Mail, Phone, Send, Lightbulb, BarChart3 } from 'lucide-react';
import { toast } from '@/src/components/ui/sonner';

export default function TeacherStudentsPage() {
  const { user } = useAuth();
  const [recoFor, setRecoFor] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low'|'normal'|'high'>('normal');

  // Get teacher's courses
  const { data: courses } = useQuery({
    queryKey: ['teacher-courses-roster', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id,title,subject').eq('teacher_id', user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const courseIds = useMemo(() => (courses ?? []).map(c => c.id), [courses]);

  // Get enrollments + student profiles + parents + results
  const { data: roster } = useQuery({
    queryKey: ['teacher-roster', courseIds.join(',')],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data: enrolls } = await supabase.from('course_enrollments')
        .select('user_id, course_id, enrolled_at').in('course_id', courseIds);
      const studentIds = Array.from(new Set((enrolls ?? []).map(e => e.user_id)));
      if (studentIds.length === 0) return [];
      const [{ data: profiles }, { data: parents }, { data: results }, { data: studentProfiles }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, phone, student_code, avatar_url').in('user_id', studentIds),
        supabase.from('parent_student').select('parent_id, student_id').in('student_id', studentIds),
        supabase.from('results').select('user_id, is_correct, points_earned').in('user_id', studentIds),
        (supabase as any).from('student_profiles').select('user_id, class_level, weak_subjects, school_name').in('user_id', studentIds),
      ]);
      const parentIds = Array.from(new Set((parents ?? []).map((p: any) => p.parent_id)));
      const { data: parentProfiles } = parentIds.length
        ? await supabase.from('profiles').select('user_id, full_name, phone').in('user_id', parentIds)
        : { data: [] as any[] };

      return studentIds.map((sid) => {
        const p = (profiles ?? []).find(x => x.user_id === sid);
        const sp = (studentProfiles ?? []).find((x: any) => x.user_id === sid);
        const myEnrolls = (enrolls ?? []).filter(e => e.user_id === sid);
        const myResults = (results ?? []).filter(r => r.user_id === sid);
        const correct = myResults.filter(r => r.is_correct).length;
        const total = myResults.length;
        const points = myResults.reduce((s, r) => s + (r.points_earned || 0), 0);
        const myParents = (parents ?? []).filter((x: any) => x.student_id === sid).map((x: any) => {
          return (parentProfiles ?? []).find((pp: any) => pp.user_id === x.parent_id);
        }).filter(Boolean);
        const enrolledCourses = myEnrolls.map(e => (courses ?? []).find(c => c.id === e.course_id)?.title).filter(Boolean);
        return {
          id: sid, name: p?.full_name ?? 'Élève', phone: p?.phone, code: p?.student_code,
          avatar: p?.avatar_url, classLevel: sp?.class_level, school: sp?.school_name,
          weakSubjects: sp?.weak_subjects ?? [],
          total, correct, points,
          accuracy: total ? Math.round((correct / total) * 100) : 0,
          parents: myParents, courses: enrolledCourses,
        };
      });
    },
    enabled: courseIds.length > 0,
  });

  const sendReco = async () => {
    if (!recoFor || !message.trim() || !user) return;
    const { error } = await (supabase as any).from('teacher_recommendations').insert({
      teacher_id: user.id, student_id: recoFor, message: message.trim(), priority,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Recommandation envoyée');
    setRecoFor(null); setMessage(''); setPriority('normal');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
          <Users className="h-6 w-6 text-primary" /> Mes élèves
        </h1>
        <p className="text-sm text-muted-foreground">Suivi, parents, performance et recommandations personnalisées</p>
      </div>

      {(!roster || roster.length === 0) && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Aucun élève inscrit dans vos cours.</CardContent></Card>
      )}

      <div className="grid gap-3">
        {roster?.map((s) => (
          <Card key={s.id}>
            <CardContent className="pt-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{s.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {s.code && <Badge variant="outline" className="text-[10px]">Code: {s.code}</Badge>}
                    {s.classLevel && <Badge variant="secondary" className="text-[10px]">Classe: {s.classLevel}</Badge>}
                    {s.school && <span>· {s.school}</span>}
                  </div>
                </div>
                <Dialog open={recoFor === s.id} onOpenChange={(o) => setRecoFor(o ? s.id : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Lightbulb className="mr-1 h-3 w-3" /> Recommandation</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Recommandation pour {s.name}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>Priorité</Label>
                        <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Faible</SelectItem>
                            <SelectItem value="normal">Normale</SelectItem>
                            <SelectItem value="high">Élevée</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Message</Label>
                        <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Conseils, axes d'amélioration…" />
                      </div>
                      <Button className="w-full" onClick={sendReco} disabled={!message.trim()}>
                        <Send className="mr-1 h-4 w-4" /> Envoyer
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-primary/5 p-2">
                  <p className="text-lg font-bold text-primary">{s.points}</p>
                  <p className="text-[10px] text-muted-foreground">Points</p>
                </div>
                <div className="rounded-lg bg-accent/5 p-2">
                  <p className="text-lg font-bold text-accent">{s.accuracy}%</p>
                  <p className="text-[10px] text-muted-foreground">Précision</p>
                </div>
                <div className="rounded-lg bg-secondary/5 p-2">
                  <p className="text-lg font-bold text-secondary">{s.total}</p>
                  <p className="text-[10px] text-muted-foreground">Exercices</p>
                </div>
              </div>

              {s.weakSubjects.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground"><BarChart3 className="inline h-3 w-3" /> Points faibles:</span>
                  {s.weakSubjects.map((w: string) => <Badge key={w} variant="destructive" className="text-[10px]">{w}</Badge>)}
                </div>
              )}

              {s.parents.length > 0 && (
                <div className="border-t border-border pt-2">
                  <p className="text-xs font-semibold text-foreground mb-1">Parents:</p>
                  {s.parents.map((p: any, i: number) => (
                    <div key={i} className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span><Mail className="inline h-3 w-3" /> {p?.full_name}</span>
                      {p?.phone && <span><Phone className="inline h-3 w-3" /> {p.phone}</span>}
                    </div>
                  ))}
                </div>
              )}

              {s.courses.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.courses.map((c: any, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{c}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
