import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Plus, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/sonner';

export default function TeacherLiveSessionsPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const isStaff = role === 'teacher' || role === 'admin';
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [link, setLink] = useState('');
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState(60);

  const { data: courses } = useQuery({
    queryKey: ['my-courses-for-sessions', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id,title').eq('teacher_id', user!.id);
      return data ?? [];
    },
    enabled: !!user && isStaff,
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
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('live_sessions').insert({
        course_id: courseId, teacher_id: user!.id, title, description: desc || null,
        meeting_url: link || null, scheduled_at: new Date(when).toISOString(),
        duration_minutes: duration,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Session programmée');
      setOpen(false); setTitle(''); setDesc(''); setLink(''); setWhen(''); setDuration(60); setCourseId('');
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
          <p className="text-sm text-muted-foreground">Programmez et gérez vos sessions live avec vos élèves</p>
        </div>
        {isStaff && (
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
                <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></div>
                <div><Label>Lien de réunion (Zoom, Google Meet…)</Label><Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Date & heure</Label><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
                  <div><Label>Durée (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
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
                  <Badge variant={upcoming ? 'default' : 'secondary'} className="text-[10px]">
                    {upcoming ? 'À venir' : 'Passée'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">{s.courses?.title}</p>
                {s.description && <p className="text-sm">{s.description}</p>}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(dt, 'PPP p')} · {s.duration_minutes} min
                </div>
                <div className="flex gap-2 pt-1">
                  {s.meeting_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={s.meeting_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1 h-3 w-3" /> Rejoindre
                      </a>
                    </Button>
                  )}
                  {isStaff && (
                    <Button size="sm" variant="ghost" onClick={() => del.mutate(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
