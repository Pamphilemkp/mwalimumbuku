"use client";

import { useState } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { supabase } from '@/src/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { FileText, Clock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { format, isPast, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/src/i18n/LanguageContext';
import HomeworkUpload from '@/src/components/HomeworkUpload';
import { usePagination } from '@/src/hooks/usePagination';
import PaginationControls from '@/src/components/PaginationControls';

export default function StudentAssignments() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch assignments for enrolled courses
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['student-assignments', user?.id],
    queryFn: async () => {
      // Get enrolled course IDs
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user!.id);

      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map(e => e.course_id);

      const { data, error } = await supabase
        .from('assignments')
        .select('*, courses(title, subject)')
        .in('course_id', courseIds)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch submissions
  const { data: submissions } = useQuery({
    queryKey: ['homework-submissions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submissionMap = new Map(
    submissions?.map(s => [s.assignment_id, s]) ?? []
  );

  const pagination = usePagination(assignments, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Devoirs</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Chargement…</p></CardContent>
      </Card>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-primary" /> Devoirs</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun devoir pour le moment. Inscrivez-vous à des cours pour recevoir des devoirs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Devoirs ({assignments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pagination.paginatedItems.map((a: any) => {
          const sub = submissionMap.get(a.id);
          const due = new Date(a.due_date);
          const overdue = isPast(due) && !sub;
          const daysLeft = differenceInDays(due, new Date());
          const isExpanded = expandedId === a.id;

          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-xl border p-4 transition-all',
                overdue ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card',
                sub?.status === 'graded' && 'border-primary/30 bg-primary/5'
              )}
            >
              <div
                className="flex items-start justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : a.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {(a as any).courses?.subject}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {(a as any).courses?.title}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">{a.title}</h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(due, 'dd MMM yyyy', { locale: fr })}
                    </span>
                    {overdue && (
                      <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                        <AlertTriangle className="h-3 w-3" /> En retard
                      </span>
                    )}
                    {!overdue && !sub && daysLeft >= 0 && (
                      <span className="text-xs text-muted-foreground">
                        {daysLeft === 0 ? "Aujourd'hui" : `${daysLeft}j restant${daysLeft > 1 ? 's' : ''}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {sub ? (
                    <Badge
                      variant={sub.status === 'graded' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {sub.status === 'graded' ? (
                        <><CheckCircle2 className="h-3 w-3 mr-1" /> {sub.grade}/100</>
                      ) : sub.status === 'pending' ? (
                        'Soumis'
                      ) : (
                        sub.status
                      )}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Non soumis</Badge>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 mt-3 border-t border-border space-y-3">
                      {a.description && (
                        <p className="text-sm text-muted-foreground">{a.description}</p>
                      )}

                      {sub?.teacher_comment && (
                        <div className="rounded-lg bg-primary/5 p-3">
                          <p className="text-xs font-medium text-primary mb-1">Commentaire du professeur</p>
                          <p className="text-sm text-foreground">{sub.teacher_comment}</p>
                        </div>
                      )}

                      {sub?.file_name && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>Fichier soumis: {sub.file_name}</span>
                        </div>
                      )}

                      {!sub && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Upload className="h-3 w-3" /> Soumettre votre devoir
                          </p>
                          <HomeworkUpload assignmentId={a.id} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        <PaginationControls {...pagination} />
      </CardContent>
    </Card>
  );
}
