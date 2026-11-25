"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { useTickets, SupportTicket } from '@/src/hooks/useSupport';
import SupportChat from '@/src/components/support/SupportChat';
import NewTicketDialog from '@/src/components/support/NewTicketDialog';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { supabase } from '@/src/integrations/supabase/client';
import { Plus, LifeBuoy } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const CATEGORY_LABEL: Record<string, string> = {
  technical_issue: 'Problème technique', learning_difficulty: 'Difficulté d\'apprentissage',
  homework_help: 'Aide aux devoirs', subscription_issue: 'Abonnement',
  teacher_assistance: 'Assistance enseignant', parent_guidance: 'Conseils parents',
  general_inquiry: 'Question générale', academic_question: 'Question académique', report_issue: 'Signalement',
};
const STATUS_LABEL: Record<string, string> = {
  open: 'Ouvert', pending: 'En attente', replied: 'Répondu', resolved: 'Résolu', closed: 'Fermé',
};
const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-muted text-muted-foreground', normal: 'bg-primary/10 text-primary',
  high: 'bg-orange-500/10 text-orange-600', urgent: 'bg-destructive/10 text-destructive',
};

export default function SupportPage() {
  const { role } = useAuth();
  const isStaff = role === 'admin' || role === 'teacher';
  const { tickets } = useTickets(isStaff);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return tickets;
    return tickets.filter((t) => t.status === filter);
  }, [tickets, filter]);

  const active = tickets.find((t) => t.id === activeId);

  const updateTicket = async (id: string, patch: Partial<SupportTicket>) => {
    await (supabase as any).from('support_tickets').update(patch).eq('id', id);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <LifeBuoy className="h-6 w-6 text-primary" /> Contactez-nous
          </h1>
          <p className="text-sm text-muted-foreground">
            {isStaff ? 'Centre de modération du support' : 'Posez vos questions, signalez un problème, obtenez de l\'aide'}
          </p>
        </div>
        {!isStaff && (
          <NewTicketDialog onCreated={(id) => setActiveId(id)}>
            <Button><Plus className="mr-1 h-4 w-4" /> Nouveau ticket</Button>
          </NewTicketDialog>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-3">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {filtered.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">Aucun ticket</p>
            )}
            {filtered.map((t) => (
              <button key={t.id} onClick={() => setActiveId(t.id)}
                className={cn('block w-full border-b border-border p-3 text-left hover:bg-muted',
                  activeId === t.id && 'bg-muted')}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{t.subject}</p>
                  <Badge className={cn('text-[10px]', PRIORITY_COLOR[t.priority])} variant="outline">{t.priority}</Badge>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{CATEGORY_LABEL[t.category]}</span>
                  <span>{STATUS_LABEL[t.status]}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(t.last_message_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex h-[70vh] flex-col rounded-xl border border-border bg-card">
          {active ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{active.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABEL[active.category]} · Priorité {active.priority}
                  </p>
                </div>
                {isStaff && (
                  <div className="flex flex-wrap gap-2">
                    <Select value={active.priority} onValueChange={(v) => updateTicket(active.id, { priority: v as any })}>
                      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Faible</SelectItem>
                        <SelectItem value="normal">Normale</SelectItem>
                        <SelectItem value="high">Élevée</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={active.status} onValueChange={(v) => updateTicket(active.id, { status: v as any })}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <SupportChat ticket={active} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Sélectionnez un ticket pour commencer la conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
