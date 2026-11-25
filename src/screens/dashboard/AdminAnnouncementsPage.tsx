"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { publishAnnouncementAction } from '@/features/portals/actions';
import { Card } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Button } from '@/src/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { toast } from '@/src/components/ui/sonner';
import { Megaphone, Send, Loader2 } from 'lucide-react';

type Audience = 'all' | 'student' | 'parent' | 'teacher';

export default function AdminAnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Titre et message requis');
      return;
    }
    setSending(true);
    try {
      const result = await publishAnnouncementAction({ title, message, audience });
      if (!result.ok) throw new Error(result.message);
      toast.success(result.message);
      setTitle(''); setMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Megaphone className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Annonces</h1>
          <p className="text-sm text-muted-foreground">Diffusez des messages à toute la plateforme.</p>
        </div>
      </div>

      <Card className="space-y-4 p-5">
        <div>
          <Label>Destinataires</Label>
          <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              <SelectItem value="student">Élèves</SelectItem>
              <SelectItem value="parent">Parents</SelectItem>
              <SelectItem value="teacher">Enseignants</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Titre</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Maintenance prévue" />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <Button onClick={send} disabled={sending} className="w-full">
          {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Envoyer l'annonce
        </Button>
      </Card>
    </motion.div>
  );
}
