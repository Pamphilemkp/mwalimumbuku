"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { cn } from "@/src/lib/utils";
import { Star, Zap } from "lucide-react";
import { Progress } from "@/src/components/ui/progress";
import { MIN_GAP_MS, type Round } from "@/lib/games/engine";
import GameTimer from "./GameTimer";
import { useStamps } from "./useStamps";

export default function MemoryGame({
  round,
  deadlineMs,
  onComplete,
}: {
  round: Extract<Round, { game: "memory" }>;
  deadlineMs: number;
  onComplete: (events: { game: "memory"; flips: number[]; atMs: number[] }) => void;
}) {
  const { t } = useLanguage();
  const [faceUp, setFaceUp] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [focus, setFocus] = useState(0);
  const flips = useRef<number[]>([]);
  const open = useRef<number[]>([]);
  const matchedRef = useRef<number[]>([]);
  const busy = useRef(false);
  const done = useRef(false);
  const { mark, stamps } = useStamps(MIN_GAP_MS.memory);
  const pairs = round.deck.length / 2;

  function finish() {
    if (done.current) return;
    done.current = true;
    onComplete({ game: "memory", flips: flips.current, atMs: stamps.current.slice(0, flips.current.length) });
  }

  function flip(index: number) {
    if (done.current || busy.current || matchedRef.current.includes(index) || open.current.includes(index)) return;
    if (open.current.length >= 2 || mark() === null) return;
    const nextOpen = [...open.current, index];
    open.current = nextOpen;
    flips.current = [...flips.current, index];
    setFaceUp(nextOpen);
    if (nextOpen.length < 2) return;
    busy.current = true;
    const [first, second] = nextOpen;
    const same = round.deck[first] === round.deck[second];
    window.setTimeout(() => {
      if (same) {
        matchedRef.current = [...matchedRef.current, first, second];
        setMatched(matchedRef.current);
        if (matchedRef.current.length === round.deck.length) {
          finish();
          return;
        }
      }
      open.current = [];
      setFaceUp([]);
      busy.current = false;
    }, same ? 350 : 700);
  }

  useEffect(() => {
    const columns = 4;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setFocus((current) => Math.min(round.deck.length - 1, current + 1));
      if (event.key === "ArrowLeft") setFocus((current) => Math.max(0, current - 1));
      if (event.key === "ArrowDown") setFocus((current) => Math.min(round.deck.length - 1, current + columns));
      if (event.key === "ArrowUp") setFocus((current) => Math.max(0, current - columns));
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        flip(focus);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
        <div className="flex gap-3">
          <span className="flex items-center gap-1"><Zap className="h-4 w-4 text-primary" /> {Math.floor(flips.current.length / 2)} {t.games.moves}</span>
          <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {matched.length / 2}/{pairs}</span>
        </div>
        <GameTimer deadlineMs={deadlineMs} onTimeUp={finish} />
      </div>
      <p className="text-xs text-muted-foreground">{t.games.keyboardMemory}</p>
      <Progress value={(matched.length / round.deck.length) * 100} className="h-2" />
      <div className="grid grid-cols-4 gap-2" role="grid">
        {round.deck.map((emoji, index) => {
          const shown = faceUp.includes(index) || matched.includes(index);
          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              aria-label={shown ? emoji : t.games.hiddenCard}
              aria-pressed={shown}
              onClick={() => {
                setFocus(index);
                flip(index);
              }}
              className={cn(
                "flex aspect-square min-h-11 items-center justify-center rounded-xl border-2 text-2xl sm:text-3xl",
                matched.includes(index) && "border-primary/40 bg-primary/10",
                shown && !matched.includes(index) && "border-primary bg-card",
                !shown && "border-border bg-muted",
                focus === index && "ring-2 ring-primary",
              )}
            >
              {shown ? emoji : "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
