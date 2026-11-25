"use client";

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';
import { Card } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { GraduationCap, BookOpen, Users } from 'lucide-react';

export default function AdminAssignTeacherPage() {
  const { data: teachers, isLoading } = useQuery({
    queryKey: ['admin-teachers-overview'],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'teacher');
      const ids = (roles ?? []).map((r: any) => r.user_id);
      if (!ids.length) return [];
      const [{ data: profiles }, { data: tprofiles }, { data: courses }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, phone, city').in('user_id', ids),
        supabase.from('teacher_profiles').select('*').in('user_id', ids),
        supabase.from('courses').select('id, title, subject, level, teacher_id').in('teacher_id', ids),
      ]);
      return ids.map(id => {
        const p = profiles?.find((x: any) => x.user_id === id);
        const tp = tprofiles?.find((x: any) => x.user_id === id);
        const tc = (courses ?? []).filter((c: any) => c.teacher_id === id);
        return { id, profile: p, teacherProfile: tp, courses: tc };
      });
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
          <GraduationCap className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Enseignants & affectations</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble des enseignants et de leurs cours.</p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {teachers && teachers.length === 0 && <p className="text-sm text-muted-foreground">Aucun enseignant.</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {teachers?.map((t: any) => (
          <Card key={t.id} className="p-4 space-y-3">
            <div>
              <h3 className="font-display text-lg font-semibold">{t.profile?.full_name || 'Sans nom'}</h3>
              <p className="text-xs text-muted-foreground">{t.profile?.city} • {t.profile?.phone}</p>
            </div>
            {t.teacherProfile && (
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Qualification :</span> {t.teacherProfile.qualification || '—'}</p>
                <p><span className="font-medium">Expérience :</span> {t.teacherProfile.years_experience} ans</p>
                <div className="flex flex-wrap gap-1">
                  {(t.teacherProfile.subjects_taught ?? []).map((s: string) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <BookOpen className="h-3 w-3" /> Cours ({t.courses.length})
              </p>
              <ul className="mt-1 space-y-1 text-sm">
                {t.courses.length === 0 && <li className="text-xs text-muted-foreground">Aucun cours créé.</li>}
                {t.courses.map((c: any) => (
                  <li key={c.id} className="rounded border border-border px-2 py-1">
                    {c.title} <span className="text-xs text-muted-foreground">— {c.subject} / {c.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
