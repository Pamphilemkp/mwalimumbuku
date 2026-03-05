import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';

export default function AdminCourses() {
  const qc = useQueryClient();
  const [assignDialog, setAssignDialog] = useState<string | null>(null);
  const [studentEmail, setStudentEmail] = useState('');

  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-all-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const assignStudent = useMutation({
    mutationFn: async ({ courseId, email }: { courseId: string; email: string }) => {
      // Find student by email via profiles
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .ilike('full_name', `%${email}%`)
        .limit(1)
        .single();
      
      if (pErr || !profile) {
        // Try finding by user_id directly
        const { data: directProfile, error: dErr } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', email)
          .single();
        
        if (dErr || !directProfile) throw new Error('Student not found. Use the student\'s User ID or name.');
        
        const { error } = await supabase
          .from('course_enrollments')
          .insert({ course_id: courseId, user_id: directProfile.user_id });
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from('course_enrollments')
        .insert({ course_id: courseId, user_id: profile.user_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Student assigned to course!');
      setStudentEmail('');
      setAssignDialog(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Course Management</h1>
        <p className="mt-1 text-muted-foreground">{courses?.length ?? 0} courses on the platform.</p>
      </div>

      {courses?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No courses created yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Subject</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Level</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Enrollment</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses?.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{c.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{c.level}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {(c as any).is_open_enrollment !== false ? 'Open' : 'Assigned Only'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={c.is_published ? 'default' : 'outline'}>
                        {c.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Dialog open={assignDialog === c.id} onOpenChange={(open) => setAssignDialog(open ? c.id : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1">
                            <UserPlus className="h-3.5 w-3.5" /> Assign
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Assign Student to {c.title}</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Student Name or User ID</Label>
                              <Input
                                value={studentEmail}
                                onChange={(e) => setStudentEmail(e.target.value)}
                                placeholder="Enter student name or user ID..."
                              />
                            </div>
                            <Button
                              onClick={() => assignStudent.mutate({ courseId: c.id, email: studentEmail })}
                              disabled={assignStudent.isPending || !studentEmail}
                            >
                              Assign Student
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
