import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCourseLessons, useLessonExercises } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BookOpen, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function CourseView() {
  const { courseId } = useParams();
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

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, { is_correct: boolean; points_earned: number }>>({});

  const handleAnswer = async (exerciseId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [exerciseId]: answer }));

    // Server-side answer checking — correct_answer is never exposed to client
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
    toast(result.is_correct ? '🎉 Correct! Well done!' : '❌ Not quite. Keep trying!');
  };

  const selectedLesson = lessons?.find((l) => l.id === selectedLessonId);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{course?.title}</h1>
        <p className="mt-1 text-muted-foreground">{course?.description}</p>
        <div className="mt-2 flex gap-2">
          <Badge variant="secondary">{course?.subject}</Badge>
          <Badge variant="outline">{course?.level}</Badge>
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
                onClick={() => { setSelectedLessonId(lesson.id); setAnswers({}); setSubmitted({}); }}
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
                  <h2 className="font-display text-2xl font-bold text-foreground">{selectedLesson.title}</h2>
                  <div className="mt-4 prose prose-sm max-w-none text-foreground/90 whitespace-pre-wrap">
                    {selectedLesson.content || 'No content available.'}
                  </div>
                </div>

                {/* Exercises */}
                {exercises && exercises.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h3 className="font-display text-lg font-semibold text-foreground">Exercises</h3>
                    {exercises.map((ex) => {
                      const options = Array.isArray(ex.options) ? (ex.options as string[]) : [];
                      const result = submitted[ex.id];
                      const userAnswer = answers[ex.id];
                      const isSubmitted = !!result;

                      return (
                        <div key={ex.id} className="rounded-xl border border-border bg-card p-5">
                          <p className="mb-3 font-medium text-foreground">{ex.question}</p>
                          <div className="space-y-2">
                            {options.map((opt) => {
                              const isSelected = userAnswer === opt;
                              const isCorrectAnswer = isSubmitted && result.is_correct && isSelected;
                              const isWrongAnswer = isSubmitted && !result.is_correct && isSelected;

                              return (
                                <button
                                  key={opt}
                                  disabled={isSubmitted}
                                  onClick={() => handleAnswer(ex.id, opt)}
                                  className={cn(
                                    'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all',
                                    isCorrectAnswer && 'border-primary bg-primary/5 text-primary',
                                    isWrongAnswer && 'border-destructive bg-destructive/5 text-destructive',
                                    !isSubmitted && 'border-border hover:border-primary/50 hover:bg-primary/5'
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
                            <p className="mt-2 text-xs text-muted-foreground">
                              +{result.points_earned} points
                            </p>
                          )}
                        </div>
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
