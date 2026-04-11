import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { Gamepad2, Brain, Type, Calculator, RotateCcw, Trophy, Star, Timer, Zap, ArrowRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';

// ─── Memory Game ───────────────────────────────────────
const MEMORY_EMOJIS = ['🐘', '🦁', '🐍', '🦒', '🐊', '🦓', '🐆', '🦏'];

interface MemoryCard {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function MemoryGame({ onScore }: { onScore: (pts: number) => void }) {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const totalPairs = MEMORY_EMOJIS.length;

  const initGame = useCallback(() => {
    const shuffled = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
    setCards(shuffled);
    setFlippedIds([]);
    setMoves(0);
    setMatches(0);
    setTimer(0);
    setRunning(true);
  }, []);

  useEffect(() => { initGame(); }, [initGame]);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  useEffect(() => {
    if (matches === totalPairs && matches > 0) {
      setRunning(false);
      const pts = Math.max(100 - moves * 2, 20);
      onScore(pts);
      toast.success(`🎉 Bravo! ${pts} points earned!`);
    }
  }, [matches, totalPairs, moves, onScore]);

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
          <span className="flex items-center gap-1"><Zap className="h-4 w-4 text-primary" /> {moves} moves</span>
          <span className="flex items-center gap-1"><Timer className="h-4 w-4" /> {timer}s</span>
          <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {matches}/{totalPairs}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={initGame}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset</Button>
      </div>
      <Progress value={(matches / totalPairs) * 100} className="h-2" />
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {cards.map(card => (
          <motion.button
            key={card.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => flipCard(card.id)}
            className={cn(
              'aspect-square rounded-xl border-2 text-2xl sm:text-3xl font-bold flex items-center justify-center transition-all',
              card.matched ? 'border-primary/40 bg-primary/10' :
              card.flipped ? 'border-primary bg-card' :
              'border-border bg-muted hover:border-primary/30 cursor-pointer'
            )}
          >
            {card.flipped || card.matched ? card.emoji : '?'}
          </motion.button>
        ))}
      </div>
      {matches === totalPairs && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary mb-2" />
          <h3 className="font-display text-xl font-bold text-foreground">Félicitations!</h3>
          <p className="text-muted-foreground">{moves} moves in {timer} seconds</p>
          <Button className="mt-3" onClick={initGame}>Play Again</Button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Word Scramble Game ────────────────────────────────
const WORDS_FR = [
  { word: 'ÉCOLE', hint: 'Lieu d\'apprentissage' },
  { word: 'LIVRE', hint: 'On le lit' },
  { word: 'CLASSE', hint: 'Salle de cours' },
  { word: 'MATH', hint: 'Nombres et calculs' },
  { word: 'ÉCRIRE', hint: 'Avec un stylo' },
  { word: 'LIRE', hint: 'Avec les yeux' },
  { word: 'CAHIER', hint: 'On y écrit' },
  { word: 'TABLEAU', hint: 'Devant la classe' },
];

function WordScrambleGame({ onScore }: { onScore: (pts: number) => void }) {
  const [wordIdx, setWordIdx] = useState(0);
  const [scrambled, setScrambled] = useState('');
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [round, setRound] = useState(1);
  const totalRounds = 5;

  const scrambleWord = (w: string) => {
    const arr = w.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('') === w ? scrambleWord(w) : arr.join('');
  };

  const nextWord = useCallback(() => {
    const idx = Math.floor(Math.random() * WORDS_FR.length);
    setWordIdx(idx);
    setScrambled(scrambleWord(WORDS_FR[idx].word));
    setGuess('');
    setFeedback(null);
  }, []);

  useEffect(() => { nextWord(); }, [nextWord]);

  const checkAnswer = () => {
    if (guess.toUpperCase().trim() === WORDS_FR[wordIdx].word) {
      setFeedback('correct');
      setScore(s => s + 20);
      onScore(20);
      toast.success('🎉 Correct!');
    } else {
      setFeedback('wrong');
      toast.error(`❌ The word was: ${WORDS_FR[wordIdx].word}`);
    }
    setTimeout(() => {
      if (round < totalRounds) {
        setRound(r => r + 1);
        nextWord();
      }
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Round {round}/{totalRounds}</span>
        <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {score} pts</span>
      </div>
      <Progress value={(round / totalRounds) * 100} className="h-2" />
      {round <= totalRounds ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-4">
          <p className="text-xs text-muted-foreground">{WORDS_FR[wordIdx].hint}</p>
          <div className="flex justify-center gap-2">
            {scrambled.split('').map((l, i) => (
              <span key={i} className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                {l}
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-xs mx-auto">
            <input
              value={guess}
              onChange={e => setGuess(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkAnswer()}
              placeholder="Your answer..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <Button onClick={checkAnswer} disabled={!guess.trim()}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
          {feedback && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn('font-medium', feedback === 'correct' ? 'text-primary' : 'text-destructive')}>
              {feedback === 'correct' ? '✓ Bravo!' : `✗ Réponse: ${WORDS_FR[wordIdx].word}`}
            </motion.p>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary mb-2" />
          <h3 className="font-display text-xl font-bold text-foreground">Game Over!</h3>
          <p className="text-muted-foreground">Score: {score} points</p>
          <Button className="mt-3" onClick={() => { setRound(1); setScore(0); nextWord(); }}>Play Again</Button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Math Challenge Game ───────────────────────────────
function MathGame({ onScore }: { onScore: (pts: number) => void }) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [op, setOp] = useState<'+' | '-' | '×'>('+');
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [round, setRound] = useState(1);
  const totalRounds = 10;

  const newProblem = useCallback(() => {
    const ops: ('+' | '-' | '×')[] = ['+', '-', '×'];
    const o = ops[Math.floor(Math.random() * ops.length)];
    let a = Math.floor(Math.random() * 20) + 1;
    let b = Math.floor(Math.random() * 12) + 1;
    if (o === '-' && b > a) [a, b] = [b, a];
    if (o === '×') { a = Math.floor(Math.random() * 12) + 1; b = Math.floor(Math.random() * 10) + 1; }
    setNum1(a); setNum2(b); setOp(o);
    setAnswer(''); setFeedback(null);
  }, []);

  useEffect(() => { newProblem(); }, [newProblem]);

  const correctAnswer = useMemo(() => {
    switch (op) {
      case '+': return num1 + num2;
      case '-': return num1 - num2;
      case '×': return num1 * num2;
    }
  }, [num1, num2, op]);

  const checkAnswer = () => {
    if (parseInt(answer) === correctAnswer) {
      const pts = 10 + streak * 2;
      setScore(s => s + pts);
      setStreak(s => s + 1);
      setFeedback('correct');
      onScore(pts);
      toast.success(`🎉 +${pts} points!`);
    } else {
      setFeedback('wrong');
      setStreak(0);
      toast.error(`❌ Answer: ${correctAnswer}`);
    }
    setTimeout(() => {
      if (round < totalRounds) { setRound(r => r + 1); newProblem(); }
    }, 1200);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Round {round}/{totalRounds}</span>
        <div className="flex gap-3">
          {streak > 0 && <span className="flex items-center gap-1 text-secondary"><Zap className="h-4 w-4" /> {streak}x streak</span>}
          <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {score}</span>
        </div>
      </div>
      <Progress value={(round / totalRounds) * 100} className="h-2" />
      {round <= totalRounds ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">{num1}</span>
            <span className="text-2xl font-bold text-foreground">{op}</span>
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-2xl font-bold text-accent">{num2}</span>
            <span className="text-2xl font-bold text-foreground">=</span>
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-2xl font-bold text-foreground">?</span>
          </div>
          <div className="flex gap-2 max-w-xs mx-auto">
            <input
              type="number"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkAnswer()}
              placeholder="="
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-center text-lg font-bold text-foreground"
            />
            <Button onClick={checkAnswer} disabled={!answer.trim()}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
          {feedback && (
            <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className={cn('text-lg font-bold', feedback === 'correct' ? 'text-primary' : 'text-destructive')}>
              {feedback === 'correct' ? '✓ Correct!' : `✗ ${correctAnswer}`}
            </motion.p>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary mb-2" />
          <h3 className="font-display text-xl font-bold text-foreground">Game Over!</h3>
          <p className="text-muted-foreground">Score: {score} points</p>
          <Button className="mt-3" onClick={() => { setRound(1); setScore(0); setStreak(0); newProblem(); }}>Play Again</Button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Alphabet Ordering Game ────────────────────────────
function AlphabetGame({ onScore }: { onScore: (pts: number) => void }) {
  const [letters, setLetters] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [correct, setCorrect] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const newGame = useCallback(() => {
    const all = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const start = Math.floor(Math.random() * 18);
    const slice = all.slice(start, start + 8);
    setCorrect([...slice]);
    setLetters([...slice].sort(() => Math.random() - 0.5));
    setSelected([]);
    setDone(false);
  }, []);

  useEffect(() => { newGame(); }, [newGame]);

  const selectLetter = (l: string) => {
    if (selected.includes(l)) return;
    const newSel = [...selected, l];
    setSelected(newSel);
    if (newSel.length === correct.length) {
      const isCorrect = newSel.every((s, i) => s === correct[i]);
      setDone(true);
      if (isCorrect) {
        onScore(30);
        toast.success('🎉 Perfect order! +30 points!');
      } else {
        toast.error('❌ Wrong order. Try again!');
      }
    }
  };

  const isCorrectSoFar = selected.every((s, i) => s === correct[i]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">Put the letters in alphabetical order</p>
      {/* Selected slots */}
      <div className="flex justify-center gap-2">
        {correct.map((_, i) => (
          <div key={i} className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg border-2 text-lg font-bold',
            selected[i]
              ? (done ? (selected[i] === correct[i] ? 'border-primary bg-primary/10 text-primary' : 'border-destructive bg-destructive/10 text-destructive')
                : 'border-primary/50 bg-card text-foreground')
              : 'border-dashed border-border'
          )}>
            {selected[i] || ''}
          </div>
        ))}
      </div>
      {/* Available letters */}
      <div className="flex flex-wrap justify-center gap-2">
        {letters.map(l => (
          <button
            key={l}
            disabled={selected.includes(l) || done}
            onClick={() => selectLetter(l)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg border text-lg font-bold transition-all',
              selected.includes(l) ? 'opacity-30 border-border' : 'border-border bg-card hover:border-primary hover:bg-primary/5 cursor-pointer'
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => { setSelected([]); setDone(false); }}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Undo
        </Button>
        <Button variant="outline" size="sm" onClick={newGame}>New Letters</Button>
      </div>
    </div>
  );
}

// ─── Main Games Page ───────────────────────────────────
const GAMES = [
  { id: 'memory', label: 'Memory', icon: Brain, desc: 'Find matching pairs', gradient: 'from-primary/15 to-primary/5' },
  { id: 'words', label: 'Word Scramble', icon: Type, desc: 'Unscramble the letters', gradient: 'from-accent/15 to-accent/5' },
  { id: 'math', label: 'Math Challenge', icon: Calculator, desc: 'Quick mental math', gradient: 'from-secondary/15 to-secondary/5' },
  { id: 'alphabet', label: 'Alphabet Order', icon: ArrowRight, desc: 'Sort letters A-Z', gradient: 'from-primary/15 to-accent/5' },
];

export default function GamesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState(0);

  const handleScore = useCallback((pts: number) => {
    setSessionScore(s => s + pts);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Gamepad2 className="h-5 w-5 text-accent" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">Jeux Éducatifs</h1>
          </div>
          <p className="mt-1 text-muted-foreground">Apprends en t'amusant avec des jeux interactifs</p>
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
            className="grid gap-4 sm:grid-cols-2">
            {GAMES.map((game, i) => (
              <motion.button
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveGame(game.id)}
                className={cn(
                  'group rounded-2xl border border-border/50 bg-gradient-to-br p-6 text-left transition-all hover:shadow-lg hover:-translate-y-0.5',
                  game.gradient
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card shadow-sm mb-4">
                  <game.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{game.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{game.desc}</p>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div key={activeGame} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>
                ← Back to Games
              </Button>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              {activeGame === 'memory' && <MemoryGame onScore={handleScore} />}
              {activeGame === 'words' && <WordScrambleGame onScore={handleScore} />}
              {activeGame === 'math' && <MathGame onScore={handleScore} />}
              {activeGame === 'alphabet' && <AlphabetGame onScore={handleScore} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
