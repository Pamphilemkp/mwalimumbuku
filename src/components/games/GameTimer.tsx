"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/src/lib/utils";
import { Timer } from "lucide-react";

interface Props {
  deadlineMs: number;
  onTimeUp: () => void;
}

export default function GameTimer({ deadlineMs, onTimeUp }: Props) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)));
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const left = deadlineMs - Date.now();
      setRemaining(Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0 && !fired) {
        fired = true;
        onTimeUpRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [deadlineMs]);

  const totalRef = useRef(Math.max(1, Math.ceil((deadlineMs - Date.now()) / 1000)));
  const pct = Math.min(100, (remaining / totalRef.current) * 100);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isLow = remaining <= 10;

  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <Timer className={cn("h-4 w-4", isLow ? "text-destructive animate-pulse" : "text-muted-foreground")} />
      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", isLow ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("font-mono text-xs font-bold tabular-nums", isLow ? "text-destructive" : "text-foreground")}>
        {mins}:{secs.toString().padStart(2, "0")}
      </span>
    </div>
  );
}
