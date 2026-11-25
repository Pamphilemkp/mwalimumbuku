import { useEffect, useState, useCallback } from 'react';
import { createSupportTicketAction, sendSupportMessageAction } from '@/features/portals/actions';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuth } from '@/src/hooks/useAuth';

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
    const timer = window.setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
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
    const timer = window.setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [ticketId, load, user?.id]);

  const sendMessage = async (body: string, attachment?: { url: string; type: 'image'|'voice'|'file'; name: string }) => {
    if (!ticketId || !user) return;
    if (attachment) {
      await (supabase as any).from('support_messages').insert({
        ticket_id: ticketId, sender_id: user.id, body: body || null,
        attachment_url: attachment.url, attachment_type: attachment.type, attachment_name: attachment.name,
      });
      return;
    }
    const result = await sendSupportMessageAction(ticketId, body);
    if (!result.ok) throw new Error(result.message);
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
  const created = await createSupportTicketAction({
    subject: input.subject,
    category: input.category,
    priority: input.priority,
    message: input.firstMessage,
  });
  if (!created.ok || !created.id) throw new Error(created.ok ? 'Demande indisponible' : created.message);
  if (input.attachment) {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await (supabase as any).from('support_messages').insert({
        ticket_id: created.id, sender_id: auth.user.id, body: null,
        attachment_url: input.attachment.url, attachment_type: input.attachment.type, attachment_name: input.attachment.name,
      });
    }
  }
  return { id: created.id, user_id: '', subject: input.subject, category: input.category, priority: input.priority, status: 'open', assigned_to: null, last_message_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as SupportTicket;
}

export async function uploadSupportFile(file: Blob, userId: string, name: string) {
  const path = `${userId}/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error } = await supabase.storage.from('support-files').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('support-files').getPublicUrl(path);
  return data.publicUrl;
}
