"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useLanguage } from "@/src/i18n/LanguageContext";

export type GameId = "memory" | "words" | "math" | "alphabet" | "colors" | "typing";
export type Banner = { tone: "correct" | "wrong" | "info"; text: string };

export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

export function GameGuide({ game }: { game: GameId }) {
  const { t } = useLanguage();
  const copy = t.games.coach[game];
  const labels = t.games.coachLabels;
  const rows = [
    [labels.goal, copy.goal],
    [labels.correct, copy.correct],
    [labels.scoring, copy.scoring],
    [labels.retry, copy.retry],
  ];
  return (
    <div className="grid min-w-0 grid-cols-1 gap-1.5 rounded-xl bg-muted/70 px-3 py-2.5 text-xs leading-snug text-foreground sm:grid-cols-2 sm:text-sm">
      {rows.map(([label, text]) => (
        <p key={label} className="min-w-0 break-words">
          <span className="font-semibold">{label}.</span> {text}
        </p>
      ))}
    </div>
  );
}

export function ResultBanner({ tone, children }: { tone: Banner["tone"]; children: ReactNode }) {
  const Icon = tone === "correct" ? CheckCircle2 : tone === "wrong" ? XCircle : Info;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-w-0 items-start gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium leading-snug text-foreground",
        tone === "correct" && "border-primary/40 bg-primary/10",
        tone === "wrong" && "border-destructive/40 bg-destructive/10",
        tone === "info" && "border-border bg-muted",
      )}
    >
      <Icon
        className={cn("mt-0.5 h-5 w-5 shrink-0", tone === "correct" && "text-primary", tone === "wrong" && "text-destructive", tone === "info" && "text-accent")}
        aria-hidden
      />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

export function GameHud({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">{left}</div>
      <div className="flex items-center gap-3">{right}</div>
    </div>
  );
}

export function PlaySurface({ children }: { children: ReactNode }) {
  return <div className="min-w-0 space-y-4 rounded-2xl border border-border bg-gradient-to-b from-card to-muted/30 p-3 shadow-sm sm:p-6">{children}</div>;
}
