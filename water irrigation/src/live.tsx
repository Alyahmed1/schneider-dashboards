import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { rng } from "./farm";

export const LIVE_MS = 10000;
const Ctx = createContext(0);

/** one shared 10-second heartbeat for the whole dashboard */
export function LiveProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), LIVE_MS);
    return () => window.clearInterval(id);
  }, []);
  return <Ctx.Provider value={tick}>{children}</Ctx.Provider>;
}
export const useTick = () => useContext(Ctx);

/** a small repeatable change on every refresh, so live numbers visibly move */
export function wobble(base: number, seed: number, t: number, pct = 0.01) {
  const r = rng(seed * 9973 + t * 7919)();
  return base * (1 + (r - 0.5) * 2 * pct * 2.5);
}
