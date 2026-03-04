import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Plus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChildrenPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [studentEmail, setStudentEmail] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: children, isLoading } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_student')
        .select('*, profiles!parent_student_student_id_fkey(full_name)')
        .eq('parent_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const linkChild = useMutation({
    mutationFn: async () => {
      // Find profile by looking up user with that email
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, full_name');
      if (pErr) throw pErr;

      // We need to find the student by checking auth - but we can't query auth.users
      // Instead, we'll ask for the student's user ID directly or use a workaround
      // For now, let's search by full_name match from profiles
      // A better approach: search by email through an edge function
      // Simplified: parent enters student user ID
      toast.error('Enter the student User ID (ask them to share it from their profile)');
      throw new Error('Need student ID');
    },
    onSuccess: () => {
      toast.success('Child linked!');
      setStudentEmail('');
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['parent-children'] });
    },
  });

  const linkByUserId = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase.rpc('link_parent_child', { _student_id: studentId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Child linked successfully!');
      setStudentEmail('');
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['parent-children'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">My Children</h1>
          <p className="mt-1 text-muted-foreground">Manage linked student accounts.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Link Child</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Link a Child</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your child's User ID. They can find it on their Profile page.
              </p>
              <div className="space-y-2">
                <Label>Student User ID</Label>
                <Input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="e.g. abc123-..." />
              </div>
              <Button onClick={() => linkByUserId.mutate(studentEmail)} disabled={!studentEmail || linkByUserId.isPending}>
                Link Child
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <Skeleton className="h-20" /> : children?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No children linked yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {children?.map((c: any) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{c.profiles?.full_name || 'Student'}</p>
                <p className="text-xs text-muted-foreground">ID: {c.student_id}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
