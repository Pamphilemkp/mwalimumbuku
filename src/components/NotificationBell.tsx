"use client";

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { supabase } from '@/src/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/button';

export default function NotificationBell() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, type, is_read, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0;

  const typeColors: Record<string, string> = {
    assignment: 'bg-primary/10 text-primary',
    due_date: 'bg-amber-500/10 text-amber-600',
    past_due: 'bg-destructive/10 text-destructive',
    enrollment: 'bg-accent/10 text-accent',
    info: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title={lang === 'fr' ? 'La liste se met à jour toutes les 30 secondes' : 'This list refreshes every 30 seconds'}
        className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-display font-semibold text-foreground text-sm">
                {lang === 'fr' ? 'Notifications' : 'Notifications'}
              </h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => markAllRead.mutate()}>
                  {lang === 'fr' ? 'Tout marquer lu' : 'Mark all read'}
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {!notifications?.length ? (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  {lang === 'fr' ? 'Aucune notification' : 'No notifications'}
                </p>
              ) : (
                notifications.map((n: any) => (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.is_read) markRead.mutate(n.id); }}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors',
                      !n.is_read && 'bg-primary/[0.03]'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn('mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium', typeColors[n.type] || typeColors.info)}>
                        {n.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm text-foreground', !n.is_read && 'font-medium')}>{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {new Date(n.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!n.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
