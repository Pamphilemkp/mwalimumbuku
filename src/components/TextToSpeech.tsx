"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { Button } from '@/src/components/ui/button';
import { Slider } from '@/src/components/ui/slider';
import { Volume2, Pause, Square } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface TextToSpeechProps { text: string; className?: string; compact?: boolean; }

export default function TextToSpeech({ text, className, compact = false }: TextToSpeechProps) {
  const { t, lang } = useLanguage();
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => { window.speechSynthesis.cancel(); setSpeaking(false); setPaused(false); }, []);
  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  const speak = useCallback(() => {
    if (!text) return;
    if (paused) { window.speechSynthesis.resume(); setPaused(false); return; }
    stop();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = rate;
    utt.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(lang));
    if (voice) utt.voice = voice;
    utt.onend = () => { setSpeaking(false); setPaused(false); };
    utt.onerror = () => { setSpeaking(false); setPaused(false); };
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
    setSpeaking(true);
  }, [text, rate, paused, stop, lang]);

  const pause = useCallback(() => { window.speechSynthesis.pause(); setPaused(true); }, []);

  if (!('speechSynthesis' in window)) return null;

  if (compact) {
    return (
      <Button variant="ghost" size="sm" onClick={speaking && !paused ? pause : speak}
        className={cn('gap-1.5 text-muted-foreground hover:text-primary', className)} title={speaking ? t.tts.pause : t.tts.listen}>
        {speaking && !paused ? <Pause className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        {speaking && !paused ? t.tts.pause : t.tts.listen}
      </Button>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2', className)}>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={speaking && !paused ? pause : speak}>
        {speaking && !paused ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>
      {speaking && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={stop}><Square className="h-3.5 w-3.5" /></Button>}
      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
        <span className="shrink-0">{t.tts.speed}</span>
        <Slider value={[rate]} onValueChange={v => setRate(v[0])} min={0.5} max={2} step={0.25} className="w-20" />
        <span className="shrink-0">{rate}x</span>
      </div>
    </div>
  );
}
