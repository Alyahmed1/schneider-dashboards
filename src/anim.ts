import { useEffect, useState } from "react";

const REDUCE = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** false for a moment after a tab opens, then true: bars, rings and dials start empty and grow to their value */
export function useGrow(delay = 300) {
  const [on, setOn] = useState(REDUCE);
  useEffect(() => {
    if (REDUCE) return;
    const id = window.setTimeout(() => setOn(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);
  return on;
}
