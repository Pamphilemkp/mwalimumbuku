import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { Gamepad2, Brain, Type, Calculator, ArrowRight, Palette, Keyboard, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DifficultySelector from '@/components/games/DifficultySelector';
import MemoryGame from '@/components/games/MemoryGame';
import WordScrambleGame from '@/components/games/WordScrambleGame';
import MathGame from '@/components/games/MathGame';
import AlphabetGame from '@/components/games/AlphabetGame';
import ColorMatchGame from '@/components/games/ColorMatchGame';
import TypingGame from '@/components/games/TypingGame';
import type { Difficulty } from '@/components/games/types';

export default function GamesPage() {
  const { t } = useLanguage();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  const handleScore = useCallback((pts: number) => {
    setSessionScore(s => s + pts);
  }, []);

  const GAMES = [
    { id: 'memory', icon: Brain, gradient: 'from-primary/15 to-primary/5' },
    { id: 'words', icon: Type, gradient: 'from-accent/15 to-accent/5' },
    { id: 'math', icon: Calculator, gradient: 'from-secondary/15 to-secondary/5' },
    { id: 'alphabet', icon: ArrowRight, gradient: 'from-primary/15 to-accent/5' },
    { id: 'colors', icon: Palette, gradient: 'from-secondary/15 to-primary/5' },
    { id: 'typing', icon: Keyboard, gradient: 'from-accent/15 to-secondary/5' },
  ];

  const gameComponents: Record<string, React.ReactNode> = {
    memory: <MemoryGame onScore={handleScore} difficulty={difficulty} />,
    words: <WordScrambleGame onScore={handleScore} difficulty={difficulty} />,
    math: <MathGame onScore={handleScore} difficulty={difficulty} />,
    alphabet: <AlphabetGame onScore={handleScore} difficulty={difficulty} />,
    colors: <ColorMatchGame onScore={handleScore} difficulty={difficulty} />,
    typing: <TypingGame onScore={handleScore} difficulty={difficulty} />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Gamepad2 className="h-5 w-5 text-accent" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">{t.games.title}</h1>
          </div>
          <p className="mt-1 text-muted-foreground">{t.games.subtitle}</p>
        </div>
        {sessionScore > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-primary">{sessionScore} pts</span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!activeGame ? (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GAMES.map((game, i) => (
              <motion.button key={game.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setActiveGame(game.id)}
                className={cn(
                  'group rounded-2xl border border-border/50 bg-gradient-to-br p-6 text-left transition-all hover:shadow-lg hover:-translate-y-0.5',
                  game.gradient
                )}>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card shadow-sm mb-4">
                  <game.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{t.games.list[game.id]?.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.games.list[game.id]?.desc}</p>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div key={activeGame} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
              <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>
                ← {t.games.backToGames}
              </Button>
              <DifficultySelector value={difficulty} onChange={setDifficulty} />
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              {gameComponents[activeGame]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
