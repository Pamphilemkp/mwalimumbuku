"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { Check, Star } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import { MIN_GAP_MS, foldWord, type Round } from "@/lib/games/engine";
import GameTimer from "./GameTimer";
import { useStamps } from "./useStamps";
import { fill, GameGuide, GameHud, PlaySurface, ResultBanner, type Banner } from "./GameChrome";

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
  const [banner, setBanner] = useState<Banner | null>(null);
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
    if (correct) {
      setScore((current) => {
        const next = current + 20;
        setBanner({
          tone: "correct",
          text: `${fill(t.games.feedback.correctPlus, { n: 20 })} ${fill(t.games.feedback.scoreNow, { n: next })}`,
        });
        return next;
      });
    } else {
      setBanner({
        tone: "wrong",
        text: `${t.games.wrongAnswer}. ${t.games.theWordWas} ${item.word}. ${t.games.feedback.noPoints} ${fill(t.games.feedback.scoreNow, { n: score })}`,
      });
    }
    window.setTimeout(() => {
      if (guesses.current.length >= round.rounds.length) finish();
      else {
        setIndex((current) => current + 1);
        setGuess("");
        setBanner(null);
        busy.current = false;
      }
    }, 1200);
  }

  return (
    <div className="min-w-0 max-w-full space-y-3">
      <GameGuide game="words" />
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
      {item ? (
        <PlaySurface>
          <p className="text-center text-sm text-muted-foreground">{lang === "fr" ? item.hintFr : item.hintEn}</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {[...item.scrambled].map((letter, letterIndex) => (
              <span key={`${letter}-${letterIndex}`} className="flex h-11 w-8 items-center justify-center rounded-lg bg-primary/10 text-base font-bold text-primary sm:w-11 sm:text-lg">
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
              className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-background px-3"
              autoCapitalize="characters"
            />
            <Button type="button" className="h-12 w-12" onClick={checkAnswer} disabled={guess.trim().length === 0 || busy.current} aria-label={t.games.answer}>
              <Check className="h-5 w-5" />
            </Button>
          </div>
          {banner ? <ResultBanner tone={banner.tone}>{banner.text}</ResultBanner> : null}
        </PlaySurface>
      ) : null}
    </div>
  );
}
