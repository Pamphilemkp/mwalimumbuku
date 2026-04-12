import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { Gamepad2, Brain, Type, Calculator, ArrowRight, Palette, Keyboard, Trophy, Timer, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DifficultySelector from '@/components/games/DifficultySelector';
import MemoryGame from '@/components/games/MemoryGame';
import WordScrambleGame from '@/components/games/WordScrambleGame';
import MathGame from '@/components/games/MathGame';
import AlphabetGame from '@/components/games/AlphabetGame';
import ColorMatchGame from '@/components/games/ColorMatchGame';
import TypingGame from '@/components/games/TypingGame';
import type { Difficulty } from '@/components/games/types';
import { TIME_LIMITS } from '@/components/games/types';

export default function GamesPage() {
  const { t } = useLanguage();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<'menu' | 'ready' | 'playing' | 'finished'>('menu');
  const [sessionScore, setSessionScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [lastTime, setLastTime] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  const handleScore = useCallback((pts: number) => {
    setSessionScore(s => s + pts);
    setLastScore(s => s + pts);
  }, []);

  const handleGameEnd = useCallback((score: number, time: number) => {
    setLastScore(score);
    setLastTime(time);
    setGamePhase('finished');
  }, []);

  const startGame = (gameId: string) => {
    setActiveGame(gameId);
    setLastScore(0);
    setLastTime(0);
    setGamePhase('ready');
  };

  const beginPlaying = () => {
    setLastScore(0);
    setGamePhase('playing');
  };

  const backToMenu = () => {
    setActiveGame(null);
    setGamePhase('menu');
  };

  const GAMES = [
    { id: 'memory', icon: Brain, gradient: 'from-primary/15 to-primary/5' },
    { id: 'words', icon: Type, gradient: 'from-accent/15 to-accent/5' },
    { id: 'math', icon: Calculator, gradient: 'from-secondary/15 to-secondary/5' },
    { id: 'alphabet', icon: ArrowRight, gradient: 'from-primary/15 to-accent/5' },
    { id: 'colors', icon: Palette, gradient: 'from-secondary/15 to-primary/5' },
    { id: 'typing', icon: Keyboard, gradient: 'from-accent/15 to-secondary/5' },
  ];

  const gameComponents: Record<string, React.ReactNode> = {
    memory: <MemoryGame onScore={handleScore} difficulty={difficulty} onGameEnd={handleGameEnd} />,
    words: <WordScrambleGame onScore={handleScore} difficulty={difficulty} onGameEnd={handleGameEnd} />,
    math: <MathGame onScore={handleScore} difficulty={difficulty} onGameEnd={handleGameEnd} />,
    alphabet: <AlphabetGame onScore={handleScore} difficulty={difficulty} onGameEnd={handleGameEnd} />,
    colors: <ColorMatchGame onScore={handleScore} difficulty={difficulty} onGameEnd={handleGameEnd} />,
    typing: <TypingGame onScore={handleScore} difficulty={difficulty} onGameEnd={handleGameEnd} />,
  };

  const timeLimit = TIME_LIMITS[difficulty];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Gamepad2 className="h-5 w-5 text-accent" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{t.games.title}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t.games.subtitle}</p>
        </div>
        {sessionScore > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-primary">{sessionScore} pts</span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {gamePhase === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid gap-4 grid-cols-2 lg:grid-cols-3">
            {GAMES.map((game, i) => (
              <motion.button key={game.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => startGame(game.id)}
                className={cn(
                  'group rounded-2xl border border-border/50 bg-gradient-to-br p-4 sm:p-6 text-left transition-all hover:shadow-lg hover:-translate-y-0.5',
                  game.gradient
                )}>
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-card shadow-sm mb-3 sm:mb-4">
                  <game.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <h3 className="font-display text-sm sm:text-lg font-semibold text-foreground">{t.games.list[game.id]?.label}</h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">{t.games.list[game.id]?.desc}</p>
              </motion.button>
            ))}
          </motion.div>
        )}

        {gamePhase === 'ready' && activeGame && (
          <motion.div key="ready" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="mx-auto max-w-md text-center space-y-6 py-8 sm:py-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              {(() => { const G = GAMES.find(g => g.id === activeGame); return G ? <G.icon className="h-10 w-10 text-primary" /> : null; })()}
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">{t.games.list[activeGame]?.label}</h2>
              <p className="mt-2 text-muted-foreground">{t.games.list[activeGame]?.desc}</p>
            </div>
            <DifficultySelector value={difficulty} onChange={setDifficulty} />
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span>{t.games.timeLeft}: {Math.floor(timeLimit / 60)}:{(timeLimit % 60).toString().padStart(2, '0')}</span>
            </div>
            <Button size="lg" onClick={beginPlaying} className="gap-2 px-8">
              <Play className="h-5 w-5" /> {t.games.startGame}
            </Button>
            <div>
              <Button variant="ghost" size="sm" onClick={backToMenu}>← {t.games.backToGames}</Button>
            </div>
          </motion.div>
        )}

        {gamePhase === 'playing' && activeGame && (
          <motion.div key={activeGame} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
              <Button variant="ghost" size="sm" onClick={backToMenu}>← {t.games.backToGames}</Button>
              <DifficultySelector value={difficulty} onChange={setDifficulty} />
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              {gameComponents[activeGame]}
            </div>
          </motion.div>
        )}

        {gamePhase === 'finished' && (
          <motion.div key="finished" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="mx-auto max-w-md text-center space-y-6 py-8 sm:py-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
              <Trophy className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">{t.games.gameOver}</h2>
              <p className="mt-2 text-3xl font-bold text-primary">{lastScore} {t.points}</p>
              <p className="text-muted-foreground">{t.games.timeTaken}: {lastTime}s</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={() => { setLastScore(0); beginPlaying(); }} className="gap-2">
                <Play className="h-4 w-4" /> {t.games.playAgain}
              </Button>
              <Button variant="outline" onClick={backToMenu}>← {t.games.backToGames}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
