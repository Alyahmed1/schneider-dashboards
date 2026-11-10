import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Container, Droplet, Droplets, Gauge, Sprout, TriangleAlert, Wheat, WifiOff, type LucideIcon } from "lucide-react";
import { annular, compass, pt } from "./geo";
import { RINGS, cellKind, underRings } from "./field";
import { activeAlarms, avg, flowNow, statusOf, type Fleet, type PivotState, type Status } from "./model";
import { PIVOTS, type Pivot, type PivotId } from "./pivots";
import { clockOf } from "./alarmdata";

/** Tab 1: the four pivots as circles in a fixed 2x2 layout over the farmland, a chip under each, and the fleet totals on top */

const REDUCE = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function useCount(v: number, ms = 900) {
  const [x, setX] = useState(REDUCE ? v : 0);
  const from = useRef(REDUCE ? v : 0);
  useEffect(() => {
    if (REDUCE) { setX(v); return; }
    const t0 = performance.now(), a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const val = a + (v - a) * (1 - Math.pow(1 - k, 3));
      from.current = val; setX(val);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [v, ms]);
  return x;
}
export const Num = ({ v, dec = 0 }: { v: number; dec?: number }) => <>{useCount(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })}</>;

function Kpi({ icon: Icon, label, value, unit, tone, i, onClick }: { icon: LucideIcon; label: string; value: number; unit: string; tone?: "warn" | "good"; i: number; onClick?: () => void }) {
  const inner = (<><Icon size={26} className="kpi-ic" /><div><span>{label}</span><b><Num v={value} />{unit && <small>{unit}</small>}</b></div></>);
  return onClick
    ? <button className={`kpi click ${tone ?? ""}`} style={{ ["--i" as string]: i }} onClick={onClick} aria-label={`${label}: ${value}, open the alarms`}>{inner}</button>
    : <div className={`kpi ${tone ?? ""}`} style={{ ["--i" as string]: i }}>{inner}</div>;
}

const SECT = 24, R = 108, C = 120, HUB = 0.12;
const rr = (i: number) => R * (HUB + (1 - HUB) * (i / RINGS));

const STATUS: Record<Status | "lost", string> = { on: "Running", off: "Idle", fault: "Fault", lost: "No signal" };

const Disc = memo(function Disc({ p }: { p: PivotState }) {
  const cells = useMemo(() => {
    const out: { d: string; ring: number; c: number }[] = [];
    for (let i = 0; i < RINGS; i++) for (let j = 0; j < SECT; j++) {
      out.push({ d: annular(C, C, rr(i), rr(i + 1), compass(j * (360 / SECT)), compass((j + 1) * (360 / SECT))), ring: i, c: (j + 0.5) * (360 / SECT) });
    }
    return out;
  }, []);
  const under = underRings(p);
  const st = p.link === "lost" ? "lost" : statusOf(p);
  const [ax, ay] = pt(C, C, R + 4, compass(p.angle));
  const [b0x, b0y] = pt(C, C, R, compass(p.angle - 6));
  const [b1x, b1y] = pt(C, C, R, compass(p.angle + 6));
  return (
    <svg className="disc" viewBox="0 0 240 240" aria-hidden>
      <circle cx={C} cy={C} r={R + 9} className={`disc-ring ${st}`} />
      <circle cx={C} cy={C} r={R + 3} className="disc-rim" />
      {cells.map((c, k) => <path key={k} d={c.d} className={`cell ${cellKind(p, under, c.ring, c.c)}`} />)}
      <path d={`M${C} ${C}L${b0x} ${b0y}L${b1x} ${b1y}Z`} className={`beam ${p.running ? "go" : ""}`} />
      <line x1={C} y1={C} x2={ax} y2={ay} className={`arm ${st}`} />
      <circle cx={C} cy={C} r={5} className="pf-hub" />
    </svg>
  );
});

function Stat({ icon: Icon, v, unit, label }: { icon: LucideIcon; v: number; unit: string; label: string }) {
  return (
    <div className="stat" title={label}>
      <Icon size={17} />
      <div><b><Num v={v} /><small>{unit}</small></b><span>{label}</span></div>
    </div>
  );
}

function Card({ p, meta, i, alerts: al, onOpen }: { p: PivotState; meta: Pivot; i: number; alerts: number; onOpen: () => void }) {
  const lost = p.link === "lost";
  const st = lost ? "lost" : statusOf(p);
  const Crop = meta.crop === "Wheat" ? Wheat : Sprout;
  const Badge = lost ? WifiOff : st === "fault" ? TriangleAlert : Activity;
  return (
    <button className={`pcard ${st} ${lost ? "lost" : ""}`} style={{ ["--i" as string]: i }} onClick={onOpen} aria-label={`Open pivot ${meta.id}, ${meta.crop}, ${STATUS[st]}`}>
      <div className="pc-disc"><Disc p={p} /></div>
      <div className="chip">
        <div className="chip-top">
          <b className="chip-id">{meta.id}</b>
          <span className="chip-crop"><Crop size={17} />{meta.crop} · {meta.stage}{lost ? ` · last seen ${clockOf(p.lastSeen)}` : ""}</span>
          <span className={`badge ${st}`}><Badge size={14} />{STATUS[st]}</span>
        </div>
        <div className="chip-stats">
          <Stat icon={Droplet} v={Math.round(p.fieldWater)} unit="%" label="Field water" />
          <Stat icon={Droplets} v={Math.round(p.usedToday)} unit="m³" label="Water today" />
          <Stat icon={Gauge} v={Math.round(flowNow(p))} unit="m³/h" label="Flow now" />
          {al > 0 && <div className="stat al" title="Alerts"><TriangleAlert size={17} /><div><b>{al}</b><span>{al === 1 ? "Alert" : "Alerts"}</span></div></div>}
        </div>
      </div>
    </button>
  );
}

export default function Overview({ fleet, onOpen, onAlarms }: { fleet: Fleet; onOpen: (id: PivotId) => void; onAlarms: () => void }) {
  const ps = PIVOTS.map((m) => fleet.pivots[m.id]);
  const running = ps.filter((p) => statusOf(p) === "on" && p.link === "ok").length;
  const flow = ps.reduce((s, p) => s + (p.link === "ok" ? flowNow(p) : 0), 0);
  const used = ps.reduce((s, p) => s + p.usedToday, 0);
  const alerts = activeAlarms(fleet).length;
  return (
    <div className="ov">
      <div className="kpis">
        <Kpi i={0} icon={Activity} label="Pivots running" value={running} unit={`/ ${PIVOTS.length}`} tone={running ? "good" : undefined} />
        <Kpi i={1} icon={Gauge} label="Flow now" value={Math.round(flow)} unit="m³/h" />
        <Kpi i={2} icon={Droplets} label="Water today" value={Math.round(used)} unit="m³" />
        <Kpi i={3} icon={Container} label="Storage" value={Math.round(avg(fleet.storage))} unit="%" />
        <Kpi i={4} icon={TriangleAlert} label="Alerts" value={alerts} unit="" tone={alerts ? "warn" : undefined} onClick={onAlarms} />
      </div>
      <div className="grid">
        {PIVOTS.map((m, i) => <Card key={m.id} p={fleet.pivots[m.id]} meta={m} i={i + 2} alerts={activeAlarms(fleet, m.id).length} onOpen={() => onOpen(m.id)} />)}
      </div>
    </div>
  );
}
