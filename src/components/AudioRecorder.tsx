"use client";

import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { Button } from '@/src/components/ui/button';
import { Mic, Square, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from '@/src/components/ui/sonner';

interface AudioRecorderProps { onRecordingComplete?: (blob: Blob) => void; className?: string; }

export default function AudioRecorder({ onRecordingComplete, className }: AudioRecorderProps) {
  const { t } = useLanguage();
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setDuration(0);
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        onRecordingComplete?.(blob);
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };
      mediaRecorder.start();
      setRecording(true);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch { toast.error(t.recorder.micDenied); }
  }, [onRecordingComplete, t]);

  const stopRecording = useCallback(() => { mediaRecorderRef.current?.stop(); setRecording(false); }, []);
  const deleteRecording = () => { if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null); setDuration(0); };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 space-y-3', className)}>
      <div className="flex items-center gap-3">
        {!recording && !audioUrl && <Button onClick={startRecording} className="gap-2"><Mic className="h-4 w-4" /> {t.recorder.record}</Button>}
        {recording && (
          <>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium text-destructive">{t.recorder.recording} {formatTime(duration)}</span>
            </div>
            <Button variant="destructive" size="sm" onClick={stopRecording}><Square className="mr-1 h-3.5 w-3.5" /> {t.recorder.stopRec}</Button>
          </>
        )}
        {audioUrl && (
          <div className="flex items-center gap-2 flex-1">
            <audio controls src={audioUrl} className="flex-1 h-8" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={deleteRecording}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}
