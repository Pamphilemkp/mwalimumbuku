import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Calculator, SpellCheck, Mic, BookOpen, Volume2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import SpellChecker from '@/components/SpellChecker';
import VocalCalculator from '@/components/VocalCalculator';
import SpeechToText from '@/components/SpeechToText';
import TextToSpeech from '@/components/TextToSpeech';
import AudioRecorder from '@/components/AudioRecorder';

const TOOLS = [
  { id: 'calculator', label: 'Calculatrice vocale', icon: Calculator, desc: 'Calculs avec commandes vocales', gradient: 'from-primary/15 to-primary/5' },
  { id: 'spellcheck', label: 'Correcteur orthographique', icon: SpellCheck, desc: 'Vérifiez vos textes', gradient: 'from-accent/15 to-accent/5' },
  { id: 'dictation', label: 'Dictée vocale', icon: Mic, desc: 'Écrivez avec votre voix', gradient: 'from-secondary/15 to-secondary/5' },
  { id: 'tts', label: 'Lecteur vocal', icon: Volume2, desc: 'Écoutez du texte lu à voix haute', gradient: 'from-primary/15 to-accent/5' },
  { id: 'recorder', label: 'Enregistreur audio', icon: FileText, desc: 'Enregistrez vos réponses orales', gradient: 'from-accent/15 to-primary/5' },
];

export default function ToolboxPage() {
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
          <h1 className="font-display text-3xl font-bold text-foreground">Boîte à outils</h1>
          <p className="text-muted-foreground">Outils pédagogiques pour t'aider dans ton apprentissage</p>
        </div>
      </div>

      {/* Tool cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <motion.button
            key={tool.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
            className={cn(
              'group rounded-2xl border p-5 text-left transition-all',
              activeTool === tool.id
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
            )}
          >
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br mb-3', tool.gradient)}>
              <tool.icon className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="font-display font-semibold text-foreground">{tool.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{tool.desc}</p>
          </motion.button>
        ))}
      </div>

      {/* Active tool content */}
      {activeTool && (
        <motion.div
          key={activeTool}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          {activeTool === 'calculator' && <VocalCalculator />}
          
          {activeTool === 'spellcheck' && <SpellChecker />}
          
          {activeTool === 'dictation' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SpeechToText
                  onResult={(text) => setDictatedText((prev) => prev + ' ' + text)}
                />
                <span className="text-sm text-muted-foreground">
                  Cliquez puis parlez clairement
                </span>
              </div>
              <div className="rounded-xl bg-muted p-4 min-h-[120px]">
                {dictatedText ? (
                  <p className="text-foreground whitespace-pre-wrap">{dictatedText}</p>
                ) : (
                  <p className="text-muted-foreground italic">Le texte dicté apparaîtra ici...</p>
                )}
              </div>
              {dictatedText && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(dictatedText); }}
                    className="text-sm text-primary hover:underline"
                  >
                    Copier le texte
                  </button>
                  <button
                    onClick={() => setDictatedText('')}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    Effacer
                  </button>
                </div>
              )}
            </div>
          )}
          
          {activeTool === 'tts' && (
            <div className="space-y-4">
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="Collez ou tapez un texte ici pour l'écouter..."
                className="w-full rounded-xl border border-border bg-background p-4 text-foreground min-h-[120px] resize-none"
              />
              {ttsText && <TextToSpeech text={ttsText} />}
            </div>
          )}

          {activeTool === 'recorder' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Utilisez l'enregistreur pour capturer vos réponses orales ou pratiquer la prononciation.
              </p>
              <AudioRecorder />
            </div>
          )}
        </motion.div>
      )}

      {/* Key concepts section */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" /> Concepts clés
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: 'Mathématiques', concepts: ['Addition & Soustraction', 'Multiplication & Division', 'Fractions', 'Géométrie de base'] },
            { title: 'Français', concepts: ['Grammaire', 'Conjugaison', 'Orthographe', 'Vocabulaire'] },
            { title: 'Sciences', concepts: ['Le corps humain', 'Les animaux', 'Les plantes', 'L\'environnement'] },
            { title: 'Histoire-Géographie', concepts: ['La RDC', 'L\'Afrique', 'Le monde', 'Les grandes dates'] },
          ].map((subject) => (
            <div key={subject.title} className="rounded-xl bg-muted/50 p-4">
              <h3 className="font-medium text-foreground mb-2">{subject.title}</h3>
              <ul className="space-y-1">
                {subject.concepts.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
