import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SupportCategory =
  | 'technical_issue' | 'learning_difficulty' | 'homework_help'
  | 'subscription_issue' | 'teacher_assistance' | 'parent_guidance'
  | 'general_inquiry' | 'academic_question' | 'report_issue';

export type SupportPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportStatus = 'open' | 'pending' | 'replied' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  assigned_to: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  attachment_type: 'image' | 'voice' | 'file' | null;
  attachment_name: string | null;
  is_read: boolean;
  created_at: string;
}

export function useTickets(staffMode = false) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = (supabase as any).from('support_tickets').select('*').order('last_message_at', { ascending: false });
    if (!staffMode) q = q.eq('user_id', user.id);
    const { data } = await q;
    setTickets((data ?? []) as SupportTicket[]);
    setLoading(false);
  }, [user, staffMode]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('support_tickets_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { tickets, loading, reload: load };
}

export function useTicketMessages(ticketId: string | null) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const { user } = useAuth();

  const load = useCallback(async () => {
    if (!ticketId) return;
    const { data } = await (supabase as any)
      .from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at');
    setMessages((data ?? []) as SupportMessage[]);

    // mark unread (not mine) as read
    if (user) {
      await (supabase as any).from('support_messages')
        .update({ is_read: true })
        .eq('ticket_id', ticketId).eq('is_read', false).neq('sender_id', user.id);
    }
  }, [ticketId, user]);

  useEffect(() => {
    setMessages([]);
    setTypingUsers([]);
    if (!ticketId) return;
    load();
    const ch = supabase
      .channel(`support_msgs_${ticketId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_typing', filter: `ticket_id=eq.${ticketId}` }, async () => {
        const { data } = await (supabase as any).from('support_typing')
          .select('user_id, updated_at').eq('ticket_id', ticketId)
          .gte('updated_at', new Date(Date.now() - 5000).toISOString());
        setTypingUsers(((data ?? []) as any[]).map((r) => r.user_id).filter((id) => id !== user?.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticketId, load, user?.id]);

  const sendMessage = async (body: string, attachment?: { url: string; type: 'image'|'voice'|'file'; name: string }) => {
    if (!ticketId || !user) return;
    await (supabase as any).from('support_messages').insert({
      ticket_id: ticketId, sender_id: user.id, body: body || null,
      attachment_url: attachment?.url ?? null,
      attachment_type: attachment?.type ?? null,
      attachment_name: attachment?.name ?? null,
    });
  };

  const setTyping = async () => {
    if (!ticketId || !user) return;
    await (supabase as any).from('support_typing')
      .upsert({ ticket_id: ticketId, user_id: user.id, updated_at: new Date().toISOString() });
  };

  return { messages, typingUsers, sendMessage, setTyping, reload: load };
}

export async function createTicket(input: {
  subject: string; category: SupportCategory; priority: SupportPriority; firstMessage: string;
  attachment?: { url: string; type: 'image'|'voice'|'file'; name: string };
}) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error('Not authenticated');
  const { data: ticket, error } = await (supabase as any).from('support_tickets')
    .insert({ user_id: uid, subject: input.subject, category: input.category, priority: input.priority })
    .select().single();
  if (error) throw error;
  await (supabase as any).from('support_messages').insert({
    ticket_id: ticket.id, sender_id: uid, body: input.firstMessage,
    attachment_url: input.attachment?.url ?? null,
    attachment_type: input.attachment?.type ?? null,
    attachment_name: input.attachment?.name ?? null,
  });
  return ticket as SupportTicket;
}

export async function uploadSupportFile(file: Blob, userId: string, name: string) {
  const path = `${userId}/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error } = await supabase.storage.from('support-files').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('support-files').getPublicUrl(path);
  return data.publicUrl;
}
