import { useEffect, useRef, useState } from "react";

/**
 * Returns true briefly when score (or rank) changes to a different value
 * after the first render, so the UI can show a subtle "rescored" cue.
 * It is purely presentational: it compares values already delivered by
 * realtime / polling loads and invents no scoring behavior of its own.
 */
export function useScoreChanged(score: number | null | undefined, rank?: number | null | undefined, holdMs = 4000) {
  const [changed, setChanged] = useState(false);
  const prev = useRef<{ score: number | null | undefined; rank: number | null | undefined } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const p = prev.current;
    prev.current = { score, rank };
    if (p === null || p.score == null || score == null) return;
    if (p.score === score && p.rank === rank) return;
    setChanged(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setChanged(false), holdMs);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [score, rank, holdMs]);

  return changed;
}
