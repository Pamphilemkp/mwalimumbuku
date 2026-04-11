import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { RotateCcw, Trophy, Star, Timer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';
import type { GameProps } from './types';

const ALL_EMOJIS = ['🐘', '🦁', '🐍', '🦒', '🐊', '🦓', '🐆', '🦏', '🦩', '🐢', '🦜', '🐠'];

interface MemoryCard {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

export default function MemoryGame({ onScore, difficulty }: GameProps) {
  const { t } = useLanguage();
  const pairCount = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
  const cols = difficulty === 'easy' ? 4 : 4;

  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);

  const initGame = useCallback(() => {
    const emojis = ALL_EMOJIS.slice(0, pairCount);
    const shuffled = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
    setCards(shuffled);
    setFlippedIds([]);
    setMoves(0);
    setMatches(0);
    setTimer(0);
    setRunning(true);
  }, [pairCount]);

  useEffect(() => { initGame(); }, [initGame]);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  useEffect(() => {
    if (matches === pairCount && matches > 0) {
      setRunning(false);
      const pts = Math.max(100 - moves * 2, 20);
      onScore(pts);
      toast.success(`🎉 ${t.games.bravo} ${pts} ${t.games.pointsEarned}`);
    }
  }, [matches, pairCount, moves, onScore, t]);

  const flipCard = (id: number) => {
    if (flippedIds.length === 2) return;
    const card = cards[id];
    if (card.flipped || card.matched) return;
    const updated = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    setCards(updated);
    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);
    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (updated[a].emoji === updated[b].emoji) {
        setTimeout(() => {
          setCards(prev => prev.map(c => c.id === a || c.id === b ? { ...c, matched: true } : c));
          setMatches(m => m + 1);
          setFlippedIds([]);
        }, 400);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c => c.id === a || c.id === b ? { ...c, flipped: false } : c));
          setFlippedIds([]);
        }, 800);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Zap className="h-4 w-4 text-primary" /> {moves} {t.games.moves}</span>
          <span className="flex items-center gap-1"><Timer className="h-4 w-4" /> {timer}s</span>
          <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {matches}/{pairCount}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={initGame}><RotateCcw className="mr-1 h-3.5 w-3.5" /> {t.games.reset}</Button>
      </div>
      <Progress value={(matches / pairCount) * 100} className="h-2" />
      <div className={cn('grid gap-2 sm:gap-3', `grid-cols-${cols}`)}>
        {cards.map(card => (
          <motion.button key={card.id} whileTap={{ scale: 0.95 }} onClick={() => flipCard(card.id)}
            className={cn(
              'aspect-square rounded-xl border-2 text-2xl sm:text-3xl font-bold flex items-center justify-center transition-all',
              card.matched ? 'border-primary/40 bg-primary/10' :
              card.flipped ? 'border-primary bg-card' :
              'border-border bg-muted hover:border-primary/30 cursor-pointer'
            )}>
            {card.flipped || card.matched ? card.emoji : '?'}
          </motion.button>
        ))}
      </div>
      {matches === pairCount && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary mb-2" />
          <h3 className="font-display text-xl font-bold text-foreground">{t.games.congratulations}</h3>
          <p className="text-muted-foreground">{moves} {t.games.moves} — {timer}s</p>
          <Button className="mt-3" onClick={initGame}>{t.games.playAgain}</Button>
        </motion.div>
      )}
    </div>
  );
}
