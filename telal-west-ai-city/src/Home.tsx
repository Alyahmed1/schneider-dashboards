import { useMemo, useState } from "react";
import { useStoryCmd } from "./storytour";
import { ArrowDown, ArrowUp, ArrowUpRight, Car, ClipboardList, Droplets, Gauge, Wrench, Zap, type LucideIcon } from "lucide-react";
import { ALERTS, BRIEF, ZONES, type TabId, type ZoneId } from "./data";
import MasterMap from "./MasterMap";
import { LivePill, useTick, wobble } from "./live";
import { zoneMw } from "./zonemodel";
import { waterNow } from "./watermodel";
import { freeSpaces, networkIndex, totalSpaces } from "./traffic";
import { ASSETS } from "./assetdata";
import { useWorkOrders } from "./workorders";
import { CountUp, Panel, useGrow } from "./ui";

/** the numbers printed in the brief */
const FACTS: { v: number; suffix?: string; label: string }[] = [
  { v: BRIEF.feddan, label: "feddan in total" },
  { v: BRIEF.residentialPct, suffix: "%", label: "residential" },
  { v: BRIEF.mixedPct, suffix: "%", label: "mixed-use" },
  { v: BRIEF.residentialFeddan, label: "feddan residential" },
  { v: BRIEF.commercialFeddan, label: "feddan commercial" },
];

const TOTAL = ZONES.reduce((s, z) => s + z.feddan, 0);
const C = 2 * Math.PI * 40;

/** the land use as a ring, one arc per zone, growing from empty */
function Donut({ grow, hover, onHover }: { grow: boolean; hover: ZoneId | null; onHover: (id: ZoneId | null) => void }) {
  let off = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 100 100" role="img" aria-label="Land use by zone">
        <circle className="donut-track" cx="50" cy="50" r="40" />
        {ZONES.map((z) => {
          const len = (z.feddan / TOTAL) * C, o = off; off += len;
          return (
            <circle key={z.id} className={`donut-arc ${hover === z.id ? "hot" : hover ? "dim" : ""}`} cx="50" cy="50" r="40" stroke={`var(${z.color})`}
              strokeDasharray={`${grow ? Math.max(0, len - 0.8) : 0} ${C}`} strokeDashoffset={-o} transform="rotate(-90 50 50)"
              onMouseEnter={() => onHover(z.id)} onMouseLeave={() => onHover(null)} />
          );
        })}
        <text x="50" y="49" textAnchor="middle" className="donut-v">{BRIEF.feddan}</text>
        <text x="50" y="60" textAnchor="middle" className="donut-l">feddan</text>
      </svg>
      <ul>
        {ZONES.map((z) => (
          <li key={z.id} className={hover === z.id ? "hot" : ""} onMouseEnter={() => onHover(z.id)} onMouseLeave={() => onHover(null)}>
            <i style={{ background: `var(${z.color})` }} /><span>{z.name}</span><b>{Math.round((z.feddan / TOTAL) * 100)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** a small line of the last twelve hours, drawing itself in */
function Spark({ pts, good }: { pts: number[]; good: boolean }) {
  const min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * 100, 27 - ((v - min) / span) * 24] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
      <path className="area" d={`${line} L100 30 L0 30Z`} style={{ fill: good ? "var(--good)" : "var(--bad)" }} />
      <path className="ln" d={line} pathLength={1} style={{ stroke: good ? "var(--good)" : "var(--bad)" }} />
    </svg>
  );
}

interface Kpi { id: string; icon: LucideIcon; label: string; value: number; dec: number; suffix: string; series: number[]; delta: number; deltaText: string; lowerBetter: boolean; tab: TabId }

/** Home: the whole community on one screen */
export default function Home({ go }: { go: (tab: TabId, target?: string) => void }) {
  const t = useTick();
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const { open: openOrders } = useWorkOrders();
  const grow = useGrow(350);
  const [hover, setHover] = useState<ZoneId | null>(null);
  const [selected, setSelected] = useState<ZoneId | null>(null);
  useStoryCmd((c, a) => { if (c === "home:zone") setHover((a || null) as ZoneId | null); });
  const [dims, setDims] = useState(true);
  const [neighbors, setNeighbors] = useState(true);
  const active = hover ?? selected;
  const zone = ZONES.find((z) => z.id === active) ?? null;

  const kpis: Kpi[] = useMemo(() => {
    const last12 = (f: (h: number) => number) => Array.from({ length: 12 }, (_, k) => f((((hour - 11 + k) % 24) + 24) % 24));
    const power = (h: number) => ZONES.reduce((s, z) => s + zoneMw(z.id, z.mw, h), 0);
    const atRisk = ASSETS.filter((a) => a.status !== "OK").length;
    const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
    // "vs yesterday" is a fixed sample change: the models repeat every day, so there is no real yesterday to compare with
    return [
      { id: "power", icon: Zap, label: "Power now", value: wobble(power(hour), 1, t, 0.01), dec: 1, suffix: " MW", series: last12(power), delta: -2.4, deltaText: pct(-2.4), lowerBetter: true, tab: "utilities" },
      { id: "water", icon: Droplets, label: "Water use", value: wobble(waterNow(hour), 7, t, 0.01), dec: 0, suffix: " m³/h", series: last12(waterNow), delta: 1.1, deltaText: pct(1.1), lowerBetter: true, tab: "utilities" },
      { id: "traffic", icon: Car, label: "Traffic flow", value: Math.min(100, wobble(networkIndex(hour) * 100, 21, t, 0.02)), dec: 0, suffix: "%", series: last12((h) => networkIndex(h) * 100), delta: -3.1, deltaText: pct(-3.1), lowerBetter: true, tab: "mobility" },
      { id: "parking", icon: Gauge, label: "Parking free", value: Math.min(100, wobble((freeSpaces(hour) / totalSpaces) * 100, 22, t, 0.03)), dec: 0, suffix: "%", series: last12((h) => (freeSpaces(h) / totalSpaces) * 100), delta: 4.2, deltaText: pct(4.2), lowerBetter: false, tab: "mobility" },
      { id: "risk", icon: Wrench, label: "Assets at risk", value: atRisk, dec: 0, suffix: ` of ${ASSETS.length}`, series: [8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, atRisk], delta: 1, deltaText: "+1", lowerBetter: true, tab: "assets" },
      { id: "wo", icon: ClipboardList, label: "Open work orders", value: openOrders, dec: 0, suffix: "", series: [2, 2, 3, 3, 3, 3, 4, 4, 3, 3, 3, openOrders], delta: -1, deltaText: "-1", lowerBetter: true, tab: "assets" },
    ];
  }, [t, hour, openOrders]);

  return (
    <div className="home">
      <div className="kstrip">
        {kpis.map((k, i) => {
          const good = k.lowerBetter ? k.delta < 0 : k.delta > 0;
          return (
            <button className="kcard" key={k.id} style={{ ["--n" as string]: i }} onClick={() => go(k.tab)} title={`Open ${k.tab}`}>
              <span className="kl"><k.icon size={14} />{k.label}</span>
              <b className="kv"><CountUp value={k.value} decimals={k.dec} suffix={k.suffix} ms={900} /></b>
              <Spark pts={k.series} good={good} />
              <span className={`kd ${good ? "good" : "bad"}`}>{k.delta > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{k.deltaText}<em> vs yesterday</em></span>
            </button>
          );
        })}
      </div>

      <Panel title="Master plan" className="map-panel" i={0} aside={
        <div className="map-tools">
          <button className={`chip ${dims ? "on" : ""}`} aria-pressed={dims} onClick={() => setDims(!dims)}>Boundary lengths</button>
          <button className={`chip ${neighbors ? "on" : ""}`} aria-pressed={neighbors} onClick={() => setNeighbors(!neighbors)}>Neighbours</button>
          <LivePill />
        </div>
      }>
        <div className="map-wrap">
          <MasterMap hover={hover} selected={selected} onHover={setHover} onSelect={(id) => setSelected(selected === id ? null : id)} dims={dims} neighbors={neighbors} grow={grow} />
          <div className={`zone-card ${zone ? "show" : ""}`} style={{ ["--zc" as string]: zone ? `var(${zone.color})` : "var(--line)" }} aria-live="polite">
            {zone ? <>
              <h3>{zone.name}</h3>
              <p>{zone.blurb}</p>
              {zone.note && <p className="zc-note">{zone.note}</p>}
              <div className="zc-row">
                <div><b>{zone.feddan}</b><span>feddan · {Math.round((zone.feddan / TOTAL) * 100)}%</span></div>
                <div><b>{wobble(zoneMw(zone.id, zone.mw, hour), ZONES.indexOf(zone) + 1, t, 0.01).toFixed(1)}</b><span>MW now</span></div>
                <div><b>{Math.round(wobble(zone.water, ZONES.indexOf(zone) + 11, t, 0.01))}</b><span>m³/h water</span></div>
                <div><b>{zone.occ == null ? "—" : `${Math.min(100, Math.round(wobble(zone.occ, ZONES.indexOf(zone) + 31, t, 0.01)))}%`}</b><span>{zone.occ == null ? "not occupied" : "occupancy"}</span></div>
              </div>
              <button className="zc-go" onClick={() => go("plan", zone.id)}>Open in Master Plan <ArrowUpRight size={14} /></button>
            </> : <p className="zc-hint">Hover or select a zone</p>}
          </div>
        </div>
        <p className="map-note">Hover a zone to see its numbers, select it to keep them open. Images are AI-generated and are presented for concept illustration only.</p>
      </Panel>

      <div className="side">
        <Panel title="Land use" i={1}>
          <Donut grow={grow} hover={active} onHover={setHover} />
          <div className="facts2" aria-label="Facts from the brief">
            {FACTS.map((f) => <div key={f.label}><b><CountUp value={f.v} suffix={f.suffix} ms={900} /></b><span>{f.label}</span></div>)}
          </div>
        </Panel>
        <Panel title="Live alerts" className="grow" i={2}>
          <ul className="alerts">
            {ALERTS.map((a) => (
              <li key={a.text}><button onClick={() => go(a.tab, a.target)}><i className={`sev ${a.sev}`} /><span>{a.text}</span><em>{a.where} · {a.ago}</em></button></li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
