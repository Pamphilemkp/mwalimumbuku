import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { RotateCcw, Trophy, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';
import GameTimer from './GameTimer';
import type { GameProps } from './types';
import { TIME_LIMITS } from './types';

const ALL_EMOJIS = ['🐘', '🦁', '🐍', '🦒', '🐊', '🦓', '🐆', '🦏', '🦩', '🐢', '🦜', '🐠'];

interface MemoryCard { id: number; emoji: string; flipped: boolean; matched: boolean; }

export default function MemoryGame({ onScore, difficulty, onGameEnd }: GameProps) {
  const { t } = useLanguage();
  const pairCount = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
  const cols = difficulty === 'easy' ? 4 : 4;

  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [gameScore, setGameScore] = useState(0);

  const initGame = useCallback(() => {
    const emojis = ALL_EMOJIS.slice(0, pairCount);
    const shuffled = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
    setCards(shuffled);
    setFlippedIds([]);
    setMoves(0);
    setMatches(0);
    setElapsed(0);
    setRunning(true);
    setGameScore(0);
  }, [pairCount]);

  useEffect(() => { initGame(); }, [initGame]);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  const handleTimeUp = useCallback(() => {
    setRunning(false);
    onGameEnd?.(gameScore, elapsed);
  }, [gameScore, elapsed, onGameEnd]);

  useEffect(() => {
    if (matches === pairCount && matches > 0) {
      setRunning(false);
      const pts = Math.max(100 - moves * 2, 20);
      const total = gameScore + pts;
      setGameScore(total);
      onScore(pts);
      toast.success(`🎉 ${t.games.bravo} ${pts} ${t.games.pointsEarned}`);
      setTimeout(() => onGameEnd?.(total, elapsed), 1500);
    }
  }, [matches, pairCount, moves, onScore, t, elapsed, onGameEnd, gameScore]);

  const flipCard = (id: number) => {
    if (!running || flippedIds.length === 2) return;
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" /> {moves} {t.games.moves}</span>
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-secondary" /> {matches}/{pairCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <GameTimer duration={TIME_LIMITS[difficulty]} running={running} onTimeUp={handleTimeUp} />
          <Button variant="ghost" size="sm" onClick={initGame} className="h-8 px-2"><RotateCcw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <Progress value={(matches / pairCount) * 100} className="h-2" />
      <div className={cn('grid gap-2 sm:gap-3', cols === 4 ? 'grid-cols-4' : 'grid-cols-4')}>
        {cards.map(card => (
          <motion.button key={card.id} whileTap={{ scale: 0.95 }} onClick={() => flipCard(card.id)}
            className={cn(
              'aspect-square rounded-xl border-2 text-xl sm:text-3xl font-bold flex items-center justify-center transition-all',
              card.matched ? 'border-primary/40 bg-primary/10' :
              card.flipped ? 'border-primary bg-card' :
              'border-border bg-muted hover:border-primary/30 cursor-pointer'
            )}>
            {card.flipped || card.matched ? card.emoji : '?'}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
