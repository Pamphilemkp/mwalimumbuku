"use client";

import { useRef } from "react";

export function useStamps(minGap: number) {
  const origin = useRef(typeof performance === "undefined" ? 0 : performance.now());
  const last = useRef(-minGap);
  const stamps = useRef<number[]>([]);

  function mark(): number | null {
    const next = Math.max(0, Math.round(performance.now() - origin.current));
    if (stamps.current.length > 0 && next - last.current < minGap) return null;
    last.current = next;
    stamps.current.push(next);
    return next;
  }

  function drop() {
    stamps.current.pop();
    last.current = stamps.current.length === 0 ? -minGap : stamps.current[stamps.current.length - 1];
  }

  return { mark, stamps, drop };
}
