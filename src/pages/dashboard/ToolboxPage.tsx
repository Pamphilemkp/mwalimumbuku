import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { Wrench, Calculator, SpellCheck, Mic, BookOpen, Volume2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import SpellChecker from '@/components/SpellChecker';
import VocalCalculator from '@/components/VocalCalculator';
import SpeechToText from '@/components/SpeechToText';
import TextToSpeech from '@/components/TextToSpeech';
import AudioRecorder from '@/components/AudioRecorder';

const TOOL_IDS = ['calculator', 'spellcheck', 'dictation', 'tts', 'recorder'] as const;
const TOOL_ICONS: Record<string, React.ElementType> = { calculator: Calculator, spellcheck: SpellCheck, dictation: Mic, tts: Volume2, recorder: FileText };
const TOOL_GRADIENTS: Record<string, string> = {
  calculator: 'from-primary/15 to-primary/5', spellcheck: 'from-accent/15 to-accent/5',
  dictation: 'from-secondary/15 to-secondary/5', tts: 'from-primary/15 to-accent/5', recorder: 'from-accent/15 to-primary/5',
};

export default function ToolboxPage() {
  const { t } = useLanguage();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [dictatedText, setDictatedText] = useState('');
  const [ttsText, setTtsText] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Wrench className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{t.toolbox.title}</h1>
          <p className="text-muted-foreground">{t.toolbox.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOL_IDS.map((id) => {
          const Icon = TOOL_ICONS[id];
          const toolT = t.toolbox.tools[id];
          return (
            <motion.button key={id} whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTool(activeTool === id ? null : id)}
              className={cn('group rounded-2xl border p-5 text-left transition-all',
                activeTool === id ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card hover:border-primary/30 hover:shadow-sm')}>
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br mb-3', TOOL_GRADIENTS[id])}>
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="font-display font-semibold text-foreground">{toolT.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{toolT.desc}</p>
            </motion.button>
          );
        })}
      </div>

      {activeTool && (
        <motion.div key={activeTool} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6">
          {activeTool === 'calculator' && <VocalCalculator />}
          {activeTool === 'spellcheck' && <SpellChecker />}
          {activeTool === 'dictation' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SpeechToText onResult={(text) => setDictatedText((prev) => prev + ' ' + text)} />
                <span className="text-sm text-muted-foreground">{t.toolbox.clickAndSpeak}</span>
              </div>
              <div className="rounded-xl bg-muted p-4 min-h-[120px]">
                {dictatedText ? <p className="text-foreground whitespace-pre-wrap">{dictatedText}</p> : <p className="text-muted-foreground italic">{t.toolbox.dictatedPlaceholder}</p>}
              </div>
              {dictatedText && (
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(dictatedText)} className="text-sm text-primary hover:underline">{t.toolbox.copyText}</button>
                  <button onClick={() => setDictatedText('')} className="text-sm text-muted-foreground hover:underline">{t.toolbox.clear}</button>
                </div>
              )}
            </div>
          )}
          {activeTool === 'tts' && (
            <div className="space-y-4">
              <textarea value={ttsText} onChange={(e) => setTtsText(e.target.value)} placeholder={t.toolbox.ttsPlaceholder}
                className="w-full rounded-xl border border-border bg-background p-4 text-foreground min-h-[120px] resize-none" />
              {ttsText && <TextToSpeech text={ttsText} />}
            </div>
          )}
          {activeTool === 'recorder' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.toolbox.recorderDesc}</p>
              <AudioRecorder />
            </div>
          )}
        </motion.div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" /> {t.toolbox.keyConcepts}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['math', 'french', 'science', 'history'] as const).map((key) => {
            const subj = t.toolbox.subjects[key];
            return (
              <div key={key} className="rounded-xl bg-muted/50 p-4">
                <h3 className="font-medium text-foreground mb-2">{subj.title}</h3>
                <ul className="space-y-1">
                  {subj.concepts.map((c: string) => (
                    <li key={c} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />{c}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
