import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Plus, Crown, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function ChildrenPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const qc = useQueryClient();
  const [studentEmail, setStudentEmail] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: children, isLoading } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('parent_student').select('*, profiles!parent_student_student_id_fkey(full_name, student_code)').eq('parent_id', user!.id);
      if (error) throw error; return data;
    },
    enabled: !!user,
  });

  const { data: childSubscriptions } = useQuery({
    queryKey: ['child-subscriptions', children?.map(c => c.student_id)],
    queryFn: async () => {
      const ids = children!.map(c => c.student_id);
      const { data, error } = await supabase.from('subscriptions').select('*').in('user_id', ids);
      if (error) throw error;
      return data;
    },
    enabled: !!children && children.length > 0,
  });

  const linkByUserId = useMutation({
    mutationFn: async (studentId: string) => { const { error } = await supabase.rpc('link_parent_child', { _student_id: studentId }); if (error) throw error; },
    onSuccess: () => { toast.success(t.children.childLinked); setStudentEmail(''); setDialogOpen(false); qc.invalidateQueries({ queryKey: ['parent-children'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const upgradeChild = useMutation({
    mutationFn: async (childId: string) => {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { child_user_id: childId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { url: string };
    },
    onSuccess: (data) => { if (data.url) window.open(data.url, '_blank'); },
    onError: (e: any) => toast.error(e.message),
  });

  const getChildSub = (studentId: string) => childSubscriptions?.find(s => s.user_id === studentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
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
        <div className="space-y-3">
          {children?.map((c: any) => {
            const sub = getChildSub(c.student_id);
            const isPremium = sub?.tier === 'premium' && sub?.is_active;
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10"><Users className="h-5 w-5 text-secondary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{c.profiles?.full_name || t.auth.student}</p>
                    {isPremium ? (
                      <Badge variant="default" className="gap-1 text-[10px]"><Crown className="h-3 w-3" /> Premium</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Free</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'fr' ? 'Code' : 'Code'}: {c.profiles?.student_code || '—'} · ID: {c.student_id.slice(0, 8)}...
                  </p>
                </div>
                {!isPremium && (
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0"
                    onClick={() => upgradeChild.mutate(c.student_id)}
                    disabled={upgradeChild.isPending}>
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                    {lang === 'fr' ? 'Passer Premium' : 'Upgrade Premium'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
