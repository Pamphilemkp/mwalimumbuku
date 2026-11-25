"use client";

import { useLanguage } from '@/src/i18n/LanguageContext';
import { useUserResults } from '@/src/hooks/useCourses';
import { Progress } from '@/src/components/ui/progress';
import { BarChart3, CheckCircle2, XCircle } from 'lucide-react';
import { Skeleton } from '@/src/components/ui/skeleton';

export default function ProgressPage() {
  const { t } = useLanguage();
  const { data: results, isLoading } = useUserResults();

  const totalPoints = results?.reduce((sum, r) => sum + r.points_earned, 0) ?? 0;
  const totalAttempts = results?.length ?? 0;
  const correctCount = results?.filter((r) => r.is_correct).length ?? 0;
  const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{t.progress.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.progress.subtitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <BarChart3 className="mb-2 h-5 w-5 text-primary" />
          <p className="text-2xl font-bold text-foreground">{totalPoints}</p>
          <p className="text-sm text-muted-foreground">{t.progress.totalPoints}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <CheckCircle2 className="mb-2 h-5 w-5 text-primary" />
          <p className="text-2xl font-bold text-foreground">{correctCount}/{totalAttempts}</p>
          <p className="text-sm text-muted-foreground">{t.progress.correctAnswers}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-2xl font-bold text-foreground">{accuracy}%</p>
          <p className="text-sm text-muted-foreground">{t.accuracy}</p>
          <Progress value={accuracy} className="mt-2 h-2" />
        </div>
      </div>
      <div>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">{t.progress.recentActivity}</h2>
        {results?.length === 0 ? (
          <p className="text-muted-foreground">{t.progress.noActivity}</p>
        ) : (
          <div className="space-y-2">
            {results?.slice(0, 20).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                {r.is_correct ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                <span className="text-sm text-foreground flex-1">{(r as any).exercises?.question ?? t.studentHome.exercise}</span>
                <span className="text-xs text-muted-foreground">+{r.points_earned}pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
