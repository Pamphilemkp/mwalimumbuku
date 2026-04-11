import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCourseLessons, useLessonExercises, useUserResults } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription, isPremium as checkPremium } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BookOpen, CheckCircle2, XCircle, ChevronRight, RotateCcw, Trophy, Lock, Crown, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TextToSpeech from '@/components/TextToSpeech';
import { toast } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

export default function CourseView() {
  const { courseId } = useParams();
  const { role } = useAuth();
  const { data: subscription } = useSubscription();
  const userIsPremium = checkPremium(subscription) || role === 'admin' || role === 'teacher';
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: lessons, isLoading } = useCourseLessons(courseId);
  const { data: exercises } = useLessonExercises(selectedLessonId ?? undefined);
  const { data: allResults } = useUserResults();

  // Map exercise results for current user - track best attempt per exercise
  const exerciseResults = useMemo(() => {
    if (!allResults) return new Map<string, { is_correct: boolean; points_earned: number; answer: string; attempts: number }>();
    const map = new Map<string, { is_correct: boolean; points_earned: number; answer: string; attempts: number }>();
    // Group results by exercise_id
    const grouped = new Map<string, typeof allResults>();
    for (const r of allResults) {
      const existing = grouped.get(r.exercise_id) ?? [];
      existing.push(r);
      grouped.set(r.exercise_id, existing);
    }
    for (const [exId, results] of grouped) {
      const best = results.reduce((a, b) => (b.points_earned > a.points_earned ? b : a), results[0]);
      map.set(exId, {
        is_correct: best.is_correct,
        points_earned: best.points_earned,
        answer: best.answer,
        attempts: results.length,
      });
    }
    return map;
  }, [allResults]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, { is_correct: boolean; points_earned: number }>>({});
  const [retaking, setRetaking] = useState<Set<string>>(new Set());

  const handleAnswer = async (exerciseId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [exerciseId]: answer }));

    const { data, error } = await supabase.rpc('check_answer', {
      _exercise_id: exerciseId,
      _answer: answer,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    const result = data as { is_correct: boolean; points_earned: number };
    setSubmitted((prev) => ({ ...prev, [exerciseId]: result }));
    setRetaking((prev) => { const n = new Set(prev); n.delete(exerciseId); return n; });
    toast(result.is_correct ? '🎉 Correct! Well done!' : '❌ Not quite. Keep trying!');
    // Notify parent (best-effort)
    supabase.functions.invoke('notify-enrollment', {
      body: { type: 'exercise_complete', exercise_id: exerciseId },
    }).catch(() => {});
  };

  const handleRetake = (exerciseId: string) => {
    setRetaking((prev) => new Set(prev).add(exerciseId));
    setAnswers((prev) => { const n = { ...prev }; delete n[exerciseId]; return n; });
    setSubmitted((prev) => { const n = { ...prev }; delete n[exerciseId]; return n; });
  };

  const selectedLesson = lessons?.find((l) => l.id === selectedLessonId);

  // Calculate lesson completion
  const lessonCompletion = useMemo(() => {
    if (!lessons || !exercises) return new Map<string, number>();
    const map = new Map<string, number>();
    // We only have exercises for the selected lesson, so can't calc for all
    return map;
  }, [lessons, exercises]);

  // Current lesson exercise stats
  const currentExerciseStats = useMemo(() => {
    if (!exercises) return { total: 0, completed: 0, correct: 0 };
    const total = exercises.length;
    let completed = 0;
    let correct = 0;
    for (const ex of exercises) {
      const prev = exerciseResults.get(ex.id);
      const current = submitted[ex.id];
      if (current || (prev && !retaking.has(ex.id))) {
        completed++;
        if (current?.is_correct || prev?.is_correct) correct++;
      }
    }
    return { total, completed, correct };
  }, [exercises, exerciseResults, submitted, retaking]);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40" /></div>;
  }

  // Premium course gate
  if (course?.is_premium && !userIsPremium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
          <Lock className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">Premium Course</h2>
        <p className="max-w-md text-muted-foreground">
          This course requires a Premium subscription. Upgrade your plan to access all premium content.
        </p>
        <Link to="/dashboard/subscription">
          <Button className="gap-2"><Crown className="h-4 w-4" /> Upgrade to Premium</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{course?.title}</h1>
        <p className="mt-1 text-muted-foreground">{course?.description}</p>
        <div className="mt-2 flex gap-2">
          <Badge variant="secondary">{course?.subject}</Badge>
          <Badge variant="outline">{course?.level}</Badge>
          {course?.is_premium && (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Crown className="mr-1 h-3 w-3" /> Premium
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Lesson list */}
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lessons</h3>
          {lessons?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lessons yet.</p>
          ) : (
            lessons?.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => { setSelectedLessonId(lesson.id); setAnswers({}); setSubmitted({}); setRetaking(new Set()); }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                  selectedLessonId === lesson.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <ChevronRight className="h-4 w-4 shrink-0" />
                {lesson.title}
              </button>
            ))
          )}
        </div>

        {/* Lesson content + exercises */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {selectedLesson ? (
              <motion.div key={selectedLesson.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display text-2xl font-bold text-foreground">{selectedLesson.title}</h2>
                    {selectedLesson.content && <TextToSpeech text={selectedLesson.content} compact />}
                  </div>
                  <div className="mt-4 prose prose-sm max-w-none text-foreground/90 whitespace-pre-wrap">
                    {selectedLesson.content || 'No content available.'}
                  </div>
                </div>

                {/* Exercise progress bar */}
                {exercises && exercises.length > 0 && (
                  <div className="mt-4 rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        Exercise Progress: {currentExerciseStats.completed}/{currentExerciseStats.total}
                      </span>
                      {currentExerciseStats.completed === currentExerciseStats.total && currentExerciseStats.total > 0 && (
                        <div className="flex items-center gap-1 text-primary font-medium">
                          <Trophy className="h-4 w-4" /> Lesson Complete!
                        </div>
                      )}
                    </div>
                    <Progress
                      value={currentExerciseStats.total > 0 ? (currentExerciseStats.completed / currentExerciseStats.total) * 100 : 0}
                      className="h-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {currentExerciseStats.correct} correct out of {currentExerciseStats.completed} attempted
                    </p>
                  </div>
                )}

                {/* Exercises */}
                {exercises && exercises.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h3 className="font-display text-lg font-semibold text-foreground">Exercises</h3>
                    {exercises.map((ex) => {
                      const options = Array.isArray(ex.options) ? (ex.options as string[]) : [];
                      const currentResult = submitted[ex.id];
                      const previousResult = exerciseResults.get(ex.id);
                      const isRetaking = retaking.has(ex.id);
                      const activeResult = currentResult || (!isRetaking && previousResult ? { is_correct: previousResult.is_correct, points_earned: previousResult.points_earned } : null);
                      const isSubmitted = !!activeResult;
                      const userAnswer = answers[ex.id] || (!isRetaking && previousResult?.answer);

                      return (
                        <motion.div
                          key={ex.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            'rounded-xl border p-5 transition-colors',
                            isSubmitted && activeResult?.is_correct
                              ? 'border-primary/30 bg-primary/5'
                              : isSubmitted && !activeResult?.is_correct
                              ? 'border-destructive/30 bg-destructive/5'
                              : 'border-border bg-card'
                          )}
                        >
                          <p className="mb-3 font-medium text-foreground">{ex.question}</p>
                          <div className="space-y-2">
                            {options.map((opt) => {
                              const isSelected = userAnswer === opt;
                              const isCorrectAnswer = isSubmitted && activeResult?.is_correct && isSelected;
                              const isWrongAnswer = isSubmitted && !activeResult?.is_correct && isSelected;

                              return (
                                <button
                                  key={opt}
                                  disabled={isSubmitted}
                                  onClick={() => handleAnswer(ex.id, opt)}
                                  className={cn(
                                    'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all',
                                    isCorrectAnswer && 'border-primary bg-primary/10 text-primary font-medium',
                                    isWrongAnswer && 'border-destructive bg-destructive/10 text-destructive font-medium',
                                    !isSubmitted && 'border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                                  )}
                                >
                                  {isCorrectAnswer && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                                  {isWrongAnswer && <XCircle className="h-4 w-4 shrink-0" />}
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          {isSubmitted && (
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {activeResult?.is_correct ? (
                                  <Badge variant="default" className="bg-primary text-primary-foreground">
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Correct
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <XCircle className="mr-1 h-3 w-3" /> Incorrect
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">+{activeResult?.points_earned} pts</span>
                                {previousResult && (
                                  <span className="text-xs text-muted-foreground">
                                    ({previousResult.attempts} attempt{previousResult.attempts !== 1 ? 's' : ''})
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRetake(ex.id)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <RotateCcw className="mr-1 h-3 w-3" /> Retake
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
                <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">Select a lesson to start learning</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
