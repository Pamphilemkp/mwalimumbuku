"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { MIN_GAP_MS, type Round } from "@/lib/games/engine";
import GameTimer from "./GameTimer";
import { useStamps } from "./useStamps";

export default function AlphabetGame({
  round,
  deadlineMs,
  onComplete,
}: {
  round: Extract<Round, { game: "alphabet" }>;
  deadlineMs: number;
  onComplete: (events: { game: "alphabet"; order: string[]; atMs: number[] }) => void;
}) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const done = useRef(false);
  const selectedRef = useRef<string[]>([]);
  const { mark, stamps, drop } = useStamps(MIN_GAP_MS.alphabet);
  const expected = round.letters.slice().sort();

  const finish = useCallback((order: string[]) => {
    if (done.current) return;
    done.current = true;
    setFinished(true);
    onComplete({ game: "alphabet", order, atMs: stamps.current.slice(0, order.length) });
  }, [onComplete, stamps]);

  const choose = useCallback((letter: string) => {
    if (done.current || !round.letters.includes(letter) || selectedRef.current.includes(letter)) return;
    if (selectedRef.current.length >= round.letters.length || mark() === null) return;
    const next = [...selectedRef.current, letter];
    selectedRef.current = next;
    setSelected(next);
    if (next.length === round.letters.length) window.setTimeout(() => finish(next), 400);
  }, [finish, mark, round.letters]);

  const undo = useCallback(() => {
    if (done.current || selectedRef.current.length === 0) return;
    drop();
    const next = selectedRef.current.slice(0, -1);
    selectedRef.current = next;
    setSelected(next);
  }, [drop]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Backspace") {
        event.preventDefault();
        undo();
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key)) choose(event.key.toUpperCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, undo]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground sm:text-sm">{t.games.alphabetInstruction}</p>
        <GameTimer deadlineMs={deadlineMs} onTimeUp={() => finish(selectedRef.current)} />
      </div>
      <p className="text-xs text-muted-foreground">{t.games.keyboardAlphabet}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {expected.map((_, index) => {
          const letter = selected[index];
          const revealed = finished && letter;
          const right = revealed && letter === expected[index];
          return (
            <div
              key={index}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-lg border-2 text-lg font-bold",
                !letter && "border-dashed border-border",
                letter && !finished && "border-primary/50 bg-card",
                right && "border-primary bg-primary/10 text-primary",
                revealed && !right && "border-destructive bg-destructive/10 text-destructive",
              )}
            >
              {letter ?? ""}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={t.games.alphabetInstruction}>
        {round.letters.map((letter) => (
          <button
            key={letter}
            type="button"
            disabled={selected.includes(letter) || finished}
            onClick={() => choose(letter)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-lg border text-lg font-bold",
              selected.includes(letter) ? "border-border opacity-30" : "border-border bg-card hover:border-primary hover:bg-primary/5",
            )}
          >
            {letter}
          </button>
        ))}
      </div>
      <div className="flex justify-center">
        <Button type="button" variant="outline" size="sm" onClick={undo} disabled={finished || selected.length === 0}>
          {t.games.undo}
        </Button>
      </div>
      <p className="sr-only" aria-live="polite">
        {finished ? (selected.join("") === expected.join("") ? t.games.correctAnswer : t.games.wrongOrder) : ""}
      </p>
    </div>
  );
}
