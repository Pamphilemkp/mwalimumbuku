"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { cn } from "@/src/lib/utils";
import { Star } from "lucide-react";
import { Progress } from "@/src/components/ui/progress";
import { MIN_GAP_MS, colorById, type Round } from "@/lib/games/engine";
import GameTimer from "./GameTimer";
import { useStamps } from "./useStamps";

export default function ColorMatchGame({
  round,
  deadlineMs,
  onComplete,
}: {
  round: Extract<Round, { game: "colors" }>;
  deadlineMs: number;
  onComplete: (events: { game: "colors"; picks: number[]; atMs: number[] }) => void;
}) {
  const { t, lang } = useLanguage();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const picks = useRef<number[]>([]);
  const done = useRef(false);
  const busy = useRef(false);
  const { mark, stamps } = useStamps(MIN_GAP_MS.colors);
  const item = round.rounds[index];
  const stroop = round.difficulty === "hard";

  function finish() {
    if (done.current) return;
    done.current = true;
    onComplete({ game: "colors", picks: picks.current, atMs: stamps.current.slice(0, picks.current.length) });
  }

  function choose(optionIndex: number) {
    if (done.current || busy.current || !item || optionIndex < 0 || optionIndex >= item.options.length) return;
    if (mark() === null) return;
    busy.current = true;
    setPicked(optionIndex);
    picks.current = [...picks.current, optionIndex];
    if (item.options[optionIndex] === item.ink) setScore((current) => current + 15);
    window.setTimeout(() => {
      if (picks.current.length >= round.rounds.length) finish();
      else {
        setIndex((current) => current + 1);
        setPicked(null);
        busy.current = false;
      }
    }, 600);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!/^[1-6]$/.test(event.key)) return;
      choose(Number(event.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const word = item ? colorById(item.word) : null;
  const ink = item ? colorById(item.ink) : null;

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
      {item && word && ink ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4 text-center sm:p-6">
          <p className="text-sm text-muted-foreground">{stroop ? t.games.stroopQuestion : t.games.colorQuestion}</p>
          <p className="text-xs text-muted-foreground">{t.games.keyboardColors}</p>
          <p className="text-4xl font-bold" style={{ color: ink.hex }}>{lang === "fr" ? word.nameFr : word.nameEn}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {item.options.map((optionId, optionIndex) => {
              const color = colorById(optionId);
              const name = lang === "fr" ? color?.nameFr : color?.nameEn;
              const correct = optionId === item.ink;
              return (
                <button
                  key={`${optionId}-${optionIndex}`}
                  type="button"
                  aria-label={`${optionIndex + 1}. ${name ?? optionId}`}
                  onClick={() => choose(optionIndex)}
                  className={cn(
                    "h-14 w-14 rounded-xl border-2 sm:h-16 sm:w-16",
                    picked === null && "border-border",
                    picked !== null && correct && "border-primary ring-2 ring-primary",
                    picked === optionIndex && !correct && "border-destructive opacity-60",
                  )}
                  style={{ backgroundColor: color?.hex }}
                />
              );
            })}
          </div>
          <p className="sr-only" aria-live="polite">{picked === null ? "" : item.options[picked] === item.ink ? t.games.correctAnswer : t.games.wrongAnswer}</p>
        </div>
      ) : null}
    </div>
  );
}
