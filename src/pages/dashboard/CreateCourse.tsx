import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateCourse } from '@/hooks/useCourses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { BookOpen, Crown, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const SUBJECTS = ['Mathematics', 'Science', 'English', 'French', 'History', 'Geography', 'Computer Science', 'Arts', 'Music', 'Physical Education'];

export default function CreateCourse() {
  const navigate = useNavigate();
  const createCourse = useCreateCourse();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [level, setLevel] = useState('beginner');
  const [description, setDescription] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [step, setStep] = useState(1);

  const finalSubject = subject === 'custom' ? customSubject : subject;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !finalSubject) {
      toast.error('Title and subject are required');
      return;
    }
    createCourse.mutate({ title, subject: finalSubject, level, description, is_premium: isPremium }, {
      onSuccess: (data) => {
        toast.success('Course created! Now add lessons and exercises.');
        navigate(`/dashboard/courses/${data.id}/edit`);
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const canProceed = step === 1 ? !!(title && finalSubject) : true;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <BookOpen className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">Create Course</h1>
        <p className="mt-1 text-muted-foreground">Set up a new course for your students</p>
      </motion.div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
              step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {s}
            </div>
            {s < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5"
        >
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Course Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Introduction to Mathematics"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select a subject" /></SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                    <SelectItem value="custom">Other (custom)</SelectItem>
                  </SelectContent>
                </Select>
                {subject === 'custom' && (
                  <Input
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="Enter subject name"
                    className="mt-2 h-11"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['beginner', 'intermediate', 'advanced'].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      className={cn(
                        'rounded-xl border px-4 py-3 text-sm font-medium transition-all',
                        level === l
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/30'
                      )}
                    >
                      {l.charAt(0).toUpperCase() + l.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canProceed}
                className="w-full h-11 gap-2"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will students learn in this course? Describe the objectives, topics covered, and target audience."
                  rows={5}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <Crown className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Premium Course</Label>
                    <p className="text-xs text-muted-foreground">Requires a subscription to access</p>
                  </div>
                </div>
                <Switch checked={isPremium} onCheckedChange={setIsPremium} />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-11">
                  Back
                </Button>
                <Button type="submit" disabled={createCourse.isPending} className="flex-1 h-11 gap-2">
                  <Sparkles className="h-4 w-4" />
                  {createCourse.isPending ? 'Creating…' : 'Create Course'}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </form>
    </div>
  );
}
