import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
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
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [studentEmail, setStudentEmail] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: children, isLoading } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('parent_student').select('*, profiles!parent_student_student_id_fkey(full_name)').eq('parent_id', user!.id);
      if (error) throw error; return data;
    },
    enabled: !!user,
  });

  const linkByUserId = useMutation({
    mutationFn: async (studentId: string) => { const { error } = await supabase.rpc('link_parent_child', { _student_id: studentId }); if (error) throw error; },
    onSuccess: () => { toast.success(t.children.childLinked); setStudentEmail(''); setDialogOpen(false); qc.invalidateQueries({ queryKey: ['parent-children'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{t.children.title}</h1>
          <p className="mt-1 text-muted-foreground">{t.children.subtitle}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> {t.children.linkChild}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.children.linkChildDialog}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.children.linkChildDesc}</p>
              <div className="space-y-2">
                <Label>{t.children.studentUserId}</Label>
                <Input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="e.g. abc123-..." />
              </div>
              <Button onClick={() => linkByUserId.mutate(studentEmail)} disabled={!studentEmail || linkByUserId.isPending}>{t.children.linkChild}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-20" /> : children?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">{t.children.noChildren}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {children?.map((c: any) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10"><Users className="h-5 w-5 text-secondary" /></div>
              <div><p className="font-medium text-foreground">{c.profiles?.full_name || t.auth.student}</p><p className="text-xs text-muted-foreground">ID: {c.student_id}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
