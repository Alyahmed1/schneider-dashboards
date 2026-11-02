import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { rng } from "./data";

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

/** "Next refresh 7s" with a draining bar, shown in the top strip */
export function LiveCountdown() {
  const { nextAt } = useContext(Ctx);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(id); }, []);
  const left = Math.max(0, nextAt - now);
  return (
    <div className="countdown" aria-label="Next data refresh">
      <span>Next refresh</span><b>{Math.ceil(left / 1000)}s</b>
      <span className="countdown-bar"><i style={{ width: `${(left / LIVE_MS) * 100}%` }} /></span>
    </div>
  );
}

/** small pill next to the filters: when the numbers refresh next */
export function LivePill() {
  return (
    <div className="live-pill" title={`Numbers refresh every ${LIVE_MS / 1000} seconds`}>
      <i className="live-dot" />
      <LiveCountdown />
    </div>
  );
}

export const WOBBLE_GAIN = 2.5; // raise to make live numbers move more on every update
/** small repeatable change per refresh, so numbers visibly move */
export function wobble(base: number, seed: number, t: number, pct = 0.01) {
  const r = rng(seed * 9973 + t * 7919)();
  return base * (1 + (r - 0.5) * 2 * pct * WOBBLE_GAIN);
}

/** same as wobble, but a percentage can never read above 100 */
export function wobbleCapped(base: number, seed: number, t: number, pct: number, unit = "") {
  const v = wobble(base, seed, t, pct);
  return unit.includes("%") ? Math.min(100, v) : v;
}
