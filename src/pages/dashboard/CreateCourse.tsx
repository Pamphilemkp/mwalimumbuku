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

export default function CreateCourse() {
  const navigate = useNavigate();
  const createCourse = useCreateCourse();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('beginner');
  const [description, setDescription] = useState('');
  const [isPremium, setIsPremium] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject) {
      toast.error('Title and subject are required');
      return;
    }
    createCourse.mutate({ title, subject, level, description, is_premium: isPremium }, {
      onSuccess: (data) => {
        toast.success('Course created!');
        navigate(`/dashboard/courses/${data.id}/edit`);
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Create Course</h1>
        <p className="mt-1 text-muted-foreground">Set up a new course for your students.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5 rounded-xl border border-border bg-card p-6">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to Mathematics" required />
        </div>
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" required />
        </div>
        <div className="space-y-2">
          <Label>Level</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will students learn?" />
        </div>
        <Button type="submit" disabled={createCourse.isPending}>
          {createCourse.isPending ? 'Creating…' : 'Create Course'}
        </Button>
      </form>
    </div>
  );
}
