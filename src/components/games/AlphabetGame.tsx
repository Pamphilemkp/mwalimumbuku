"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { MIN_GAP_MS, type Round } from "@/lib/games/engine";
import GameTimer from "./GameTimer";
import { useStamps } from "./useStamps";
import { fill, GameGuide, GameHud, PlaySurface, ResultBanner, type Banner } from "./GameChrome";

export default function AlphabetGame({
  round,
  deadlineMs,
  onComplete,
}: {
  round: Extract<Round, { game: "alphabet" }>;
  deadlineMs: number;
  onComplete: (events: { game: "alphabet"; orders: string[][]; atMs: number[] }) => void;
}) {
  const { t } = useLanguage();
  const [stageIndex, setStageIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const done = useRef(false);
  const lock = useRef(false);
  const clean = useRef(true);
  const selectedRef = useRef<string[]>([]);
  const ordersRef = useRef<string[][]>([]);
  const stageRef = useRef(0);
  const { mark, stamps, drop } = useStamps(MIN_GAP_MS.alphabet);
  const stage = round.stages[stageIndex] ?? [];
  const expected = stage.slice().sort();

  const finish = useCallback((orders: string[][]) => {
    if (done.current) return;
    done.current = true;
    onComplete({ game: "alphabet", orders, atMs: stamps.current.slice(0, orders.reduce((sum, order) => sum + order.length, 0)) });
  }, [onComplete, stamps]);

  const choose = useCallback((letter: string) => {
    const current = round.stages[stageRef.current] ?? [];
    const order = current.slice().sort();
    if (done.current || lock.current || !current.includes(letter) || selectedRef.current.includes(letter)) return;
    if (selectedRef.current.length >= current.length || mark() === null) return;
    const next = [...selectedRef.current, letter];
    selectedRef.current = next;
    setSelected(next);
    const place = next.length - 1;
    if (letter === order[place]) {
      setBanner({ tone: "correct", text: fill(t.games.feedback.letterFits, { letter }) });
    } else {
      setBanner({ tone: "wrong", text: fill(t.games.feedback.notNextLetter, { letter, expected: order[place] }) });
    }
    if (next.length < current.length) return;
    const stagePerfect = next.every((item, index) => item === order[index]);
    if (!stagePerfect) clean.current = false;
    ordersRef.current = [...ordersRef.current, next];
    selectedRef.current = [];
    lock.current = true;
    window.setTimeout(() => {
      const last = stageRef.current + 1 >= round.stages.length;
      if (last) {
        setBanner({
          tone: clean.current ? "correct" : "wrong",
          text: clean.current ? t.games.feedback.perfectSets : fill(t.games.feedback.wrongSets, { order: order.join(" ") }),
        });
        window.setTimeout(() => finish(ordersRef.current), 700);
        return;
      }
      setBanner({
        tone: stagePerfect ? "info" : "wrong",
        text: stagePerfect ? t.games.feedback.nextSet : fill(t.games.feedback.wrongSets, { order: order.join(" ") }),
      });
      stageRef.current += 1;
      setStageIndex(stageRef.current);
      setSelected([]);
      lock.current = false;
    }, 1000);
  }, [finish, mark, round.stages, t]);

  const undo = useCallback(() => {
    if (done.current || lock.current || selectedRef.current.length === 0) return;
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
    <div className="min-w-0 max-w-full space-y-3">
      <GameGuide game="alphabet" />
      <GameHud
        left={<span>{fill(t.games.feedback.setOf, { n: Math.min(stageIndex + 1, round.stages.length), total: round.stages.length })}</span>}
        right={<GameTimer deadlineMs={deadlineMs} onTimeUp={() => finish(selectedRef.current.length > 0 ? [...ordersRef.current, selectedRef.current] : ordersRef.current)} />}
      />
      <p className="text-xs text-muted-foreground">{t.games.keyboardAlphabet}</p>
      <PlaySurface>
        <div className="flex flex-wrap justify-center gap-1.5">
          {expected.map((_, index) => {
            const letter = selected[index];
            const right = Boolean(letter) && letter === expected[index];
            const wrong = Boolean(letter) && letter !== expected[index];
            return (
              <div
                key={`${stageIndex}-${index}`}
                className={cn(
                  "flex h-11 w-9 items-center justify-center rounded-lg border-2 text-lg font-bold sm:w-11",
                  !letter && "border-dashed border-border",
                  letter && right && "border-primary bg-primary/10 text-primary",
                  wrong && "border-destructive bg-destructive/10 text-destructive",
                )}
              >
                {letter ?? ""}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={t.games.alphabetInstruction}>
          {stage.map((letter) => (
            <button
              key={`${stageIndex}-${letter}`}
              type="button"
              disabled={selected.includes(letter) || lock.current || done.current}
              onClick={() => choose(letter)}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg border text-lg font-bold",
                selected.includes(letter) ? "border-border opacity-30" : "border-border bg-card hover:border-primary hover:bg-primary/5",
              )}
            >
              {letter}
            </button>
          ))}
        </div>
        <div className="flex justify-center">
          <Button type="button" variant="outline" className="h-11 px-4" onClick={undo} disabled={lock.current || done.current || selected.length === 0}>
            {t.games.undo}
          </Button>
        </div>
        {banner ? <ResultBanner tone={banner.tone}>{banner.text}</ResultBanner> : null}
      </PlaySurface>
    </div>
  );
}
