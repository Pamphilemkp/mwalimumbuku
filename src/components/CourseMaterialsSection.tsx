"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuth } from '@/src/hooks/useAuth';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Badge } from '@/src/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { FileText, Film, Image as ImageIcon, Presentation, Paperclip, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from '@/src/components/ui/sonner';

type Material = {
  id: string; course_id: string; lesson_id: string | null;
  title: string; description: string | null; file_url: string;
  file_name: string | null; material_type: string; created_at: string;
};

const TYPES: { value: string; label: string; icon: any }[] = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'video', label: 'Vidéo', icon: Film },
  { value: 'presentation', label: 'Présentation', icon: Presentation },
  { value: 'image', label: 'Image', icon: ImageIcon },
  { value: 'file', label: 'Fichier', icon: Paperclip },
];

const detectType = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['mp4','mov','webm','avi','mkv'].includes(ext)) return 'video';
  if (['ppt','pptx','key','odp'].includes(ext)) return 'presentation';
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return 'image';
  return 'file';
};

export default function CourseMaterialsSection({ courseId, lessons }: { courseId: string; lessons?: { id: string; title: string }[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('pdf');
  const [lessonId, setLessonId] = useState<string>('none');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: materials } = useQuery({
    queryKey: ['course-materials', courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('course_materials')
        .select('*').eq('course_id', courseId).order('created_at', { ascending: false });
      if (error) throw error;
      return data as Material[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('course_materials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-materials', courseId] }),
  });

  const upload = async () => {
    if (!file || !user || !title.trim()) return;
    setBusy(true);
    try {
      const path = `${user.id}/${courseId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      const { error: upErr } = await supabase.storage.from('course-materials').upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('course-materials').getPublicUrl(path);
      const { error } = await (supabase as any).from('course_materials').insert({
        course_id: courseId,
        lesson_id: lessonId === 'none' ? null : lessonId,
        title: title.trim(),
        description: desc.trim() || null,
        file_url: pub.publicUrl,
        file_name: file.name,
        material_type: type,
        uploaded_by: user.id,
      });
      if (error) throw error;
      toast.success('Document ajouté');
      setOpen(false); setTitle(''); setDesc(''); setFile(null); setLessonId('none');
      qc.invalidateQueries({ queryKey: ['course-materials', courseId] });
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur d\'upload');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">Documents du cours</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau document</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Titre</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label>Description (optionnel)</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Leçon (optionnel)</Label>
                  <Select value={lessonId} onValueChange={setLessonId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {lessons?.map(l => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Fichier</Label>
                <Input type="file" onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f) { setType(detectType(f.name)); if (!title) setTitle(f.name); }
                }} />
              </div>
              <Button className="w-full" onClick={upload} disabled={busy || !file || !title.trim()}>
                <Upload className="mr-1 h-4 w-4" />{busy ? 'Envoi…' : 'Téléverser'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!materials || materials.length === 0) && (
        <p className="text-sm text-muted-foreground">Aucun document pour ce cours.</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {materials?.map((m) => {
          const T = TYPES.find(x => x.value === m.material_type) ?? TYPES[4];
          return (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <T.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <a href={m.file_url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium hover:underline">{m.title}</a>
                {m.description && <p className="truncate text-xs text-muted-foreground">{m.description}</p>}
                <Badge variant="outline" className="mt-1 text-[10px]">{T.label}</Badge>
              </div>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(m.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
