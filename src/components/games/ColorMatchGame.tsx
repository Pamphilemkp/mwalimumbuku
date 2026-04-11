import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { Trophy, Star, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';
import type { GameProps } from './types';

const COLORS = [
  { name_fr: 'Rouge', name_en: 'Red', hex: 'hsl(0,80%,50%)' },
  { name_fr: 'Bleu', name_en: 'Blue', hex: 'hsl(220,80%,50%)' },
  { name_fr: 'Vert', name_en: 'Green', hex: 'hsl(120,60%,40%)' },
  { name_fr: 'Jaune', name_en: 'Yellow', hex: 'hsl(50,90%,50%)' },
  { name_fr: 'Orange', name_en: 'Orange', hex: 'hsl(30,90%,50%)' },
  { name_fr: 'Violet', name_en: 'Purple', hex: 'hsl(280,60%,50%)' },
  { name_fr: 'Rose', name_en: 'Pink', hex: 'hsl(330,80%,60%)' },
  { name_fr: 'Marron', name_en: 'Brown', hex: 'hsl(25,60%,35%)' },
];

export default function ColorMatchGame({ onScore, difficulty }: GameProps) {
  const { t, lang } = useLanguage();
  const totalRounds = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 8 : 12;
  const optionCount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 6;
  // In hard mode, the text color is different from the word (Stroop effect)
  const stroop = difficulty === 'hard';

  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [targetColor, setTargetColor] = useState(COLORS[0]);
  const [textColor, setTextColor] = useState(COLORS[0]);
  const [options, setOptions] = useState<typeof COLORS>([]);
  const [feedback, setFeedback] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  const newRound = useCallback(() => {
    const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
    const target = shuffled[0];
    const distractorText = shuffled[1];
    setTargetColor(target);
    setTextColor(stroop ? distractorText : target);
    const pool = shuffled.slice(0, optionCount);
    if (!pool.find(c => c.hex === target.hex)) pool[pool.length - 1] = target;
    setOptions(pool.sort(() => Math.random() - 0.5));
    setFeedback(null);
  }, [optionCount, stroop]);

  useEffect(() => { newRound(); }, [newRound]);

  const pick = (idx: number) => {
    if (feedback !== null) return;
    setFeedback(idx);
    if (options[idx].hex === targetColor.hex) {
      const pts = 15;
      setScore(s => s + pts);
      onScore(pts);
      toast.success(`🎉 +${pts}!`);
    } else {
      toast.error(`❌ ${t.games.wrongAnswer}`);
    }
    setTimeout(() => {
      if (round < totalRounds) { setRound(r => r + 1); newRound(); }
      else setRunning(false);
    }, 1000);
  };

  const colorName = lang === 'fr' ? textColor.name_fr : textColor.name_en;
  const question = stroop ? t.games.stroopQuestion : t.games.colorQuestion;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t.games.round} {round}/{totalRounds}</span>
        <div className="flex gap-3">
          <span className="flex items-center gap-1"><Timer className="h-4 w-4" /> {timer}s</span>
          <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {score}</span>
        </div>
      </div>
      <Progress value={(round / totalRounds) * 100} className="h-2" />
      {round <= totalRounds ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-6">
          <p className="text-sm text-muted-foreground">{question}</p>
          <p className="text-4xl font-bold" style={{ color: stroop ? textColor.hex : targetColor.hex }}>
            {colorName}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {options.map((c, i) => (
              <button key={c.hex} onClick={() => pick(i)}
                className={cn(
                  'h-14 w-14 rounded-xl border-2 transition-all',
                  feedback === null ? 'hover:scale-110 cursor-pointer border-border' :
                  c.hex === targetColor.hex ? 'border-primary ring-2 ring-primary' :
                  feedback === i ? 'border-destructive opacity-50' : 'border-border opacity-30'
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary mb-2" />
          <h3 className="font-display text-xl font-bold text-foreground">{t.games.gameOver}</h3>
          <p className="text-muted-foreground">Score: {score} {t.points}</p>
          <Button className="mt-3" onClick={() => { setRound(1); setScore(0); setTimer(0); setRunning(true); newRound(); }}>{t.games.playAgain}</Button>
        </motion.div>
      )}
    </div>
  );
}
