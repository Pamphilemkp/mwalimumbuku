"use client";

import { useState, useEffect, useRef } from 'react';
import { sendMessageAction } from '@/features/portals/actions';
import { missingSchema } from '@/lib/portals/schema';
import { useAuth } from '@/src/hooks/useAuth';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { supabase } from '@/src/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/ui/button';
import { Textarea } from '@/src/components/ui/textarea';
import { Input } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';
import { toast } from '@/src/components/ui/sonner';
import { Send, MessageCircle, User, Search } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

export default function MessagesPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const dateLocale = lang === 'fr' ? fr : enUS;
  const qc = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('messages').select('*').or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`).order('created_at', { ascending: false });
      if (error) throw error;
      const contactIds = new Set<string>();
      data.forEach((m: any) => { if (m.sender_id !== user!.id) contactIds.add(m.sender_id); if (m.receiver_id !== user!.id) contactIds.add(m.receiver_id); });
      if (contactIds.size === 0) return [];
      const ids = Array.from(contactIds);
      const labels = await supabase.from('profile_labels').select('user_id, full_name').in('user_id', ids);
      const profiles = labels.error && missingSchema(labels.error)
        ? (await supabase.from('profiles').select('user_id, full_name').in('user_id', ids)).data
        : labels.data;
      if (labels.error && !missingSchema(labels.error)) throw labels.error;
      return Array.from(contactIds).map((cid) => {
        const msgs = data.filter((m: any) => m.sender_id === cid || m.receiver_id === cid);
        const lastMsg = msgs[0];
        const unread = msgs.filter((m: any) => m.sender_id === cid && !m.is_read).length;
        const profile = profiles?.find((p: any) => p.user_id === cid);
        return { contactId: cid, name: profile?.full_name || 'User', lastMessage: lastMsg?.content || '', lastAt: lastMsg?.created_at, unread };
      }).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    },
    enabled: !!user,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const { data: chatMessages } = useQuery({
    queryKey: ['messages', user?.id, selectedContact],
    queryFn: async () => {
      const { data, error } = await supabase.from('messages').select('*').or(`and(sender_id.eq.${user!.id},receiver_id.eq.${selectedContact}),and(sender_id.eq.${selectedContact},receiver_id.eq.${user!.id})`).order('created_at');
      if (error) throw error;
      const unreadIds = data.filter((m: any) => m.receiver_id === user!.id && !m.is_read).map((m: any) => m.id);
      if (unreadIds.length > 0) { await supabase.from('messages').update({ is_read: true }).in('id', unreadIds); qc.invalidateQueries({ queryKey: ['conversations'] }); }
      return data;
    },
    enabled: !!selectedContact,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [chatMessages]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      const result = await sendMessageAction(selectedContact!, message);
      if (!result.ok) throw new Error(result.message);
    },
    onSuccess: () => { setMessage(''); qc.invalidateQueries({ queryKey: ['messages'] }); qc.invalidateQueries({ queryKey: ['conversations'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: searchResults } = useQuery({
    queryKey: ['search-users', search],
    queryFn: async () => {
      const labels = await supabase.from('profile_labels').select('user_id, full_name').ilike('full_name', `%${search}%`).neq('user_id', user!.id).limit(5);
      if (!labels.error) return (labels.data ?? []).filter((row) => row.user_id && row.full_name);
      if (!missingSchema(labels.error)) return [];
      const { data, error } = await supabase.from('profiles').select('user_id, full_name').ilike('full_name', `%${search}%`).neq('user_id', user!.id).limit(5);
      if (error) return [];
      return data ?? [];
    },
    enabled: search.length >= 2,
  });

  const filteredConversations = conversations?.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const contactName = conversations?.find((c) => c.contactId === selectedContact)?.name || searchResults?.find((s: any) => s.user_id === selectedContact)?.full_name || 'User';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{t.messages.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.messages.subtitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">{lang === 'fr' ? 'La conversation se met à jour quand vous revenez sur cette page.' : 'The conversation refreshes when you return to this page.'}</p>
      </div>
      <div className="grid h-[calc(100vh-250px)] gap-4 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col rounded-xl border border-border bg-card">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.messages.searchOrStart} className="pl-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {search.length >= 2 && searchResults?.map((s: any) => (
              <button key={s.user_id} onClick={() => { setSelectedContact(s.user_id); setSearch(''); }}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left hover:bg-muted">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10"><User className="h-4 w-4 text-accent" /></div>
                <div><p className="text-sm font-medium text-foreground">{s.full_name}</p><p className="text-xs text-muted-foreground">{t.messages.startConversation}</p></div>
              </button>
            ))}
            {isLoading ? <Skeleton className="m-3 h-20" /> : (search.length < 2 && filteredConversations?.map((c) => (
              <button key={c.contactId} onClick={() => setSelectedContact(c.contactId)}
                className={cn('flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors', selectedContact === c.contactId ? 'bg-primary/5' : 'hover:bg-muted')}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10"><User className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    {c.unread > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{c.unread}</span>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.lastMessage}</p>
                </div>
              </button>
            )))}
          </div>
        </div>
        <div className="flex flex-col rounded-xl border border-border bg-card">
          {selectedContact ? (
            <>
              <div className="border-b border-border px-5 py-3"><p className="font-medium text-foreground">{contactName}</p></div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages?.map((m: any) => (
                  <div key={m.id} className={cn('max-w-[75%] rounded-2xl px-4 py-2.5 text-sm', m.sender_id === user!.id ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
                    <p>{m.content}</p>
                    <p className={cn('mt-1 text-[10px]', m.sender_id === user!.id ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t.messages.typeMessage} rows={1} className="flex-1 resize-none"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (message.trim()) sendMessage.mutate(); } }} />
                <Button size="icon" onClick={() => sendMessage.mutate()} disabled={!message.trim() || sendMessage.isPending}><Send className="h-4 w-4" /></Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center">
              <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t.messages.selectConversation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
