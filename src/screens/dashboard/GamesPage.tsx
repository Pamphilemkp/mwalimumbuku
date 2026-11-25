"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { cn } from "@/src/lib/utils";
import { Gamepad2, Brain, Type, Calculator, ArrowRight, Palette, Keyboard, Trophy, Timer, Play } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import DifficultySelector from "@/src/components/games/DifficultySelector";
import MemoryGame from "@/src/components/games/MemoryGame";
import WordScrambleGame from "@/src/components/games/WordScrambleGame";
import MathGame from "@/src/components/games/MathGame";
import AlphabetGame from "@/src/components/games/AlphabetGame";
import ColorMatchGame from "@/src/components/games/ColorMatchGame";
import TypingGame from "@/src/components/games/TypingGame";
import { TIME_LIMITS, type Difficulty, type Round } from "@/lib/games/engine";
import { startGameAction, submitGameAction } from "@/features/games/actions";

type Phase = "menu" | "ready" | "playing" | "finished";
type Verified = {
  score: number;
  xpGranted: number;
  level: number;
  streak: number;
  stats: Record<string, number>;
  message?: string;
};

const GAMES = [
  { id: "memory", icon: Brain, gradient: "from-primary/15 to-primary/5" },
  { id: "words", icon: Type, gradient: "from-accent/15 to-accent/5" },
  { id: "math", icon: Calculator, gradient: "from-secondary/15 to-secondary/5" },
  { id: "alphabet", icon: ArrowRight, gradient: "from-primary/15 to-accent/5" },
  { id: "colors", icon: Palette, gradient: "from-secondary/15 to-primary/5" },
  { id: "typing", icon: Keyboard, gradient: "from-accent/15 to-secondary/5" },
] as const;

export default function GamesPage() {
  const { t } = useLanguage();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [round, setRound] = useState<Round | null>(null);
  const [deadlineMs, setDeadlineMs] = useState(0);
  const [attemptId, setAttemptId] = useState("");
  const [notice, setNotice] = useState("");
  const [sessionXp, setSessionXp] = useState(0);
  const [result, setResult] = useState<Verified | null>(null);
  const [busy, setBusy] = useState(false);
  const idempotencyKey = useRef("");
  const payload = useRef<unknown>(null);
  const sent = useRef(false);
  const attemptRef = useRef("");

  const timeLimit = TIME_LIMITS[difficulty];

  const start = async (gameId: string) => {
    setBusy(true);
    setNotice("");
    const response = await startGameAction(gameId, difficulty);
    setBusy(false);
    if (!response.ok) {
      setNotice(response.message);
      return;
    }
    const nextRound = response.round as Round;
    if (!nextRound || nextRound.game !== gameId) {
      setNotice(t.games.notSaved);
      return;
    }
    const remaining = new Date(response.startedAt).getTime() + nextRound.durationSeconds * 1000 - new Date(response.serverNow).getTime();
    idempotencyKey.current = crypto.randomUUID();
    payload.current = null;
    sent.current = false;
    attemptRef.current = response.attemptId;
    setAttemptId(response.attemptId);
    setRound(nextRound);
    setDeadlineMs(Date.now() + remaining);
    setResult(null);
    setPhase("playing");
  };

  const submit = async () => {
    if (!payload.current || sent.current) return;
    sent.current = true;
    setBusy(true);
    const response = await submitGameAction({
      attemptId: attemptRef.current,
      idempotencyKey: idempotencyKey.current,
      events: payload.current,
    });
    setBusy(false);
    if (!response.ok) {
      sent.current = false;
      setResult({ score: 0, xpGranted: 0, level: 1, streak: 0, stats: {}, message: response.message });
    } else {
      setSessionXp((current) => current + (response.replayed ? 0 : response.xpGranted));
      setResult(response);
    }
    setPhase("finished");
  };

  const complete = (events: unknown) => {
    if (payload.current) return;
    payload.current = events;
    void submit();
  };

  const gameView = useMemo(() => {
    if (!round) return null;
    if (round.game === "memory") return <MemoryGame round={round} deadlineMs={deadlineMs} onComplete={complete} />;
    if (round.game === "words") return <WordScrambleGame round={round} deadlineMs={deadlineMs} onComplete={complete} />;
    if (round.game === "math") return <MathGame round={round} deadlineMs={deadlineMs} onComplete={complete} />;
    if (round.game === "alphabet") return <AlphabetGame round={round} deadlineMs={deadlineMs} onComplete={complete} />;
    if (round.game === "colors") return <ColorMatchGame round={round} deadlineMs={deadlineMs} onComplete={complete} />;
    return <TypingGame round={round} deadlineMs={deadlineMs} onComplete={complete} />;
  }, [round, deadlineMs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Gamepad2 className="h-5 w-5 text-accent" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{t.games.title}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t.games.subtitle}</p>
        </div>
        {sessionXp > 0 ? (
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-primary">{sessionXp} XP</span>
          </div>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {phase === "menu" ? (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {GAMES.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => {
                  setActiveGame(game.id);
                  setNotice("");
                  setPhase("ready");
                }}
                className={cn("rounded-2xl border border-border/50 bg-gradient-to-br p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-6", game.gradient)}
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-card shadow-sm">
                  <game.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-sm font-semibold text-foreground sm:text-lg">{t.games.list[game.id]?.label}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{t.games.list[game.id]?.desc}</p>
              </button>
            ))}
          </motion.div>
        ) : null}

        {phase === "ready" && activeGame ? (
          <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-md space-y-6 py-8 text-center">
            <h2 className="font-display text-2xl font-bold">{t.games.list[activeGame]?.label}</h2>
            <p className="text-muted-foreground">{t.games.list[activeGame]?.desc}</p>
            <div className="flex justify-center"><DifficultySelector value={difficulty} onChange={setDifficulty} /></div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span>{t.games.timeLeft}: {Math.floor(timeLimit / 60)}:{(timeLimit % 60).toString().padStart(2, "0")}</span>
            </div>
            {notice ? <p className="text-sm text-destructive" role="alert">{notice}</p> : null}
            <Button size="lg" onClick={() => void start(activeGame)} disabled={busy} className="gap-2 px-8">
              <Play className="h-5 w-5" /> {t.games.startGame}
            </Button>
            <div>
              <Button variant="ghost" size="sm" onClick={() => setPhase("menu")}>← {t.games.backToGames}</Button>
            </div>
          </motion.div>
        ) : null}

        {phase === "playing" && activeGame && round ? (
          <motion.div key={attemptId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={() => setPhase("menu")}>← {t.games.backToGames}</Button>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">{gameView}</div>
          </motion.div>
        ) : null}

        {phase === "finished" && result ? (
          <motion.div key="finished" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-md space-y-5 py-8 text-center">
            <Trophy className="mx-auto h-10 w-10 text-primary" />
            <h2 className="font-display text-2xl font-bold">{t.games.gameOver}</h2>
            {result.message ? <p className="text-sm text-destructive" role="alert">{result.message}</p> : (
              <>
                <p className="text-3xl font-bold text-primary">{result.score}</p>
                <p className="text-sm text-muted-foreground">{t.games.verifiedScore}: {result.xpGranted} XP · {t.games.levelLabel} {result.level} · {t.games.streak} {result.streak}</p>
                {activeGame === "typing" ? (
                  <p className="text-sm text-muted-foreground">
                    {t.games.wpm} {(result.stats.wpmDeci ?? 0) / 10} · {t.games.accuracy} {Math.round((result.stats.accuracyMillis ?? 0) / 10)}% · {t.games.errors} {result.stats.errors ?? 0} · {t.games.corrected} {result.stats.corrected ?? 0}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">{t.games.exercisePointsNote}</p>
              </>
            )}
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              {result.message ? (
                <Button onClick={() => void submit()} disabled={busy}>{t.games.retrySubmit}</Button>
              ) : (
                <Button onClick={() => activeGame && void start(activeGame)} disabled={busy} className="gap-2">
                  <Play className="h-4 w-4" /> {t.games.playAgain}
                </Button>
              )}
              <Button variant="outline" onClick={() => setPhase("menu")}>← {t.games.backToGames}</Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
