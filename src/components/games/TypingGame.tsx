"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { cn } from '@/src/lib/utils';
import { Star } from 'lucide-react';
import { Progress } from '@/src/components/ui/progress';
import { toast } from '@/src/components/ui/sonner';
import GameTimer from './GameTimer';
import type { GameProps } from './types';
import { TIME_LIMITS } from './types';

const WORDS_EASY = ['le', 'un', 'et', 'la', 'il', 'de', 'en', 'ce', 'tu', 'je'];
const WORDS_MED = ['maison', 'école', 'livre', 'classe', 'enfant', 'soleil', 'arbre', 'manger'];
const WORDS_HARD = ['apprentissage', 'éducation', 'développement', 'connaissance', 'bibliothèque', 'mathématiques'];

export default function TypingGame({ onScore, difficulty, onGameEnd }: GameProps) {
  const { t } = useLanguage();
  const pool = difficulty === 'easy' ? WORDS_EASY : difficulty === 'medium' ? WORDS_MED : WORDS_HARD;
  const totalWords = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 10 : 12;

  const [currentWord, setCurrentWord] = useState('');
  const [input, setInput] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [errors, setErrors] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  const nextWord = useCallback(() => {
    setCurrentWord(pool[Math.floor(Math.random() * pool.length)]);
    setInput('');
  }, [pool]);

  useEffect(() => { nextWord(); inputRef.current?.focus(); }, [nextWord]);

  const handleTimeUp = useCallback(() => {
    setRunning(false);
    onGameEnd?.(score, elapsed);
  }, [score, elapsed, onGameEnd]);

  const handleInput = (val: string) => {
    if (!running) return;
    setInput(val);
    if (val === currentWord) {
      const pts = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 15;
      const newScore = score + pts;
      setScore(newScore);
      onScore(pts);
      const next = wordIdx + 1;
      if (next >= totalWords) {
        setRunning(false);
        setWordIdx(next);
        toast.success(`🎉 ${t.games.congratulations}`);
        onGameEnd?.(newScore, elapsed);
      } else {
        setWordIdx(next);
        nextWord();
      }
    } else if (val.length > 0 && !currentWord.startsWith(val)) {
      setErrors(e => e + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground flex-wrap gap-2">
        <span>{t.games.word} {Math.min(wordIdx + 1, totalWords)}/{totalWords}</span>
        <div className="flex gap-3 items-center">
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-secondary" /> {score}</span>
          <GameTimer duration={TIME_LIMITS[difficulty]} running={running} onTimeUp={handleTimeUp} />
        </div>
      </div>
      <Progress value={(wordIdx / totalWords) * 100} className="h-2" />
      {wordIdx < totalWords && running ? (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-8 text-center space-y-4 sm:space-y-6">
          <p className="text-xs sm:text-sm text-muted-foreground">{t.games.typeWord}</p>
          <div className="flex justify-center gap-0.5 sm:gap-1 flex-wrap">
            {currentWord.split('').map((ch, i) => (
              <span key={i} className={cn(
                'flex h-10 w-7 sm:h-12 sm:w-10 items-center justify-center rounded-lg text-base sm:text-xl font-bold',
                i < input.length
                  ? (input[i] === ch ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive')
                  : 'bg-muted text-muted-foreground'
              )}>{ch}</span>
            ))}
          </div>
          <input ref={inputRef} value={input} onChange={e => handleInput(e.target.value)}
            className="mx-auto block w-full max-w-xs rounded-lg border border-border bg-background px-4 py-3 text-center text-lg font-medium text-foreground"
            autoFocus />
          <p className="text-xs text-muted-foreground">{t.games.errors}: {errors}</p>
        </div>
      ) : null}
    </div>
  );
}
