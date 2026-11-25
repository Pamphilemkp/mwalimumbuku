"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { cn } from '@/src/lib/utils';
import { Star, Zap, Check } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Progress } from '@/src/components/ui/progress';
import { toast } from '@/src/components/ui/sonner';
import GameTimer from './GameTimer';
import type { GameProps } from './types';
import { TIME_LIMITS } from './types';

export default function MathGame({ onScore, difficulty, onGameEnd }: GameProps) {
  const { t } = useLanguage();
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [op, setOp] = useState<'+' | '-' | '×' | '÷'>('+');
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [round, setRound] = useState(1);
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const totalRounds = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 15;

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  const newProblem = useCallback(() => {
    const easyOps: ('+' | '-')[] = ['+', '-'];
    const medOps: ('+' | '-' | '×')[] = ['+', '-', '×'];
    const hardOps: ('+' | '-' | '×' | '÷')[] = ['+', '-', '×', '÷'];
    const ops = difficulty === 'easy' ? easyOps : difficulty === 'medium' ? medOps : hardOps;
    const o = ops[Math.floor(Math.random() * ops.length)];
    const maxN = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 50;
    let a = Math.floor(Math.random() * maxN) + 1;
    let b = Math.floor(Math.random() * (maxN / 2)) + 1;
    if (o === '-' && b > a) [a, b] = [b, a];
    if (o === '×') { a = Math.floor(Math.random() * 12) + 1; b = Math.floor(Math.random() * 10) + 1; }
    if (o === '÷') { b = Math.floor(Math.random() * 10) + 1; a = b * (Math.floor(Math.random() * 10) + 1); }
    setNum1(a); setNum2(b); setOp(o);
    setAnswer(''); setFeedback(null);
  }, [difficulty]);

  useEffect(() => { newProblem(); }, [newProblem]);

  const correctAnswer = useMemo(() => {
    switch (op) {
      case '+': return num1 + num2;
      case '-': return num1 - num2;
      case '×': return num1 * num2;
      case '÷': return Math.floor(num1 / num2);
    }
  }, [num1, num2, op]);

  const handleTimeUp = useCallback(() => {
    setRunning(false);
    onGameEnd?.(score, elapsed);
  }, [score, elapsed, onGameEnd]);

  const checkAnswer = () => {
    if (!running) return;
    let newScore = score;
    if (parseInt(answer) === correctAnswer) {
      const pts = 10 + streak * 2;
      newScore = score + pts;
      setScore(newScore); setStreak(s => s + 1); setFeedback('correct');
      onScore(pts);
      toast.success(`🎉 +${pts} ${t.points}!`);
    } else {
      setFeedback('wrong'); setStreak(0);
      toast.error(`❌ ${t.games.answer}: ${correctAnswer}`);
    }
    setTimeout(() => {
      if (round < totalRounds) { setRound(r => r + 1); newProblem(); }
      else { setRunning(false); onGameEnd?.(newScore, elapsed); }
    }, 1200);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground flex-wrap gap-2">
        <span>{t.games.round} {round}/{totalRounds}</span>
        <div className="flex gap-3 items-center">
          {streak > 0 && <span className="flex items-center gap-1 text-secondary"><Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {streak}x</span>}
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-secondary" /> {score}</span>
          <GameTimer duration={TIME_LIMITS[difficulty]} running={running} onTimeUp={handleTimeUp} />
        </div>
      </div>
      <Progress value={(round / totalRounds) * 100} className="h-2" />
      {round <= totalRounds && running ? (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-8 text-center space-y-4 sm:space-y-6">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <span className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-primary/10 text-lg sm:text-2xl font-bold text-primary">{num1}</span>
            <span className="text-lg sm:text-2xl font-bold text-foreground">{op}</span>
            <span className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-accent/10 text-lg sm:text-2xl font-bold text-accent">{num2}</span>
            <span className="text-lg sm:text-2xl font-bold text-foreground">=</span>
            <span className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-muted text-lg sm:text-2xl font-bold text-foreground">?</span>
          </div>
          <div className="flex gap-2 max-w-xs mx-auto">
            <input type="number" value={answer} onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkAnswer()} placeholder="="
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-center text-lg font-bold text-foreground" />
            <Button onClick={checkAnswer} disabled={!answer.trim()}><Check className="h-4 w-4" /></Button>
          </div>
          {feedback && (
            <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className={cn('text-base sm:text-lg font-bold', feedback === 'correct' ? 'text-primary' : 'text-destructive')}>
              {feedback === 'correct' ? `✓ ${t.games.correctAnswer}` : `✗ ${correctAnswer}`}
            </motion.p>
          )}
        </div>
      ) : null}
    </div>
  );
}
