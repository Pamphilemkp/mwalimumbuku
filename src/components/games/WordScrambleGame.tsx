"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { cn } from "@/src/lib/utils";
import { Check, Star } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import { MIN_GAP_MS, foldWord, type Round } from "@/lib/games/engine";
import GameTimer from "./GameTimer";
import { useStamps } from "./useStamps";

export default function WordScrambleGame({
  round,
  deadlineMs,
  onComplete,
}: {
  round: Extract<Round, { game: "words" }>;
  deadlineMs: number;
  onComplete: (events: { game: "words"; guesses: string[]; atMs: number[] }) => void;
}) {
  const { t, lang } = useLanguage();
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const guesses = useRef<string[]>([]);
  const done = useRef(false);
  const busy = useRef(false);
  const { mark, stamps } = useStamps(MIN_GAP_MS.words);
  const item = round.rounds[index];

  function finish() {
    if (done.current) return;
    done.current = true;
    onComplete({ game: "words", guesses: guesses.current, atMs: stamps.current.slice(0, guesses.current.length) });
  }

  function checkAnswer() {
    if (done.current || busy.current || !item || guess.trim().length === 0) return;
    if (mark() === null) return;
    busy.current = true;
    const correct = foldWord(guess) === item.word;
    guesses.current = [...guesses.current, guess];
    setFeedback(correct ? "correct" : "wrong");
    if (correct) setScore((current) => current + 20);
    window.setTimeout(() => {
      if (guesses.current.length >= round.rounds.length) finish();
      else {
        setIndex((current) => current + 1);
        setGuess("");
        setFeedback(null);
        busy.current = false;
      }
    }, 800);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
        <span>{t.games.round} {Math.min(index + 1, round.rounds.length)}/{round.rounds.length}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {score}</span>
          <GameTimer deadlineMs={deadlineMs} onTimeUp={finish} />
        </div>
      </div>
      <Progress value={(index / round.rounds.length) * 100} className="h-2" />
      {item ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4 text-center sm:p-6">
          <p className="text-sm text-muted-foreground">{lang === "fr" ? item.hintFr : item.hintEn}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[...item.scrambled].map((letter, letterIndex) => (
              <span key={`${letter}-${letterIndex}`} className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                {letter}
              </span>
            ))}
          </div>
          <div className="mx-auto flex max-w-xs gap-2">
            <label className="sr-only" htmlFor="word-guess">{t.games.yourAnswer}</label>
            <input
              id="word-guess"
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") checkAnswer();
              }}
              placeholder={t.games.yourAnswer}
              className="h-11 flex-1 rounded-lg border border-border bg-background px-3"
              autoCapitalize="characters"
            />
            <Button type="button" className="h-11 w-11" onClick={checkAnswer} disabled={guess.trim().length === 0 || busy.current} aria-label={t.games.answer}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
          {feedback ? (
            <p className={cn("text-sm font-medium", feedback === "correct" ? "text-primary" : "text-destructive")} aria-live="polite">
              {feedback === "correct" ? t.games.bravo : `${t.games.theWordWas}: ${item.word}`}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
