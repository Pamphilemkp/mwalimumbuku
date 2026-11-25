"use client";

import { useState } from 'react';
import { useParams } from '@/src/lib/next-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/integrations/supabase/client';
import { useCourseLessons, useCreateLesson, useCreateExercise } from '@/src/hooks/useCourses';
import { matchingAnswerIsValid } from '@/lib/assessment/grade';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Badge } from '@/src/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { cn } from '@/src/lib/utils';
import { Plus, BookOpen, ChevronRight, X, Calendar, Trash2 } from 'lucide-react';
import { toast } from '@/src/components/ui/sonner';
import CourseMaterialsSection from '@/src/components/CourseMaterialsSection';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { Calendar as CalendarUI } from '@/src/components/ui/calendar';
import { format } from 'date-fns';

export default function CourseEditor() {
  const { courseId } = useParams();
  const qc = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonObjectives, setLessonObjectives] = useState('');
  const [lessonExamples, setLessonExamples] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [lessonResource, setLessonResource] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);

  // Exercise form
  const [exQuestion, setExQuestion] = useState('');
  const [exCorrect, setExCorrect] = useState('');
  const [exOptions, setExOptions] = useState<string[]>([]);
  const [exOptionInput, setExOptionInput] = useState('');
  const [exPoints, setExPoints] = useState(10);
  const [exType, setExType] = useState('multiple_choice');
  const [exPartial, setExPartial] = useState(false);

  // Assignment form
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDueDate, setAssignDueDate] = useState<Date | undefined>();
  const [allowResubmit, setAllowResubmit] = useState(false);

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

  const { data: assignments } = useQuery({
    queryKey: ['assignments', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId!)
        .order('due_date');
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const createLesson = useCreateLesson();
  const createExercise = useCreateExercise();
  const courseStatus = useMutation({
    mutationFn: async (values: { is_published?: boolean; archived?: boolean }) => {
      if (!courseId || !course?.teacher_id) throw new Error('This course cannot be updated.');
      const { error } = await supabase.from('courses').update(values).eq('id', courseId).eq('teacher_id', course.teacher_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', courseId] }),
  });

  const createAssignment = useMutation({
    mutationFn: async (values: { title: string; description: string; due_date: string; course_id: string; allow_resubmit?: boolean }) => {
      const { data, error } = await supabase.from('assignments').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments', courseId] }),
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments', courseId] }),
  });

  const addOption = () => {
    const val = exOptionInput.trim();
    if (!val) return;
    if (exOptions.includes(val)) {
      toast.error('Option already added');
      return;
    }
    setExOptions((prev) => [...prev, val]);
    setExOptionInput('');
  };

  const removeOption = (opt: string) => {
    setExOptions((prev) => prev.filter((o) => o !== opt));
    if (exCorrect === opt) setExCorrect('');
  };

  const handleAddLesson = () => {
    if (!lessonTitle) return;
    createLesson.mutate(
      {
        title: lessonTitle,
        content: lessonContent,
        course_id: courseId!,
        sort_order: (lessons?.length ?? 0) + 1,
        ...(lessonVideoUrl ? { video_url: lessonVideoUrl } : {}),
        ...(lessonObjectives ? { objectives: lessonObjectives } : {}),
        ...(lessonExamples ? { examples: lessonExamples } : {}),
        ...(lessonSummary ? { summary: lessonSummary } : {}),
        ...(lessonResource ? { resource_url: lessonResource } : {}),
      },
      {
        onSuccess: () => {
          toast.success('Lesson added!');
          setLessonTitle('');
          setLessonContent('');
          setLessonObjectives('');
          setLessonExamples('');
          setLessonSummary('');
          setLessonResource('');
          setLessonVideoUrl('');
          setLessonDialogOpen(false);
        },
        onError: (e: any) => toast.error(e.message),
      }
    );
  };

  const handleAddExercise = () => {
    if (!exQuestion || !exCorrect || !selectedLessonId) return;
    const finalOptions = exType === 'multiple_choice'
      ? (exOptions.includes(exCorrect) ? exOptions : [...exOptions, exCorrect])
      : exOptions;
    if (exType === 'multiple_choice' && finalOptions.length < 2) {
      toast.error('Add at least 2 options');
      return;
    }
    if (exType === 'true_false' && !['true', 'false'].includes(exCorrect.trim().toLowerCase())) {
      toast.error('The answer is true or false');
      return;
    }
    if (exType === 'matching' && !matchingAnswerIsValid(exCorrect)) {
      toast.error('Write unique pairs as left=right, separated by |');
      return;
    }
    createExercise.mutate(
      {
        question: exQuestion,
        correct_answer: exCorrect,
        options: finalOptions,
        lesson_id: selectedLessonId,
        points: exPoints,
        ...(exType !== 'multiple_choice' ? { exercise_type: exType } : {}),
        ...(exPartial && exType === 'matching' ? { partial_credit: true } : {}),
      },
      {
        onSuccess: () => {
          toast.success('Exercise added!');
          setExQuestion('');
          setExCorrect('');
          setExOptions([]);
          setExOptionInput('');
          setExPoints(10);
          setExerciseDialogOpen(false);
        },
        onError: (e: any) => toast.error(e.message),
      }
    );
  };

  const handleAddAssignment = () => {
    if (!assignTitle || !assignDueDate) return;
    createAssignment.mutate(
      {
        title: assignTitle,
        description: assignDesc,
        due_date: assignDueDate.toISOString(),
        course_id: courseId!,
        ...(allowResubmit ? { allow_resubmit: true } : {}),
      },
      {
        onSuccess: () => {
          toast.success('Assignment added!');
          setAssignTitle('');
          setAssignDesc('');
          setAssignDueDate(undefined);
          setAssignmentDialogOpen(false);
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
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">{course?.subject}</Badge>
          <Badge variant="outline">{course?.level}</Badge>
          <Badge variant={course?.is_published ? 'default' : 'outline'}>
            {course?.is_published ? 'Published' : 'Draft'}
          </Badge>
          {course?.archived && <Badge variant="outline">Archived</Badge>}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={courseStatus.isPending}
            onClick={() => courseStatus.mutate(
              { is_published: !course?.is_published },
              { onError: (e: Error) => toast.error(e.message) },
            )}
          >
            {course?.is_published ? 'Unpublish' : 'Publish'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={courseStatus.isPending}
            onClick={() => courseStatus.mutate(
              { archived: !course?.archived },
              { onError: (e: Error) => toast.error(e.message) },
            )}
          >
            {course?.archived ? 'Restore' : 'Archive'}
          </Button>
          {(course as any)?.deadline && (
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              Deadline: {format(new Date((course as any).deadline), 'PPP')}
            </Badge>
          )}
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
                  <div className="space-y-2"><Label htmlFor="lesson-title">Title</Label><Input id="lesson-title" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="lesson-objectives">Learning objectives</Label><Textarea id="lesson-objectives" value={lessonObjectives} onChange={(e) => setLessonObjectives(e.target.value)} rows={2} /></div>
                  <div className="space-y-2"><Label htmlFor="lesson-explanation">Explanation</Label><Textarea id="lesson-explanation" value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} rows={6} /></div>
                  <div className="space-y-2"><Label htmlFor="lesson-examples">Examples</Label><Textarea id="lesson-examples" value={lessonExamples} onChange={(e) => setLessonExamples(e.target.value)} rows={3} /></div>
                  <div className="space-y-2"><Label htmlFor="lesson-summary">Summary</Label><Textarea id="lesson-summary" value={lessonSummary} onChange={(e) => setLessonSummary(e.target.value)} rows={2} /></div>
                  <div className="space-y-2"><Label htmlFor="lesson-resource">Resource link</Label><Input id="lesson-resource" value={lessonResource} onChange={(e) => setLessonResource(e.target.value)} placeholder="https://" /></div>
                  <div className="space-y-2"><Label>YouTube Video URL (optional)</Label><Input value={lessonVideoUrl} onChange={(e) => setLessonVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></div>
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
        <div className="space-y-6">
          {selectedLessonId ? (
            <>
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {lessons?.find((l) => l.id === selectedLessonId)?.title}
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {lessons?.find((l) => l.id === selectedLessonId)?.content || 'No content.'}
                </p>
              </div>

              {/* Exercises */}
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-foreground">Exercises</h3>
                <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Exercise</Button></DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Add Exercise</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="exercise-type">Type</Label>
                        <select
                          id="exercise-type"
                          value={exType}
                          onChange={(e) => setExType(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="multiple_choice">Multiple choice</option>
                          <option value="true_false">True or false</option>
                          <option value="short_answer">Short answer</option>
                          <option value="fill_blank">Fill in the blank</option>
                          <option value="matching">Matching</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Question</Label>
                        <Input value={exQuestion} onChange={(e) => setExQuestion(e.target.value)} placeholder="What is 2+2?" />
                      </div>
                      {exType !== 'multiple_choice' && (
                        <div className="space-y-2">
                          <Label>Correct answer</Label>
                          <Input
                            value={exCorrect}
                            onChange={(e) => setExCorrect(e.target.value)}
                            placeholder={exType === 'matching' ? 'cat=chat|dog=chien' : exType === 'true_false' ? 'true' : 'Answer'}
                          />
                        </div>
                      )}

                      {/* Options builder */}
                      <div className="space-y-2">
                        <Label>Options</Label>
                        <div className="flex gap-2">
                          <Input
                            value={exOptionInput}
                            onChange={(e) => setExOptionInput(e.target.value)}
                            placeholder="Type an option..."
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                          />
                          <Button type="button" variant="secondary" onClick={addOption} size="sm">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {exOptions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {exOptions.map((opt) => (
                              <Badge
                                key={opt}
                                variant={exCorrect === opt ? 'default' : 'secondary'}
                                className="gap-1 cursor-pointer pr-1"
                                onClick={() => setExCorrect(opt)}
                              >
                                {opt}
                                {exCorrect === opt && <span className="text-[10px]">✓</span>}
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeOption(opt); }}
                                  className="ml-1 rounded-full hover:bg-foreground/10 p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Click an option to mark it as the correct answer. {exCorrect && (
                            <span className="text-primary font-medium">Correct: {exCorrect}</span>
                          )}
                        </p>
                        {exType === 'matching' && (
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={exPartial} onChange={(e) => setExPartial(e.target.checked)} />
                            Give partial credit for each correct pair
                          </label>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Points</Label>
                        <Input type="number" value={exPoints} onChange={(e) => setExPoints(Number(e.target.value))} min={1} />
                      </div>
                      <Button
                        onClick={handleAddExercise}
                        disabled={createExercise.isPending || !exQuestion || !exCorrect || (exType === 'multiple_choice' && exOptions.length < 2)}
                      >
                        Add Exercise
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {exercises?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exercises for this lesson.</p>
              ) : (
                <div className="space-y-3">
                  {exercises?.map((ex) => {
                    const opts = Array.isArray(ex.options) ? (ex.options as string[]) : [];
                    return (
                      <div key={ex.id} className="rounded-lg border border-border bg-card p-4">
                        <p className="font-medium text-foreground">{ex.question}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {opts.map((o) => (
                            <Badge key={o} variant={o === ex.correct_answer ? 'default' : 'outline'} className="text-xs">
                              {o} {o === ex.correct_answer && '✓'}
                            </Badge>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{ex.points}pts</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
              <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Select or add a lesson</p>
            </div>
          )}

          {/* Assignments section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-foreground">Assignments & Deadlines</h3>
              <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Add Assignment</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Assignment</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Title</Label><Input value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)} placeholder="Homework 1" /></div>
                    <div className="space-y-2"><Label>Description</Label><Textarea value={assignDesc} onChange={(e) => setAssignDesc(e.target.value)} placeholder="Describe the assignment..." /></div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !assignDueDate && 'text-muted-foreground')}>
                            <Calendar className="mr-2 h-4 w-4" />
                            {assignDueDate ? format(assignDueDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarUI mode="single" selected={assignDueDate} onSelect={setAssignDueDate} initialFocus className="p-3 pointer-events-auto" disabled={(date) => date < new Date()} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={allowResubmit} onChange={(e) => setAllowResubmit(e.target.checked)} />
                      Allow a new submission after the work is returned
                    </label>
                    <Button onClick={handleAddAssignment} disabled={createAssignment.isPending || !assignTitle || !assignDueDate}>Add Assignment</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {assignments?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments yet.</p>
            ) : (
              <div className="space-y-2">
                {assignments?.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground text-sm">{a.title}</p>
                      <p className="text-xs text-muted-foreground">Due: {format(new Date(a.due_date), 'PPP')}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteAssignment.mutate(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <CourseMaterialsSection courseId={courseId!} lessons={lessons ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}
