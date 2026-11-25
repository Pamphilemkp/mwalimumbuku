"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { cn } from '@/src/lib/utils';
import { Star } from 'lucide-react';
import { Progress } from '@/src/components/ui/progress';
import { toast } from '@/src/components/ui/sonner';
import GameTimer from './GameTimer';
import type { GameProps } from './types';
import { TIME_LIMITS } from './types';

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

export default function ColorMatchGame({ onScore, difficulty, onGameEnd }: GameProps) {
  const { t, lang } = useLanguage();
  const totalRounds = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 8 : 12;
  const optionCount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 6;
  const stroop = difficulty === 'hard';

  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [targetColor, setTargetColor] = useState(COLORS[0]);
  const [textColor, setTextColor] = useState(COLORS[0]);
  const [options, setOptions] = useState<typeof COLORS>([]);
  const [feedback, setFeedback] = useState<number | null>(null);
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed(t => t + 1), 1000);
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

  const handleTimeUp = useCallback(() => {
    setRunning(false);
    onGameEnd?.(score, elapsed);
  }, [score, elapsed, onGameEnd]);

  const pick = (idx: number) => {
    if (feedback !== null || !running) return;
    setFeedback(idx);
    let newScore = score;
    if (options[idx].hex === targetColor.hex) {
      const pts = 15;
      newScore = score + pts;
      setScore(newScore);
      onScore(pts);
      toast.success(`🎉 +${pts}!`);
    } else {
      toast.error(`❌ ${t.games.wrongAnswer}`);
    }
    setTimeout(() => {
      if (round < totalRounds) { setRound(r => r + 1); newRound(); }
      else { setRunning(false); onGameEnd?.(newScore, elapsed); }
    }, 1000);
  };

  const colorName = lang === 'fr' ? textColor.name_fr : textColor.name_en;
  const question = stroop ? t.games.stroopQuestion : t.games.colorQuestion;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground flex-wrap gap-2">
        <span>{t.games.round} {round}/{totalRounds}</span>
        <div className="flex gap-3 items-center">
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-secondary" /> {score}</span>
          <GameTimer duration={TIME_LIMITS[difficulty]} running={running} onTimeUp={handleTimeUp} />
        </div>
      </div>
      <Progress value={(round / totalRounds) * 100} className="h-2" />
      {round <= totalRounds && running ? (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 text-center space-y-4 sm:space-y-6">
          <p className="text-xs sm:text-sm text-muted-foreground">{question}</p>
          <p className="text-3xl sm:text-4xl font-bold" style={{ color: stroop ? textColor.hex : targetColor.hex }}>
            {colorName}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {options.map((c, i) => (
              <button key={c.hex} onClick={() => pick(i)}
                className={cn(
                  'h-12 w-12 sm:h-14 sm:w-14 rounded-xl border-2 transition-all',
                  feedback === null ? 'hover:scale-110 cursor-pointer border-border' :
                  c.hex === targetColor.hex ? 'border-primary ring-2 ring-primary' :
                  feedback === i ? 'border-destructive opacity-50' : 'border-border opacity-30'
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
