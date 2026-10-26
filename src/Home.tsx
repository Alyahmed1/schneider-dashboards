import { useMemo, useState } from "react";
import { useStoryCmd } from "./storytour";
import { ArrowUpRight, Car, Droplets, Gauge, ShieldAlert, Wrench, Zap, type LucideIcon } from "lucide-react";
import { ALERTS, BRIEF, ZONES, type TabId, type ZoneId } from "./data";
import MasterMap from "./MasterMap";
import { LivePill, useTick, wobble } from "./live";
import { zoneMw } from "./zonemodel";
import { waterNow } from "./watermodel";
import { useWorkOrders } from "./workorders";
import { CountUp, Panel, useGrow } from "./ui";

const FACTS: { v: number; suffix?: string; label: string }[] = [
  { v: BRIEF.feddan, label: "Feddan, total project area" },
  { v: BRIEF.residentialPct, suffix: "%", label: "Residential" },
  { v: BRIEF.mixedPct, suffix: "%", label: "Mixed-use" },
  { v: BRIEF.residentialFeddan, label: "Feddan, residential area" },
  { v: BRIEF.commercialFeddan, label: "Feddan, commercial district" },
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

interface Tile { id: string; icon: LucideIcon; label: string; value: number; decimals: number; suffix: string; tab: TabId }

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

  const tiles: Tile[] = useMemo(() => [
    { id: "power", icon: Zap, label: "Power now", value: ZONES.reduce((s, z, i) => s + wobble(zoneMw(z.id, z.mw, hour), i + 1, t, 0.01), 0), decimals: 1, suffix: " MW", tab: "utilities" },
    { id: "water", icon: Droplets, label: "Water use", value: wobble(waterNow(hour), 7, t, 0.01), decimals: 0, suffix: " m³/h", tab: "utilities" },
    { id: "traffic", icon: Car, label: "Traffic flow", value: Math.min(100, wobble(72, 21, t, 0.02)), decimals: 0, suffix: "%", tab: "mobility" },
    { id: "parking", icon: Gauge, label: "Parking free", value: Math.min(100, wobble(61, 22, t, 0.03)), decimals: 0, suffix: "%", tab: "mobility" },
    { id: "health", icon: Wrench, label: "Asset health", value: Math.min(100, wobble(96.2, 23, t, 0.002)), decimals: 1, suffix: "%", tab: "assets" },
    { id: "inc", icon: ShieldAlert, label: "Open work orders", value: openOrders, decimals: 0, suffix: "", tab: "assets" },
  ], [t, hour, openOrders]);

  return (
    <div className="home">
      <div className="facts">
        {FACTS.map((f, i) => (
          <div className="fact" key={f.label} style={{ ["--n" as string]: i }}>
            <b><CountUp value={f.v} suffix={f.suffix} /></b><span>{f.label}</span>
          </div>
        ))}
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
                <div><b>{wobble(zone.mw, ZONES.indexOf(zone) + 1, t, 0.01).toFixed(1)}</b><span>MW now</span></div>
                <div><b>{Math.round(wobble(zone.water, ZONES.indexOf(zone) + 11, t, 0.01))}</b><span>m³/h water</span></div>
                <div><b>{zone.occ == null ? "—" : `${Math.min(100, Math.round(wobble(zone.occ, ZONES.indexOf(zone) + 31, t, 0.01)))}%`}</b><span>{zone.occ == null ? "not occupied" : "occupancy"}</span></div>
              </div>
              <button className="zc-go" onClick={() => go("plan", zone.id)}>Open in Master Plan <ArrowUpRight size={14} /></button>
            </> : <p className="zc-hint">Hover or select a zone</p>}
          </div>
        </div>
        <p className="map-note">Hover a zone to see its numbers, select it to keep them open. Zone power, water and occupancy are sample numbers; the 380, 80/20, 304 and 76 feddan and the boundary lengths are from the brief, and zone sizes are measured from its zoning map. Images are AI-generated and are presented for concept illustration only.</p>
      </Panel>

      <div className="side">
        <Panel title="Land use" i={1}><Donut grow={grow} hover={active} onHover={setHover} /></Panel>
        <Panel title="City now" i={2}>
          <div className="tiles">
            {tiles.map((k, i) => (
              <button className="tile" key={k.id} style={{ ["--n" as string]: i }} onClick={() => go(k.tab)}>
                <k.icon size={16} />
                <b><CountUp value={k.value} decimals={k.decimals} suffix={k.suffix} /></b>
                <span>{k.label}</span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Live alerts" i={3}>
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
