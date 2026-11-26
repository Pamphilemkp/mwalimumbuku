"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { Check, Star, Zap } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import { MIN_GAP_MS, mathValue, type Round } from "@/lib/games/engine";
import GameTimer from "./GameTimer";
import { useStamps } from "./useStamps";
import { fill, GameGuide, GameHud, PlaySurface, ResultBanner, type Banner } from "./GameChrome";

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
  const [banner, setBanner] = useState<Banner | null>(null);
  const done = useRef(false);
  const busy = useRef(false);
  const answersRef = useRef<string[]>([]);
  const streakRef = useRef(0);
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
      const gained = 10 + streakRef.current * 2;
      const nextStreak = streakRef.current + 1;
      streakRef.current = nextStreak;
      setScore((current) => {
        const next = current + gained;
        setBanner({
          tone: "correct",
          text: `${fill(t.games.feedback.correctPlus, { n: gained })} ${fill(t.games.feedback.streakNow, { n: nextStreak })} ${fill(t.games.feedback.scoreNow, { n: next })}`,
        });
        return next;
      });
      setStreak(nextStreak);
    } else {
      streakRef.current = 0;
      setStreak(0);
      setBanner({
        tone: "wrong",
        text: `${t.games.wrongAnswer}. ${fill(t.games.feedback.answerWas, { answer: expected })} ${t.games.feedback.streakReset} ${t.games.feedback.noPoints}`,
      });
    }
    window.setTimeout(() => {
      if (nextAnswers.length >= round.problems.length) finish(nextAnswers);
      else {
        setIndex((current) => current + 1);
        setAnswer("");
        setBanner(null);
        busy.current = false;
      }
    }, 1100);
  }

  return (
    <div className="min-w-0 max-w-full space-y-3">
      <GameGuide game="math" />
      <GameHud
        left={
          <>
            <span>{t.games.round} {Math.min(index + 1, round.problems.length)}/{round.problems.length}</span>
            <span className="flex items-center gap-1 text-secondary"><Zap className="h-4 w-4" /> {streak} {t.games.streak}</span>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {score}</span>
          </>
        }
        right={<GameTimer deadlineMs={deadlineMs} onTimeUp={() => finish(answersRef.current)} />}
      />
      <Progress value={(index / round.problems.length) * 100} className="h-2 bg-muted" />
      {problem && !done.current ? (
        <PlaySurface>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">{problem.a}</span>
            <span className="text-2xl font-bold">{problem.op}</span>
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-2xl font-bold text-accent">{problem.b}</span>
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
              className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-center text-lg font-bold"
            />
            <Button type="button" className="h-12 w-12" onClick={checkAnswer} disabled={answer.trim().length === 0 || busy.current} aria-label={t.games.answer}>
              <Check className="h-5 w-5" />
            </Button>
          </div>
          {banner ? <ResultBanner tone={banner.tone}>{banner.text}</ResultBanner> : null}
        </PlaySurface>
      ) : null}
      <p className="sr-only">{answers.length}</p>
    </div>
  );
}
