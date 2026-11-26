"use client";

import { useEffect, useRef, useState } from 'react';
import { useTicketMessages, uploadSupportFile, supportFileUrl, SupportTicket } from '@/src/hooks/useSupport';
import { SUPPORT_URL_SECONDS } from '@/lib/storage/support-files';
import { useAuth } from '@/src/hooks/useAuth';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Paperclip, Send, Mic, Square, Image as ImageIcon, CheckCheck, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

function SupportFile({ url, name, kind }: { url: string; name: string; kind: 'image' | 'voice' | 'file' }) {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refreshMs = Math.max(15, SUPPORT_URL_SECONDS - 30) * 1000;
    const load = () => {
      supportFileUrl(url).then((signed) => {
        if (!active) return;
        setHref(signed);
        if (!signed) return;
        timer = setTimeout(load, refreshMs);
      });
    };
    setHref(null);
    load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [url]);
  if (!href) return <p className="mt-1 text-xs opacity-70">{name || 'Fichier'}</p>;
  if (kind === 'image') return <img src={href} alt={name} className="mt-1 max-h-60 rounded-lg" />;
  if (kind === 'voice') return <audio src={href} controls className="mt-1 w-full" />;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 underline">
      <Paperclip className="h-3 w-3" />{name}
    </a>
  );
}

export default function SupportChat({ ticket }: { ticket: SupportTicket }) {
  const { user } = useAuth();
  const { messages, typingUsers, sendMessage, setTyping } = useTicketMessages(ticket.id);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => { scrollerRef.current?.scrollTo({ top: 1e9 }); }, [messages.length, typingUsers.length]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try { await sendMessage(text.trim()); setText(''); }
    catch { toast.error('Erreur d\'envoi'); }
    finally { setSending(false); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, kind: 'image'|'file') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const url = await uploadSupportFile(file, user.id, file.name);
      await sendMessage('', { url, type: kind, name: file.name });
    } catch { toast.error('Upload échoué'); }
    e.target.value = '';
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        if (!user) return;
        try {
          const url = await uploadSupportFile(blob, user.id, `voice-${Date.now()}.webm`);
          await sendMessage('', { url, type: 'voice', name: 'Note vocale' });
        } catch { toast.error('Upload échoué'); }
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
    } catch { toast.error('Micro non disponible'); }
  };
  const stopRec = () => { mediaRecRef.current?.stop(); setRecording(false); };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                {m.attachment_url && m.attachment_type === 'image' && (
                  <SupportFile url={m.attachment_url} name={m.attachment_name ?? ''} kind="image" />
                )}
                {m.attachment_url && m.attachment_type === 'voice' && (
                  <SupportFile url={m.attachment_url} name={m.attachment_name ?? ''} kind="voice" />
                )}
                {m.attachment_url && m.attachment_type === 'file' && (
                  <SupportFile url={m.attachment_url} name={m.attachment_name ?? 'Fichier'} kind="file" />
                )}
                <div className={cn('mt-1 flex items-center gap-1 text-[10px] opacity-70')}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {mine && (m.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                </div>
              </div>
            </div>
          );
        })}
        {typingUsers.length > 0 && (
          <div className="text-xs text-muted-foreground italic">En train d'écrire…</div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <label className="cursor-pointer rounded-md p-2 hover:bg-muted">
            <ImageIcon className="h-4 w-4" />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, 'image')} />
          </label>
          <label className="cursor-pointer rounded-md p-2 hover:bg-muted">
            <Paperclip className="h-4 w-4" />
            <input type="file" className="hidden" onChange={(e) => handleFile(e, 'file')} />
          </label>
          {recording ? (
            <Button variant="destructive" size="icon" onClick={stopRec}><Square className="h-4 w-4" /></Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={startRec}><Mic className="h-4 w-4" /></Button>
          )}
          <Input value={text} onChange={(e) => { setText(e.target.value); setTyping(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Tapez votre message…" />
          <Button onClick={handleSend} disabled={!text.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
