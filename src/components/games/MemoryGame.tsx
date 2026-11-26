"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { cn } from "@/src/lib/utils";
import { Star, Zap } from "lucide-react";
import { Progress } from "@/src/components/ui/progress";
import { MIN_GAP_MS, type Round } from "@/lib/games/engine";
import GameTimer from "./GameTimer";
import { useStamps } from "./useStamps";
import { fill, GameGuide, GameHud, PlaySurface, ResultBanner, type Banner } from "./GameChrome";

function liveScore(matches: number, moves: number, cleared: boolean) {
  return cleared ? Math.max(100 - moves * 2, 20) : matches * 5;
}

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
  const [wave, setWave] = useState(0);
  const [faceUp, setFaceUp] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [focus, setFocus] = useState(0);
  const [moves, setMoves] = useState(0);
  const [found, setFound] = useState(0);
  const [banner, setBanner] = useState<Banner | null>(null);
  const flips = useRef<number[]>([]);
  const open = useRef<number[]>([]);
  const matchedRef = useRef<number[]>([]);
  const busy = useRef(false);
  const done = useRef(false);
  const waveRef = useRef(0);
  const focusRef = useRef(0);
  const movesRef = useRef(0);
  const foundRef = useRef(0);
  const { mark, stamps } = useStamps(MIN_GAP_MS.memory);
  const deck = round.waves[wave] ?? [];
  const totalPairs = round.waves.reduce((sum, item) => sum + item.length / 2, 0);
  const clearedCards = round.waves.slice(0, wave).reduce((sum, item) => sum + item.length, 0) + matched.length;

  function finish() {
    if (done.current) return;
    done.current = true;
    onComplete({ game: "memory", flips: flips.current, atMs: stamps.current.slice(0, flips.current.length) });
  }

  function flip(index: number) {
    const current = round.waves[waveRef.current];
    if (!current || done.current || busy.current || matchedRef.current.includes(index) || open.current.includes(index)) return;
    if (open.current.length >= 2 || mark() === null) return;
    const nextOpen = [...open.current, index];
    open.current = nextOpen;
    flips.current = [...flips.current, index];
    setFaceUp(nextOpen);
    if (nextOpen.length < 2) return;
    busy.current = true;
    const [first, second] = nextOpen;
    const same = current[first] === current[second];
    movesRef.current += 1;
    setMoves(movesRef.current);
    if (same) {
      foundRef.current += 1;
      setFound(foundRef.current);
      const nextMatched = [...matchedRef.current, first, second];
      matchedRef.current = nextMatched;
      setMatched(nextMatched);
      const cleared = nextMatched.length === current.length && waveRef.current === round.waves.length - 1;
      const score = liveScore(foundRef.current, movesRef.current, cleared);
      setBanner({
        tone: "correct",
        text: `${current[first]} ${t.games.feedback.matchFound} ${fill(t.games.feedback.pairsFound, { found: foundRef.current, total: totalPairs })} ${fill(t.games.feedback.scoreNow, { n: score })}`,
      });
      window.setTimeout(() => {
        if (nextMatched.length === current.length) {
          if (waveRef.current + 1 >= round.waves.length) {
            finish();
            return;
          }
          const nextIndex = waveRef.current + 1;
          const bigger = round.waves[nextIndex].length > current.length;
          waveRef.current = nextIndex;
          matchedRef.current = [];
          open.current = [];
          focusRef.current = 0;
          setWave(waveRef.current);
          setMatched([]);
          setFaceUp([]);
          setFocus(0);
          setBanner({
            tone: "info",
            text: bigger
              ? t.games.feedback.nextBoard
              : fill(t.games.feedback.boardOf, { n: nextIndex + 1, total: round.waves.length }),
          });
          busy.current = false;
          return;
        }
        open.current = [];
        setFaceUp([]);
        busy.current = false;
      }, 900);
      return;
    }
    setBanner({
      tone: "wrong",
      text: `${current[first]} + ${current[second]} — ${t.games.feedback.notAMatch} ${fill(t.games.feedback.scoreNow, { n: liveScore(foundRef.current, movesRef.current, false) })} ${t.games.feedback.noPoints}`,
    });
    window.setTimeout(() => {
      open.current = [];
      setFaceUp([]);
      busy.current = false;
    }, 900);
  }

  const flipRef = useRef(flip);
  flipRef.current = flip;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const length = round.waves[waveRef.current]?.length ?? 0;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
      }
      if (event.key === "ArrowRight") focusRef.current = Math.min(length - 1, focusRef.current + 1);
      if (event.key === "ArrowLeft") focusRef.current = Math.max(0, focusRef.current - 1);
      if (event.key === "ArrowDown") focusRef.current = Math.min(length - 1, focusRef.current + 4);
      if (event.key === "ArrowUp") focusRef.current = Math.max(0, focusRef.current - 4);
      if (event.key.startsWith("Arrow")) setFocus(focusRef.current);
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        flipRef.current(focusRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round.waves]);

  return (
    <div className="min-w-0 max-w-full space-y-3">
      <GameGuide game="memory" />
      <GameHud
        left={
          <>
            <span>{fill(t.games.feedback.boardOf, { n: Math.min(wave + 1, round.waves.length), total: round.waves.length })}</span>
            <span className="flex items-center gap-1"><Zap className="h-4 w-4 text-primary" /> {moves} {t.games.moves}</span>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {found}/{totalPairs}</span>
          </>
        }
        right={<GameTimer deadlineMs={deadlineMs} onTimeUp={finish} />}
      />
      <p className="text-xs text-muted-foreground">{t.games.keyboardMemory}</p>
      <Progress value={totalPairs === 0 ? 0 : (found / totalPairs) * 100} className="h-2 bg-muted" />
      <PlaySurface>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2" role="grid">
          {deck.map((emoji, index) => {
            const shown = faceUp.includes(index) || matched.includes(index);
            return (
              <button
                key={`${wave}-${index}`}
                type="button"
                role="gridcell"
                aria-label={shown ? emoji : t.games.hiddenCard}
                aria-pressed={shown}
                onClick={() => {
                  focusRef.current = index;
                  setFocus(index);
                  flip(index);
                }}
                className={cn(
                  "flex aspect-square min-h-11 min-w-0 items-center justify-center rounded-xl border-2 text-xl sm:text-3xl",
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
        {banner ? <ResultBanner tone={banner.tone}>{banner.text}</ResultBanner> : null}
      </PlaySurface>
      <p className="sr-only">{clearedCards}</p>
    </div>
  );
}
