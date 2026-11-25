"use client";

import { useState } from 'react';
import { scheduleLiveSessionAction, updateLiveSessionStatusAction } from '@/features/portals/actions';
import { formatNicosia } from '@/lib/portals/time';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuth } from '@/src/hooks/useAuth';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Badge } from '@/src/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Video, Plus, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { toast } from '@/src/components/ui/sonner';

export default function TeacherLiveSessionsPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const isTeacher = role === 'teacher';
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [link, setLink] = useState('');
  const [when, setWhen] = useState('');

  const { data: courses } = useQuery({
    queryKey: ['my-courses-for-sessions', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id,title').eq('teacher_id', user!.id);
      return data ?? [];
    },
    enabled: !!user && isTeacher,
  });

  const { data: sessions } = useQuery({
    queryKey: ['live-sessions', user?.id, role],
    queryFn: async () => {
      let q = (supabase as any).from('live_sessions').select('*, courses(title)').order('scheduled_at', { ascending: false });
      if (role === 'teacher') q = q.eq('teacher_id', user!.id);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
  });

  const create = useMutation({
    mutationFn: async () => {
      const result = await scheduleLiveSessionAction({
        courseId, title, description: desc, instructions: desc, link,
        startsAt: when, status: 'scheduled',
      });
      if (!result.ok) throw new Error(result.message);
    },
    onSuccess: () => {
      toast.success('Session programmée');
      setOpen(false); setTitle(''); setDesc(''); setLink(''); setWhen(''); setCourseId('');
      qc.invalidateQueries({ queryKey: ['live-sessions'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('live_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live-sessions'] }),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Video className="h-6 w-6 text-primary" /> Sessions en direct
          </h1>
          <p className="text-sm text-muted-foreground">{"Enregistrez l'horaire et les instructions d'accès. La liste se met à jour quand vous revenez sur cette page. Les heures sont affichées pour Nicosie."}</p>
        </div>
        {isTeacher && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Programmer</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle session live</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Cours</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger><SelectValue placeholder="Choisir un cours" /></SelectTrigger>
                    <SelectContent>
                      {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Titre</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div><Label>{"Instructions d'accès"}</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Écrivez comment les élèves rejoignent la séance." /></div>
                <div><Label>Lien facultatif</Label><Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" /></div>
                <div>
                  <Label>Début (Nicosie)</Label>
                  <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
                </div>
                <Button className="w-full" onClick={() => create.mutate()}
                  disabled={create.isPending || !courseId || !title || !when}>
                  Programmer la session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-3">
        {(!sessions || sessions.length === 0) && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Aucune session programmée.</CardContent></Card>
        )}
        {sessions?.map((s: any) => {
          const dt = new Date(s.scheduled_at);
          const upcoming = dt.getTime() > Date.now();
          return (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <Badge variant={s.status === 'live' ? 'default' : 'secondary'} className="text-[10px]">
                    {s.status || (upcoming ? 'scheduled' : 'ended')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">{s.courses?.title}</p>
                {s.description && <p className="text-sm">{s.description}</p>}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatNicosia(s.scheduled_at)} · {s.duration_minutes} min
                  {s.access_instructions || s.description ? <span className="block text-muted-foreground">{s.access_instructions || s.description}</span> : null}
                </div>
                <div className="flex gap-2 pt-1">
                  {s.meeting_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={s.meeting_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1 h-3 w-3" /> Rejoindre
                      </a>
                    </Button>
                  )}
                  {isTeacher && (
                    <>
                      {(['scheduled', 'live', 'ended', 'cancelled'] as const).map((status) => (
                        <Button key={status} size="sm" variant="outline" onClick={() => updateLiveSessionStatusAction(s.id, status).then(() => qc.invalidateQueries({ queryKey: ['live-sessions'] }))}>
                          {status}
                        </Button>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => del.mutate(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
