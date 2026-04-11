import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { Trophy, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';
import type { GameProps } from './types';

const WORDS: Record<string, { word: string; hint_fr: string; hint_en: string; diff: number }[]> = {
  all: [
    { word: 'CHAT', hint_fr: 'Animal domestique', hint_en: 'Pet animal', diff: 1 },
    { word: 'LIRE', hint_fr: 'Avec les yeux', hint_en: 'With eyes', diff: 1 },
    { word: 'MATH', hint_fr: 'Nombres et calculs', hint_en: 'Numbers', diff: 1 },
    { word: 'ÉCOLE', hint_fr: "Lieu d'apprentissage", hint_en: 'Learning place', diff: 2 },
    { word: 'LIVRE', hint_fr: 'On le lit', hint_en: 'You read it', diff: 2 },
    { word: 'CLASSE', hint_fr: 'Salle de cours', hint_en: 'Classroom', diff: 2 },
    { word: 'CAHIER', hint_fr: 'On y écrit', hint_en: 'Notebook', diff: 2 },
    { word: 'ÉCRIRE', hint_fr: 'Avec un stylo', hint_en: 'With a pen', diff: 3 },
    { word: 'TABLEAU', hint_fr: 'Devant la classe', hint_en: 'Blackboard', diff: 3 },
    { word: 'HISTOIRE', hint_fr: 'Le passé', hint_en: 'The past', diff: 3 },
    { word: 'SCIENCES', hint_fr: 'Expériences', hint_en: 'Experiments', diff: 3 },
  ],
};

export default function WordScrambleGame({ onScore, difficulty }: GameProps) {
  const { t, lang } = useLanguage();
  const maxDiff = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  const pool = WORDS.all.filter(w => w.diff <= maxDiff);
  const totalRounds = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 7;

  const [wordIdx, setWordIdx] = useState(0);
  const [scrambled, setScrambled] = useState('');
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [round, setRound] = useState(1);

  const scrambleWord = (w: string): string => {
    const arr = w.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('') === w ? scrambleWord(w) : arr.join('');
  };

  const nextWord = useCallback(() => {
    const idx = Math.floor(Math.random() * pool.length);
    setWordIdx(idx);
    setScrambled(scrambleWord(pool[idx].word));
    setGuess('');
    setFeedback(null);
  }, [pool.length]);

  useEffect(() => { nextWord(); }, [nextWord]);

  const checkAnswer = () => {
    if (guess.toUpperCase().trim() === pool[wordIdx].word) {
      setFeedback('correct');
      setScore(s => s + 20);
      onScore(20);
      toast.success(`🎉 ${t.games.correctAnswer}`);
    } else {
      setFeedback('wrong');
      toast.error(`❌ ${t.games.theWordWas}: ${pool[wordIdx].word}`);
    }
    setTimeout(() => {
      if (round < totalRounds) { setRound(r => r + 1); nextWord(); }
    }, 1500);
  };

  const hint = lang === 'fr' ? pool[wordIdx]?.hint_fr : pool[wordIdx]?.hint_en;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t.games.round} {round}/{totalRounds}</span>
        <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {score} pts</span>
      </div>
      <Progress value={(round / totalRounds) * 100} className="h-2" />
      {round <= totalRounds ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-4">
          <p className="text-xs text-muted-foreground">{hint}</p>
          <div className="flex justify-center gap-2">
            {scrambled.split('').map((l, i) => (
              <span key={i} className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">{l}</span>
            ))}
          </div>
          <div className="flex gap-2 max-w-xs mx-auto">
            <input value={guess} onChange={e => setGuess(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkAnswer()}
              placeholder={t.games.yourAnswer}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
            <Button onClick={checkAnswer} disabled={!guess.trim()}><Check className="h-4 w-4" /></Button>
          </div>
          {feedback && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={cn('font-medium', feedback === 'correct' ? 'text-primary' : 'text-destructive')}>
              {feedback === 'correct' ? `✓ ${t.games.bravo}` : `✗ ${t.games.answer}: ${pool[wordIdx].word}`}
            </motion.p>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary mb-2" />
          <h3 className="font-display text-xl font-bold text-foreground">{t.games.gameOver}</h3>
          <p className="text-muted-foreground">Score: {score} {t.points}</p>
          <Button className="mt-3" onClick={() => { setRound(1); setScore(0); nextWord(); }}>{t.games.playAgain}</Button>
        </motion.div>
      )}
    </div>
  );
}
