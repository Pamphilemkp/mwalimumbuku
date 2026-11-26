"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { cn } from "@/src/lib/utils";
import { Star } from "lucide-react";
import { Progress } from "@/src/components/ui/progress";
import { MIN_GAP_MS, colorById, type Round } from "@/lib/games/engine";
import GameTimer from "./GameTimer";
import { useStamps } from "./useStamps";
import { fill, GameGuide, GameHud, PlaySurface, ResultBanner, type Banner } from "./GameChrome";

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
  const [banner, setBanner] = useState<Banner | null>(null);
  const picks = useRef<number[]>([]);
  const done = useRef(false);
  const busy = useRef(false);
  const { mark, stamps } = useStamps(MIN_GAP_MS.colors);
  const item = round.rounds[index];
  const stroop = Boolean(item && item.word !== item.ink);

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
    const ink = colorById(item.ink);
    const choice = colorById(item.options[optionIndex]);
    const inkName = (lang === "fr" ? ink?.nameFr : ink?.nameEn) ?? item.ink;
    const choiceName = (lang === "fr" ? choice?.nameFr : choice?.nameEn) ?? item.options[optionIndex];
    const correct = item.options[optionIndex] === item.ink;
    if (correct) {
      setScore((current) => {
        const next = current + 15;
        setBanner({ tone: "correct", text: `${fill(t.games.feedback.colorCorrect, { name: inkName })} ${fill(t.games.feedback.scoreNow, { n: next })}` });
        return next;
      });
    } else {
      setBanner({
        tone: "wrong",
        text: `${fill(t.games.feedback.colorWrong, { name: inkName, picked: choiceName })} ${fill(t.games.feedback.scoreNow, { n: score })}`,
      });
    }
    window.setTimeout(() => {
      if (picks.current.length >= round.rounds.length) finish();
      else {
        setIndex((current) => current + 1);
        setPicked(null);
        setBanner(null);
        busy.current = false;
      }
    }, 1000);
  }

  const chooseRef = useRef(choose);
  chooseRef.current = choose;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!/^[1-6]$/.test(event.key)) return;
      chooseRef.current(Number(event.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const word = item ? colorById(item.word) : null;
  const ink = item ? colorById(item.ink) : null;

  return (
    <div className="min-w-0 max-w-full space-y-3">
      <GameGuide game="colors" />
      <GameHud
        left={<span>{t.games.round} {Math.min(index + 1, round.rounds.length)}/{round.rounds.length}</span>}
        right={
          <>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {score}</span>
            <GameTimer deadlineMs={deadlineMs} onTimeUp={finish} />
          </>
        }
      />
      <Progress value={(index / round.rounds.length) * 100} className="h-2 bg-muted" />
      {item && word && ink ? (
        <PlaySurface>
          <p className="text-center text-sm font-medium text-foreground">{stroop ? t.games.stroopQuestion : t.games.colorQuestion}</p>
          <p className="text-center text-xs text-muted-foreground">{t.games.keyboardColors}</p>
          <p className="text-center text-4xl font-bold" style={{ color: ink.hex }}>{lang === "fr" ? word.nameFr : word.nameEn}</p>
          <div className="grid grid-cols-3 gap-2">
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
                    "flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-2",
                    picked === null && "border-border bg-card",
                    picked !== null && correct && "border-primary bg-primary/10",
                    picked === optionIndex && !correct && "border-destructive bg-destructive/10",
                  )}
                >
                  <span className="h-8 w-8 rounded-lg border border-border" style={{ backgroundColor: color?.hex }} />
                  <span className="text-xs font-semibold text-foreground">{optionIndex + 1}. {name}</span>
                </button>
              );
            })}
          </div>
          {banner ? <ResultBanner tone={banner.tone}>{banner.text}</ResultBanner> : null}
        </PlaySurface>
      ) : null}
    </div>
  );
}
