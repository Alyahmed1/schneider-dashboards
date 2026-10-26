import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { buildAlerts, rng, type Alert, type Filters, type Kpi } from "./data";

export const LIVE_MS = 10000;

interface LiveState { tick: number; at: Date; nextAt: number }
const Ctx = createContext<LiveState>({ tick: 0, at: new Date(), nextAt: Date.now() + LIVE_MS });

export function LiveProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<LiveState>(() => ({ tick: 0, at: new Date(), nextAt: Date.now() + LIVE_MS }));
  useEffect(() => {
    const t = setInterval(() => setS((p) => ({ tick: p.tick + 1, at: new Date(), nextAt: Date.now() + LIVE_MS })), LIVE_MS);
    return () => clearInterval(t);
  }, []);
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}

export const useTick = () => useContext(Ctx);

/** Small deterministic jitter per refresh so KPI values visibly move. */
export const jitter = (key: string, tick: number, base: number, pct = 0.012) =>
  tick === 0 ? base : base * (1 + (rng(`${key}|${tick}`)() - 0.5) * 2 * pct);

export function useLiveKpis(base: Kpi[]) {
  const { tick, at } = useTick();
  const kpis = useMemo(() => base.map((k) => ({ ...k, num: jitter(k.id + k.label, tick, k.num, k.id === "bay" ? 0 : 0.012) })), [base, tick]);
  return { kpis, updatedAt: at };
}

export function useAlerts(f: Filters): Alert[] {
  const { tick } = useTick();
  return useMemo(() => buildAlerts(f, tick), [f.line, f.range, f.shift, tick]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function LiveCountdown() {
  const { nextAt } = useTick();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const left = Math.max(0, nextAt - now);
  return (
    <div className="countdown" aria-label="Next data refresh">
      <span>Next refresh</span><b>{Math.ceil(left / 1000)}s</b>
      <span className="countdown-bar"><i style={{ width: `${(left / LIVE_MS) * 100}%` }} /></span>
    </div>
  );
}

/** Nudges one numeric field of every row on each refresh, so charts keep moving. Recharts animates the change. */
export function useLiveRows<T extends object>(rows: T[], field: keyof T & string, key: string, pct = 0.015, dp = 1): T[] {
  const { tick } = useTick();
  return useMemo(() => {
    if (tick === 0) return rows;
    const m = 10 ** dp;
    return rows.map((r, i) => {
      const v = Number(r[field]);
      const nv = Math.round(jitter(`${key}|${i}`, tick, v, pct) * m) / m;
      return { ...r, [field]: nv };
    });
  }, [rows, tick]); // eslint-disable-line react-hooks/exhaustive-deps
}
