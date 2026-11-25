"use client";

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { cn } from '@/src/lib/utils';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { toast } from '@/src/components/ui/sonner';
import GameTimer from './GameTimer';
import type { GameProps } from './types';
import { TIME_LIMITS } from './types';

export default function AlphabetGame({ onScore, difficulty, onGameEnd }: GameProps) {
  const { t } = useLanguage();
  const count = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 8 : 12;

  const [letters, setLetters] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [correct, setCorrect] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  const newGame = useCallback(() => {
    const all = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const start = Math.floor(Math.random() * (26 - count));
    const slice = all.slice(start, start + count);
    setCorrect([...slice]);
    setLetters([...slice].sort(() => Math.random() - 0.5));
    setSelected([]);
    setDone(false);
    setRunning(true);
    setElapsed(0);
    setScore(0);
  }, [count]);

  useEffect(() => { newGame(); }, [newGame]);

  const handleTimeUp = useCallback(() => {
    setRunning(false);
    setDone(true);
    onGameEnd?.(score, elapsed);
  }, [score, elapsed, onGameEnd]);

  const selectLetter = (l: string) => {
    if (!running || selected.includes(l)) return;
    const newSel = [...selected, l];
    setSelected(newSel);
    if (newSel.length === correct.length) {
      const isCorrect = newSel.every((s, i) => s === correct[i]);
      setDone(true);
      setRunning(false);
      if (isCorrect) {
        const pts = 30;
        setScore(pts);
        onScore(pts);
        toast.success(`🎉 ${t.games.perfectOrder}`);
        setTimeout(() => onGameEnd?.(pts, elapsed), 1500);
      } else {
        toast.error(`❌ ${t.games.wrongOrder}`);
        setTimeout(() => onGameEnd?.(0, elapsed), 1500);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs sm:text-sm text-muted-foreground">{t.games.alphabetInstruction}</p>
        <GameTimer duration={TIME_LIMITS[difficulty]} running={running} onTimeUp={handleTimeUp} />
      </div>
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {correct.map((_, i) => (
          <div key={i} className={cn(
            'flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg border-2 text-sm sm:text-lg font-bold',
            selected[i]
              ? (done ? (selected[i] === correct[i] ? 'border-primary bg-primary/10 text-primary' : 'border-destructive bg-destructive/10 text-destructive')
                : 'border-primary/50 bg-card text-foreground')
              : 'border-dashed border-border'
          )}>{selected[i] || ''}</div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {letters.map(l => (
          <button key={l} disabled={selected.includes(l) || done} onClick={() => selectLetter(l)}
            className={cn(
              'flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg border text-sm sm:text-lg font-bold transition-all',
              selected.includes(l) ? 'opacity-30 border-border' : 'border-border bg-card hover:border-primary hover:bg-primary/5 cursor-pointer'
            )}>{l}</button>
        ))}
      </div>
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => { setSelected([]); setDone(false); }}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> {t.games.undo}
        </Button>
        <Button variant="outline" size="sm" onClick={newGame}>{t.games.newLetters}</Button>
      </div>
    </div>
  );
}
