import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { alerts, fmt, type Filters, type Kpi, type PlantAlert, type Tone } from "./data";

/** How often the live KPIs refresh. */
export const LIVE_MS = 10_000;

/** Per-tick volatility as a fraction of the KPI's base value (default 1 %). */
const VOL: Record<string, number> = {
  "Metal output": 0.012, "Pots online": 0.003, "Current efficiency": 0.004,
  "Specific energy": 0.006, "Power draw": 0.01, "Water intake": 0.015,
  "Power factor": 0.002, "Grid frequency": 0.0006, "Recycled water": 0.004, "Cooling supply temp": 0.006,
  "Discharge pH": 0.005, "Metal purity": 0.0003, "First-pass yield": 0.002, OEE: 0.004,
  "On-time delivery": 0.003, "Export share": 0.004,
};
const DEFAULT_VOL = 0.01;
// Values that should not flicker (crew size, loop counts, bake cycle) and real counts that must stay truthful
VOL["Operators on shift"] = 0; VOL["Active control loops"] = 0; VOL["Fire cycle"] = 0;
VOL["Active alerts"] = 0; VOL["Critical"] = 0; VOL["Marked as done"] = 0;
const PULL = 0.3; // mean reversion per tick, keeps values near their plan
const SPARK_LEN = 14;

/* ---------- live alert feed: simulated alerts raised while the dashboard is open ---------- */
const MAX_FEED = 12;
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const int = (lo: number, hi: number) => Math.round(lo + Math.random() * (hi - lo));
const POOL: (() => Omit<PlantAlert, "id" | "time" | "born">)[] = [
  () => ({ cat: "Production", sev: "Critical", title: `Anode effect on pot 3-${int(1, 119)}`, source: "Potline 3", value: `Cell voltage ${(7 + Math.random() * 2).toFixed(1)} V`, area: "Potline 3" }),
  () => ({ cat: "Production", sev: "Info", title: `Bath temperature drifting up on pot 1-${int(1, 120)}`, source: "Potline 1", value: `${int(970, 978)} °C`, area: "Potline 1" }),
  () => ({ cat: "Production", sev: "OK", title: `Pot 2-${int(1, 119)} anode effect cleared`, source: "Potline 2", value: `Cell voltage ${(4.1 + Math.random() * 0.1).toFixed(2)} V`, area: "Potline 2" }),
  () => ({ cat: "Production", sev: "Info", title: `Casthouse furnace F-${int(1, 6)} holding temperature low`, source: "Casthouse", value: `${int(728, 736)} °C`, area: "Plant-wide" }),
  () => ({ cat: "Power", sev: "Critical", title: `Rectifier R-${int(1, 6)} transformer oil temperature high`, source: "Substation", value: `${int(85, 90)} °C (limit 85)`, area: "Plant-wide" }),
  () => ({ cat: "Power", sev: "Info", title: "Power factor below target on 33 kV bus", source: "Substation", value: `${(0.93 + Math.random() * 0.019).toFixed(3)} (target 0.95)`, area: "Plant-wide" }),
  () => ({ cat: "Power", sev: "OK", title: `Rectifier R-${int(1, 6)} returned to service`, source: "Potlines", value: `Load ${int(105, 120)} MW`, area: "Plant-wide" }),
  () => ({ cat: "Water", sev: "Info", title: `Cooling tower CT-${int(1, 4)} conductivity rising`, source: "Cooling circuit", value: `${int(1750, 1950).toLocaleString("en-US")} µS/cm`, area: "Plant-wide" }),
  () => ({ cat: "Water", sev: "Critical", title: "Clarifier overflow level high", source: "Water treatment", value: `Level ${int(92, 97)} %`, area: "Plant-wide" }),
  () => ({ cat: "Water", sev: "OK", title: "Discharge pH back in range", source: "Effluent", value: `pH ${(7.2 + Math.random() * 0.6).toFixed(1)}`, area: "Plant-wide" }),
  () => ({ cat: "Quality", sev: "Info", title: `Lot ${int(24640, 24700)} awaiting retest`, source: "Laboratory", value: `Fe 0.0${int(88, 99)} %`, area: "Plant-wide" }),
  () => ({ cat: "Quality", sev: "OK", title: `P0610 lot ${int(24640, 24700)} released after retest`, source: "Laboratory", value: `Purity 99.${int(80, 89)} %`, area: "Plant-wide" }),
  () => ({ cat: "Equipment", sev: "Info", title: `Intake pump P-10${int(1, 3)} vibration above normal`, source: "Nile intake", value: `${(4.8 + Math.random() * 1.2).toFixed(1)} mm/s`, area: "Plant-wide" }),
  () => ({ cat: "Equipment", sev: "Critical", title: `Ball mill M-0${int(1, 2)} motor current high`, source: "Alumina milling", value: `${int(422, 440)} A (limit 420)`, area: "Plant-wide" }),
];
const ageLabel = (ms: number) => (ms < 60_000 ? "just now" : `${Math.floor(ms / 60_000)} min ago`);

/* ---------- shared clock: one timer drives every tab, the topbar countdown and the live feeds ---------- */
interface Clock { tick: number; nextAt: number; feed: PlantAlert[]; seq: number }
const LiveCtx = createContext<Clock>({ tick: 0, nextAt: Date.now() + LIVE_MS, feed: [], seq: 0 });

export function LiveProvider({ children }: { children: ReactNode }) {
  const [clock, setClock] = useState<Clock>(() => ({ tick: 0, nextAt: Date.now() + LIVE_MS, feed: [], seq: 0 }));
  useEffect(() => {
    const id = setInterval(() => setClock((c) => {
      const raise = Math.random() < 0.6;
      const now = Date.now();
      const feed = raise ? [{ ...pick(POOL)(), id: `ALM-${9000 + c.seq}`, time: "just now", born: now }, ...c.feed].slice(0, MAX_FEED) : c.feed;
      return { tick: c.tick + 1, nextAt: now + LIVE_MS, feed, seq: c.seq + (raise ? 1 : 0) };
    }), LIVE_MS);
    return () => clearInterval(id);
  }, []);
  return <LiveCtx.Provider value={clock}>{children}</LiveCtx.Provider>;
}

/** The alert register: the seeded alerts plus any raised live, newest first, with ages that keep counting. */
export function useAlerts(f: Filters): PlantAlert[] {
  const { feed, tick } = useContext(LiveCtx);
  return useMemo(() => {
    const now = Date.now();
    const live = feed.filter((a) => f.area === "All plant" || a.area === f.area || a.area === "Plant-wide").map((a) => ({ ...a, time: ageLabel(now - (a.born ?? now)) }));
    return [...live, ...alerts(f)];
    // tick is not read inside, it only refreshes the "x min ago" labels
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, feed, tick]);
}

/** Topbar chip: "Next refresh in 7s" with a draining progress bar. */
export function LiveCountdown() {
  const { nextAt } = useContext(LiveCtx);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [nextAt]);
  const left = Math.max(0, nextAt - now);
  return (
    <div className="countdown" title={`KPIs refresh every ${LIVE_MS / 1000} seconds`}>
      <span>Next refresh in <b>{Math.ceil(left / 1000)}s</b></span>
      <div className="countdown-bar"><i style={{ width: `${(left / LIVE_MS) * 100}%` }} /></div>
    </div>
  );
}

/* ---------- live KPIs ---------- */
const num = (s: string) => Number(s.replace(/,/g, ""));
const decimals = (s: string) => s.split(".")[1]?.length ?? 0;
const cap = (k: Kpi) => { const m = /^of (\d+)/.exec(k.unit); return m ? Number(m[1]) : k.unit === "%" ? 100 : Infinity; };

interface LiveState { cur: number[]; spark: number[][]; at: Date }

const init = (base: Kpi[]): LiveState => ({ cur: base.map((k) => num(k.value)), spark: base.map((k) => k.spark), at: new Date() });

function step(s: LiveState, base: Kpi[]): LiveState {
  const cur = s.cur.map((v, i) => {
    const k = base[i], b = num(k.value), d = decimals(k.value);
    const vol = VOL[k.label] ?? DEFAULT_VOL;
    if (vol === 0) return v;
    // never smaller than one display unit, so small whole numbers and 1-decimal values still visibly move
    const amp = Math.max(vol * Math.abs(b), 10 ** -d);
    const next = v + (b - v) * PULL + (Math.random() - 0.5) * 2 * amp;
    return +Math.min(next, cap(k)).toFixed(d);
  });
  // new point = typical level of this sparkline x live/base, so it works for 1-based and raw-count sparklines
  const spark = s.spark.map((sp, i) => {
    const level = sp.reduce((a, v) => a + v, 0) / (sp.length || 1);
    return [...sp.slice(-(SPARK_LEN - 1)), level * (cur[i] / (num(base[i].value) || 1))];
  });
  return { cur, spark, at: new Date() };
}

/**
 * Takes deterministic KPIs and returns a copy whose value, delta and sparkline move on every
 * shared tick. `base` must be referentially stable (memoised); it resets when it changes.
 */
export function useLiveKpis(base: Kpi[]) {
  const { tick } = useContext(LiveCtx);
  const [state, setState] = useState(() => init(base));
  const [seen, setSeen] = useState(base);
  if (seen !== base) { setSeen(base); setState(init(base)); }

  const handled = useRef(tick);
  useEffect(() => {
    if (handled.current === tick) return;
    handled.current = tick;
    setState((s) => step(s, base));
  }, [tick, base]);

  const kpis = base.map((k, i) => {
    const b = num(k.value), d = decimals(k.value);
    return { ...k, value: fmt(state.cur[i], d), delta: k.delta + ((state.cur[i] - b) / (b || 1)) * 100, spark: state.spark[i] };
  });
  return { kpis, updatedAt: state.at };
}

/** Live version of plain `{label, value, unit}` stat tiles (stage KPIs on the process tabs). */
export interface Stat { label: string; value: string; unit: string }
export function useLiveStats(stats: Stat[]): Stat[] {
  const base = useMemo<Kpi[]>(() => stats.map((s) => ({ ...s, delta: 0, spark: [1], color: "", icon: "", note: "" })), [stats]);
  return useLiveKpis(base).kpis.map(({ label, value, unit }) => ({ label, value, unit }));
}

/** Live load and temperature for an equipment table; tone/status follow the load. */
export interface EqRow { load: number; temp: number; tone: Tone; status: string }
export function useLiveEquipment<T extends EqRow>(rows: T[]): T[] {
  const { tick } = useContext(LiveCtx);
  const [live, setLive] = useState(() => rows.map(({ load, temp }) => ({ load, temp })));
  const [seen, setSeen] = useState(rows);
  if (seen !== rows) { setSeen(rows); setLive(rows.map(({ load, temp }) => ({ load, temp }))); }

  const handled = useRef(tick);
  useEffect(() => {
    if (handled.current === tick) return;
    handled.current = tick;
    setLive((cur) => cur.map((c, i) => ({
      load: Math.round(Math.min(100, Math.max(20, c.load + (rows[i].load - c.load) * PULL + (Math.random() - 0.5) * 8))),
      temp: Math.round(Math.max(20, c.temp + (rows[i].temp - c.temp) * PULL + (Math.random() - 0.5) * 3)),
    })));
  }, [tick, rows]);

  return rows.map((r, i) => {
    const load = live[i].load, tone: Tone = load > 92 ? "bad" : load > 85 ? "warn" : "good";
    return { ...r, load, temp: live[i].temp, tone, status: tone === "good" ? "Normal" : tone === "warn" ? "Watch" : "High load" };
  });
}

/* ---------- shipment register: one new shipment is booked on every tick, existing rows are left alone ---------- */
export interface Shipment { id: string; status: string; tone: Tone; tonnes: number; eta: string }
const SHIP_TONE: Record<string, Tone> = { Delivered: "good", Delayed: "bad", Loading: "warn", "In transit": "info", Scheduled: "mute" };
const NEW_STATUS = ["Scheduled", "Scheduled", "Loading", "In transit"];
const MAX_SHIPMENTS = 40; // oldest rows fall off the bottom

export function useLiveShipments<T extends Shipment>(base: T[]): { rows: T[]; fresh: Set<string> } {
  const { tick } = useContext(LiveCtx);
  const [state, setState] = useState<{ rows: T[]; fresh: Set<string>; seq: number }>(() => ({ rows: base, fresh: new Set(), seq: 0 }));
  const [seen, setSeen] = useState(base);
  if (seen !== base) { setSeen(base); setState({ rows: base, fresh: new Set(), seq: 0 }); }

  const handled = useRef(tick);
  useEffect(() => {
    if (handled.current === tick) return;
    handled.current = tick;
    setState((s) => {
      if (!s.rows.length) return s;
      const tpl = pick(s.rows), status = pick(NEW_STATUS), day = new Date(Date.now() + int(2, 12) * 864e5);
      const id = `SH-${89000 + s.seq}`;
      const row = { ...tpl, id, status, tone: SHIP_TONE[status], tonnes: int(120, 1000), eta: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
      return { rows: [row, ...s.rows].slice(0, MAX_SHIPMENTS), fresh: new Set([id]), seq: s.seq + 1 };
    });
  }, [tick]);

  return { rows: state.rows, fresh: state.fresh };
}
