import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { createTicket, SupportCategory, SupportPriority } from '@/hooks/useSupport';
import { toast } from 'sonner';

const CATEGORIES: { value: SupportCategory; label: string }[] = [
  { value: 'technical_issue', label: 'Problème technique' },
  { value: 'learning_difficulty', label: 'Difficulté d\'apprentissage' },
  { value: 'homework_help', label: 'Aide aux devoirs' },
  { value: 'subscription_issue', label: 'Abonnement / paiement' },
  { value: 'teacher_assistance', label: 'Assistance enseignant' },
  { value: 'parent_guidance', label: 'Conseils parents' },
  { value: 'academic_question', label: 'Question académique' },
  { value: 'report_issue', label: 'Signaler un problème' },
  { value: 'general_inquiry', label: 'Question générale' },
];

const PRIORITIES: { value: SupportPriority; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'normal', label: 'Normale' },
  { value: 'high', label: 'Élevée' },
  { value: 'urgent', label: 'Urgente' },
];

export default function NewTicketDialog({ children, onCreated }: { children: React.ReactNode; onCreated?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportCategory>('general_inquiry');
  const [priority, setPriority] = useState<SupportPriority>('normal');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) return;
    setBusy(true);
    try {
      const t = await createTicket({ subject: subject.trim(), category, priority, firstMessage: message.trim() });
      toast.success('Ticket créé');
      setOpen(false); setSubject(''); setMessage(''); setCategory('general_inquiry'); setPriority('normal');
      onCreated?.(t.id);
    } catch (e: any) { toast.error(e.message ?? 'Erreur'); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Nouvelle demande de support</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Sujet</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as SupportCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as SupportPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
          </div>
          <Button className="w-full" onClick={submit} disabled={busy || !subject.trim() || !message.trim()}>
            {busy ? 'Envoi…' : 'Envoyer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
