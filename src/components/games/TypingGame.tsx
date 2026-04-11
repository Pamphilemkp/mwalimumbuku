import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { Trophy, Star, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';
import type { GameProps } from './types';

const WORDS_EASY = ['le', 'un', 'et', 'la', 'il', 'de', 'en', 'ce', 'tu', 'je'];
const WORDS_MED = ['maison', 'école', 'livre', 'classe', 'enfant', 'soleil', 'arbre', 'manger'];
const WORDS_HARD = ['apprentissage', 'éducation', 'développement', 'connaissance', 'bibliothèque', 'mathématiques'];

export default function TypingGame({ onScore, difficulty }: GameProps) {
  const { t } = useLanguage();
  const pool = difficulty === 'easy' ? WORDS_EASY : difficulty === 'medium' ? WORDS_MED : WORDS_HARD;
  const totalWords = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 10 : 12;

  const [currentWord, setCurrentWord] = useState('');
  const [input, setInput] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(true);
  const [errors, setErrors] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const nextWord = useCallback(() => {
    setCurrentWord(pool[Math.floor(Math.random() * pool.length)]);
    setInput('');
  }, [pool]);

  useEffect(() => { nextWord(); inputRef.current?.focus(); }, [nextWord]);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  const handleInput = (val: string) => {
    setInput(val);
    if (val === currentWord) {
      const pts = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 15;
      setScore(s => s + pts);
      onScore(pts);
      const next = wordIdx + 1;
      if (next >= totalWords) {
        setRunning(false);
        setWordIdx(next);
        toast.success(`🎉 ${t.games.congratulations}`);
      } else {
        setWordIdx(next);
        nextWord();
      }
    } else if (val.length > 0 && !currentWord.startsWith(val)) {
      setErrors(e => e + 1);
    }
  };

  const restart = () => { setWordIdx(0); setScore(0); setTimer(0); setErrors(0); setRunning(true); nextWord(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t.games.word} {Math.min(wordIdx + 1, totalWords)}/{totalWords}</span>
        <div className="flex gap-3">
          <span className="flex items-center gap-1"><Timer className="h-4 w-4" /> {timer}s</span>
          <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {score}</span>
        </div>
      </div>
      <Progress value={(wordIdx / totalWords) * 100} className="h-2" />
      {wordIdx < totalWords ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-6">
          <p className="text-sm text-muted-foreground">{t.games.typeWord}</p>
          <div className="flex justify-center gap-1">
            {currentWord.split('').map((ch, i) => (
              <span key={i} className={cn(
                'flex h-12 w-10 items-center justify-center rounded-lg text-xl font-bold',
                i < input.length
                  ? (input[i] === ch ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive')
                  : 'bg-muted text-muted-foreground'
              )}>{ch}</span>
            ))}
          </div>
          <input ref={inputRef} value={input} onChange={e => handleInput(e.target.value)}
            className="mx-auto block max-w-xs rounded-lg border border-border bg-background px-4 py-3 text-center text-lg font-medium text-foreground"
            autoFocus />
          <p className="text-xs text-muted-foreground">{t.games.errors}: {errors}</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary mb-2" />
          <h3 className="font-display text-xl font-bold text-foreground">{t.games.gameOver}</h3>
          <p className="text-muted-foreground">{score} {t.points} — {timer}s — {errors} {t.games.errors}</p>
          <Button className="mt-3" onClick={restart}>{t.games.playAgain}</Button>
        </motion.div>
      )}
    </div>
  );
}
