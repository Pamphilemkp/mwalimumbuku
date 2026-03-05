import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCourseLessons, useCreateLesson, useCreateExercise } from '@/hooks/useCourses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Plus, BookOpen, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function CourseEditor() {
  const { courseId } = useParams();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [exQuestion, setExQuestion] = useState('');
  const [exCorrect, setExCorrect] = useState('');
  const [exOptions, setExOptions] = useState('');
  const [exPoints, setExPoints] = useState(10);

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').eq('id', courseId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: lessons, isLoading } = useCourseLessons(courseId);
  const { data: exercises } = useQuery({
    queryKey: ['exercises-teacher', selectedLessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('lesson_id', selectedLessonId!);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLessonId,
  });
  const createLesson = useCreateLesson();
  const createExercise = useCreateExercise();

  const handleAddLesson = () => {
    if (!lessonTitle) return;
    createLesson.mutate(
      { title: lessonTitle, content: lessonContent, course_id: courseId!, sort_order: (lessons?.length ?? 0) + 1 },
      {
        onSuccess: () => {
          toast.success('Lesson added!');
          setLessonTitle('');
          setLessonContent('');
          setLessonDialogOpen(false);
        },
        onError: (e: any) => toast.error(e.message),
      }
    );
  };

  const handleAddExercise = () => {
    if (!exQuestion || !exCorrect || !selectedLessonId) return;
    const options = exOptions.split(',').map((o) => o.trim()).filter(Boolean);
    if (!options.includes(exCorrect)) options.push(exCorrect);
    createExercise.mutate(
      { question: exQuestion, correct_answer: exCorrect, options, lesson_id: selectedLessonId, points: exPoints },
      {
        onSuccess: () => {
          toast.success('Exercise added!');
          setExQuestion('');
          setExCorrect('');
          setExOptions('');
          setExPoints(10);
          setExerciseDialogOpen(false);
        },
        onError: (e: any) => toast.error(e.message),
      }
    );
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{course?.title}</h1>
        <div className="mt-2 flex gap-2">
          <Badge variant="secondary">{course?.subject}</Badge>
          <Badge variant="outline">{course?.level}</Badge>
          <Badge variant={course?.is_published ? 'default' : 'outline'}>
            {course?.is_published ? 'Published' : 'Draft'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Lessons sidebar */}
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lessons</h3>
            <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Lesson</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Title</Label><Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Content</Label><Textarea value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} rows={6} /></div>
                  <Button onClick={handleAddLesson} disabled={createLesson.isPending}>Add Lesson</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {lessons?.map((l) => (
            <button key={l.id} onClick={() => setSelectedLessonId(l.id)}
              className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                selectedLessonId === l.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted')}>
              <ChevronRight className="h-4 w-4 shrink-0" />{l.title}
            </button>
          ))}
          {lessons?.length === 0 && <p className="text-sm text-muted-foreground">No lessons yet.</p>}
        </div>

        {/* Content area */}
        <div>
          {selectedLessonId ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {lessons?.find((l) => l.id === selectedLessonId)?.title}
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {lessons?.find((l) => l.id === selectedLessonId)?.content || 'No content.'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-foreground">Exercises</h3>
                <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Exercise</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Exercise</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Question</Label><Input value={exQuestion} onChange={(e) => setExQuestion(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Correct Answer</Label><Input value={exCorrect} onChange={(e) => setExCorrect(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Options (comma-separated)</Label><Input value={exOptions} onChange={(e) => setExOptions(e.target.value)} placeholder="Option A, Option B, Option C" /></div>
                      <div className="space-y-2"><Label>Points</Label><Input type="number" value={exPoints} onChange={(e) => setExPoints(Number(e.target.value))} /></div>
                      <Button onClick={handleAddExercise} disabled={createExercise.isPending}>Add Exercise</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {exercises?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exercises for this lesson.</p>
              ) : (
                <div className="space-y-3">
                  {exercises?.map((ex) => (
                    <div key={ex.id} className="rounded-lg border border-border bg-card p-4">
                      <p className="font-medium text-foreground">{ex.question}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Answer: {ex.correct_answer} · {ex.points}pts</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
              <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Select or add a lesson</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
