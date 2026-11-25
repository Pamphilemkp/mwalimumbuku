"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { cn } from "@/src/lib/utils";
import { Check, Star, Zap } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import { MIN_GAP_MS, mathValue, type Round } from "@/lib/games/engine";
import GameTimer from "./GameTimer";
import { useStamps } from "./useStamps";

export default function MathGame({
  round,
  deadlineMs,
  onComplete,
}: {
  round: Extract<Round, { game: "math" }>;
  deadlineMs: number;
  onComplete: (events: { game: "math"; answers: string[]; atMs: number[] }) => void;
}) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const done = useRef(false);
  const busy = useRef(false);
  const answersRef = useRef<string[]>([]);
  const { mark, stamps } = useStamps(MIN_GAP_MS.math);
  const problem = round.problems[index];

  function finish(finalAnswers: string[]) {
    if (done.current) return;
    done.current = true;
    onComplete({ game: "math", answers: finalAnswers, atMs: stamps.current.slice(0, finalAnswers.length) });
  }

  function checkAnswer() {
    if (done.current || busy.current || !problem) return;
    if (mark() === null) return;
    busy.current = true;
    const expected = mathValue(problem);
    const text = answer.trim();
    const correct = /^-?\d+$/.test(text) && Number(text) === expected;
    const nextAnswers = [...answersRef.current, text];
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    if (correct) {
      const gained = 10 + streak * 2;
      setScore((current) => current + gained);
      setStreak((current) => current + 1);
      setFeedback("correct");
    } else {
      setStreak(0);
      setFeedback("wrong");
    }
    window.setTimeout(() => {
      if (nextAnswers.length >= round.problems.length) finish(nextAnswers);
      else {
        setIndex((current) => current + 1);
        setAnswer("");
        setFeedback(null);
        busy.current = false;
      }
    }, 700);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
        <span>{t.games.round} {Math.min(index + 1, round.problems.length)}/{round.problems.length}</span>
        <div className="flex items-center gap-3">
          {streak > 0 ? <span className="flex items-center gap-1 text-secondary"><Zap className="h-4 w-4" /> {streak} {t.games.streak}</span> : null}
          <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {score}</span>
          <GameTimer deadlineMs={deadlineMs} onTimeUp={() => finish(answersRef.current)} />
        </div>
      </div>
      <Progress value={(index / round.problems.length) * 100} className="h-2" />
      {problem && !done.current ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4 text-center sm:p-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary">{problem.a}</span>
            <span className="text-2xl font-bold">{problem.op}</span>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-xl font-bold text-accent">{problem.b}</span>
            <span className="text-2xl font-bold">=</span>
          </div>
          <div className="mx-auto flex max-w-xs gap-2">
            <label className="sr-only" htmlFor="math-answer">{t.games.answer}</label>
            <input
              id="math-answer"
              inputMode="numeric"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") checkAnswer();
              }}
              className="h-11 flex-1 rounded-lg border border-border bg-background px-3 text-center text-lg font-bold"
            />
            <Button type="button" className="h-11 w-11" onClick={checkAnswer} disabled={answer.trim().length === 0 || busy.current} aria-label={t.games.answer}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
          {feedback ? (
            <p className={cn("text-lg font-bold", feedback === "correct" ? "text-primary" : "text-destructive")} aria-live="polite">
              {feedback === "correct" ? t.games.correctAnswer : `${t.games.answer}: ${mathValue(problem)}`}
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="sr-only">{answers.length}</p>
    </div>
  );
}
