"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { cn } from "@/src/lib/utils";
import { Star } from "lucide-react";
import { Progress } from "@/src/components/ui/progress";
import { MIN_GAP_MS, replayTypingWord, type Round } from "@/lib/games/engine";
import GameTimer from "./GameTimer";
import { useStamps } from "./useStamps";

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
  const logs = useRef<string[][]>(round.words.map(() => []));
  const done = useRef(false);
  const { mark, stamps } = useStamps(MIN_GAP_MS.typing);
  const word = round.words[index] ?? "";

  function finish() {
    if (done.current) return;
    done.current = true;
    onComplete({ game: "typing", keys: logs.current, atMs: stamps.current });
  }

  function pushKey(key: string, nextInput: string) {
    if (done.current || mark() === null) return false;
    logs.current[index] = [...logs.current[index], key];
    setInput(nextInput);
    const replay = replayTypingWord(word, logs.current[index]);
    if (replay) {
      setErrors(logs.current.reduce((sum, keys, wordIndex) => {
        const result = replayTypingWord(round.words[wordIndex], keys);
        return sum + (result?.errors ?? 0);
      }, 0));
      setCorrected(logs.current.reduce((sum, keys, wordIndex) => {
        const result = replayTypingWord(round.words[wordIndex], keys);
        return sum + (result?.corrected ?? 0);
      }, 0));
    }
    if (nextInput === word) {
      const nextIndex = index + 1;
      if (nextIndex >= round.words.length) finish();
      else {
        setIndex(nextIndex);
        setInput("");
      }
    }
    return true;
  }

  function onChange(value: string) {
    if (done.current) return;
    if (value.length === input.length + 1 && value.startsWith(input)) {
      pushKey(value[value.length - 1], value);
      return;
    }
    if (value.length === input.length - 1 && input.startsWith(value)) {
      pushKey("\b", value);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
        <span>{t.games.word} {Math.min(index + 1, round.words.length)}/{round.words.length}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Star className="h-4 w-4 text-secondary" /> {index}</span>
          <GameTimer deadlineMs={deadlineMs} onTimeUp={finish} />
        </div>
      </div>
      <Progress value={(index / round.words.length) * 100} className="h-2" />
      {word ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4 text-center sm:p-8">
          <p className="text-sm text-muted-foreground">{t.games.typeWord}</p>
          <div className="flex flex-wrap justify-center gap-1">
            {[...word].map((character, characterIndex) => (
              <span
                key={`${character}-${characterIndex}`}
                className={cn(
                  "flex h-11 w-8 items-center justify-center rounded-lg text-lg font-bold",
                  characterIndex < input.length
                    ? input[characterIndex] === character
                      ? "bg-primary/20 text-primary"
                      : "bg-destructive/20 text-destructive"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {character}
              </span>
            ))}
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
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {t.games.errors}: {errors} · {t.games.corrected}: {corrected}
          </p>
        </div>
      ) : null}
    </div>
  );
}
