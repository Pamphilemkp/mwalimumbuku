"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { cn } from "@/src/lib/utils";
import { Star } from "lucide-react";
import { Progress } from "@/src/components/ui/progress";
import { MIN_GAP_MS, replayTypingWord, type Round } from "@/lib/games/engine";
import GameTimer from "./GameTimer";
import { useStamps } from "./useStamps";
import { fill, GameGuide, GameHud, PlaySurface, ResultBanner, type Banner } from "./GameChrome";

export default function TypingGame({
  round,
  deadlineMs,
  onComplete,
}: {
  round: Extract<Round, { game: "typing" }>;
  deadlineMs: number;
  onComplete: (events: { game: "typing"; keys: string[][]; atMs: number[] }) => void;
}) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [errors, setErrors] = useState(0);
  const [corrected, setCorrected] = useState(0);
  const [banner, setBanner] = useState<Banner | null>(null);
  const logs = useRef<string[][]>(round.words.map(() => []));
  const done = useRef(false);
  const indexRef = useRef(0);
  const inputRef = useRef("");
  const { mark, stamps } = useStamps(MIN_GAP_MS.typing);
  const word = round.words[index] ?? "";

  function finish() {
    if (done.current) return;
    done.current = true;
    onComplete({ game: "typing", keys: logs.current, atMs: stamps.current });
  }

  function recount() {
    setErrors(logs.current.reduce((sum, keys, wordIndex) => {
      const result = replayTypingWord(round.words[wordIndex], keys);
      return sum + (result?.errors ?? 0);
    }, 0));
    setCorrected(logs.current.reduce((sum, keys, wordIndex) => {
      const result = replayTypingWord(round.words[wordIndex], keys);
      return sum + (result?.corrected ?? 0);
    }, 0));
  }

  function pushKey(key: string, nextInput: string) {
    const currentIndex = indexRef.current;
    const currentWord = round.words[currentIndex] ?? "";
    if (done.current || mark() === null) return false;
    logs.current[currentIndex] = [...logs.current[currentIndex], key];
    inputRef.current = nextInput;
    setInput(nextInput);
    recount();
    if (key !== "\b") {
      const place = [...nextInput].length - 1;
      const expected = [...currentWord][place];
      if (expected === undefined || key !== expected) {
        setBanner({
          tone: "wrong",
          text: `${fill(t.games.feedback.typedInstead, { typed: key, expected: expected ?? "—" })} ${t.games.feedback.typingScoreNote}`,
        });
      } else if (nextInput === currentWord) {
        setBanner({ tone: "correct", text: t.games.feedback.wordMatched });
      } else {
        setBanner({ tone: "correct", text: t.games.feedback.letterOk });
      }
    }
    if (nextInput === currentWord) {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= round.words.length) finish();
      else {
        indexRef.current = nextIndex;
        inputRef.current = "";
        setIndex(nextIndex);
        setInput("");
      }
    }
    return true;
  }

  function onChange(value: string) {
    if (done.current) return;
    const current = inputRef.current;
    if (value.length === current.length + 1 && value.startsWith(current)) {
      pushKey(value[value.length - 1], value);
      return;
    }
    if (value.length === current.length - 1 && current.startsWith(value)) {
      const removed = [...current].slice(-1)[0];
      const place = [...value].length;
      const expected = [...word][place];
      const accepted = pushKey("\b", value);
      if (accepted && removed !== expected) {
        setBanner({ tone: "info", text: `${t.games.feedback.mistakeFixed} ${fill(t.games.feedback.typedInstead, { typed: removed, expected: expected ?? "—" })}` });
      }
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-3">
      <GameGuide game="typing" />
      <GameHud
        left={<span>{t.games.word} {Math.min(index + 1, round.words.length)}/{round.words.length}</span>}
        right={
          <>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {index}</span>
            <GameTimer deadlineMs={deadlineMs} onTimeUp={finish} />
          </>
        }
      />
      <Progress value={(index / round.words.length) * 100} className="h-2 bg-muted" />
      {word ? (
        <PlaySurface>
          <p className="text-center text-sm text-muted-foreground">{t.games.typeWord}</p>
          <div className="flex flex-wrap justify-center gap-0.5">
            {[...word].map((character, characterIndex) => {
              const typed = [...input][characterIndex];
              const mismatch = typed !== undefined && typed !== character;
              return (
                <span
                  key={`${character}-${characterIndex}`}
                  className={cn(
                    "flex h-10 w-5 items-center justify-center rounded-md text-sm font-bold sm:h-11 sm:w-8 sm:text-lg",
                    typed === undefined && "bg-muted text-muted-foreground",
                    typed !== undefined && !mismatch && "bg-primary/20 text-primary",
                    mismatch && "bg-destructive/20 text-destructive",
                  )}
                >
                  {character}
                </span>
              );
            })}
          </div>
          <label className="sr-only" htmlFor="typing-input">{t.games.typeWord}</label>
          <input
            id="typing-input"
            value={input}
            onChange={(event) => onChange(event.target.value)}
            onPaste={(event) => event.preventDefault()}
            className="mx-auto block h-12 w-full max-w-xs rounded-lg border border-border bg-background px-4 text-center text-lg"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {banner ? <ResultBanner tone={banner.tone}>{banner.text}</ResultBanner> : null}
          <p className="text-center text-xs text-muted-foreground">
            {t.games.errors}: {errors} · {t.games.corrected}: {corrected}
          </p>
        </PlaySurface>
      ) : null}
    </div>
  );
}
