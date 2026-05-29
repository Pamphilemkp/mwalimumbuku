import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircleQuestion, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTickets } from '@/hooks/useSupport';
import SupportChat from './SupportChat';
import NewTicketDialog from './NewTicketDialog';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  open: 'Ouvert', pending: 'En attente', replied: 'Répondu', resolved: 'Résolu', closed: 'Fermé',
};
const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-muted', normal: 'bg-primary', high: 'bg-orange-500', urgent: 'bg-destructive',
};

export default function SupportWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { tickets } = useTickets(false);

  if (!user) return null;

  const active = tickets.find((t) => t.id === activeId);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
        aria-label="Contactez-nous"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircleQuestion className="h-6 w-6" />}
      </button>

      {open && (
        <div className={cn(
          'fixed bottom-24 right-5 z-50 flex w-[92vw] max-w-sm flex-col rounded-2xl border border-border bg-card shadow-2xl',
          'h-[70vh] max-h-[600px]'
        )}>
          <div className="flex items-center justify-between border-b border-border p-3">
            <div>
              <p className="font-semibold text-foreground text-sm">Contactez-nous</p>
              <p className="text-[11px] text-muted-foreground">Support en temps réel</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/support')}>Ouvrir</Button>
          </div>

          {active ? (
            <>
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <button onClick={() => setActiveId(null)} className="text-xs text-primary">← Retour</button>
                <span className="text-xs font-medium truncate">{active.subject}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <SupportChat ticket={active} />
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <NewTicketDialog onCreated={(id) => setActiveId(id)}>
                <Button className="w-full" size="sm">+ Nouvelle demande</Button>
              </NewTicketDialog>
              {tickets.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">Aucun ticket. Posez votre première question !</p>
              )}
              {tickets.map((t) => (
                <button key={t.id} onClick={() => setActiveId(t.id)}
                  className="w-full rounded-lg border border-border p-2 text-left hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[t.priority])} />
                    <p className="flex-1 truncate text-sm font-medium">{t.subject}</p>
                    <span className="text-[10px] text-muted-foreground">{STATUS_LABEL[t.status]}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(t.last_message_at).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
