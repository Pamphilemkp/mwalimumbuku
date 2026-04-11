import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

interface SpeechToTextProps {
  onResult: (text: string) => void;
  language?: string;
  className?: string;
  compact?: boolean;
}

export default function SpeechToText({ onResult, language, className, compact }: SpeechToTextProps) {
  const { t, lang } = useLanguage();
  const effectiveLang = language || (lang === 'fr' ? 'fr-FR' : 'en-US');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggle = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error(t.speech.notSupported); return; }
    if (listening && recognitionRef.current) { recognitionRef.current.stop(); setListening(false); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = effectiveLang;
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((result: any) => result[0].transcript).join(' ');
      onResult(transcript);
    };
    recognition.onerror = (event: any) => { console.error('Speech recognition error:', event.error); setListening(false); if (event.error !== 'aborted') toast.error(t.speech.error); };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, effectiveLang, onResult, t]);

  if (compact) {
    return (
      <Button type="button" variant={listening ? 'default' : 'outline'} size="icon" onClick={toggle}
        className={cn('shrink-0 transition-all', listening && 'animate-pulse bg-destructive hover:bg-destructive/90', className)}
        title={listening ? t.speech.stopDictation : t.speech.startDictation}>
        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Button type="button" variant={listening ? 'destructive' : 'outline'} onClick={toggle} className={cn('gap-2', className)}>
      {listening ? <><MicOff className="h-4 w-4" /> {t.speech.stop}</> : <><Mic className="h-4 w-4" /> {t.speech.startDictation}</>}
    </Button>
  );
}
