import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const LIVE_MS = 10000;
interface LiveState { tick: number; nextAt: number }
const Ctx = createContext<LiveState>({ tick: 0, nextAt: Date.now() + LIVE_MS });

/** one shared 10-second heartbeat for the whole dashboard */
export function LiveProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<LiveState>(() => ({ tick: 0, nextAt: Date.now() + LIVE_MS }));
  useEffect(() => {
    const id = window.setInterval(() => setS((p) => ({ tick: p.tick + 1, nextAt: Date.now() + LIVE_MS })), LIVE_MS);
    return () => window.clearInterval(id);
  }, []);
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}

export const useTick = () => useContext(Ctx).tick;

/** small seeded random so sample numbers are repeatable */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

export const WOBBLE_GAIN = 2.5; // raise to make live numbers move more on every update
/** small repeatable change per refresh, so numbers visibly move */
export function wobble(base: number, seed: number, t: number, pct = 0.01) {
  const r = rng(seed * 9973 + t * 7919)();
  return base * (1 + (r - 0.5) * 2 * pct * WOBBLE_GAIN);
}

/** "Live · next refresh 7s" with a draining bar */
export function LivePill() {
  const { nextAt } = useContext(Ctx);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(id); }, []);
  const left = Math.max(0, nextAt - now);
  return (
    <div className="live-pill" title={`Sample numbers refresh every ${LIVE_MS / 1000} seconds`}>
      <i className="live-dot" /><span>Live</span><b>{Math.ceil(left / 1000)}s</b>
      <span className="live-bar"><i style={{ width: `${(left / LIVE_MS) * 100}%` }} /></span>
    </div>
  );
}
