import { useMemo, useState } from "react";
import { useStoryCmd } from "./storytour";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ZoomOut } from "lucide-react";
import { OFFERS, ZONES, type TabId, type ZoneId } from "./data";
import MasterMap from "./MasterMap";
import Location from "./Location";
import { FULL_BOX, ROADS, asPath, zoneBox } from "./plan";
import { SERVES, heat, zoneCurve, zoneMw } from "./zonemodel";
import { LivePill, useTick, wobble } from "./live";
import { CountUp, Panel, useGrow } from "./ui";
import { useViewBox } from "./zoom";

type Metric = "use" | "power" | "water" | "occ";
const METRICS: { id: Metric; label: string; unit: string }[] = [
  { id: "use", label: "Land use", unit: "" }, { id: "power", label: "Power", unit: "MW" }, { id: "water", label: "Water", unit: "m³/h" }, { id: "occ", label: "Occupancy", unit: "%" },
];
const TOTAL = ZONES.reduce((s, z) => s + z.feddan, 0);

/** Master Plan: the zoning map to explore (zoom to a zone, colour it by a live number), and the location around it */
export default function MasterPlan({ go, focus }: { go: (tab: TabId, target?: string) => void; focus?: string }) {
  const t = useTick();
  const grow = useGrow(250);
  const [view, setView] = useState<"zoning" | "location">("zoning");
  const [metric, setMetric] = useState<Metric>("use");
  const [selected, setSelected] = useState<ZoneId | null>(() => (ZONES.some((z) => z.id === focus) ? (focus as ZoneId) : null));
  const [hover, setHover] = useState<ZoneId | null>(null);
  useStoryCmd((c, a) => {
    if (c === "plan:select") setSelected(a ? (a as ZoneId) : null);
    else if (c === "plan:metric") setMetric(a as Metric);
    else if (c === "plan:view") setView(a as "zoning" | "location");
  });
  const [dims, setDims] = useState(false);
  const [neighbors, setNeighbors] = useState(false);
  const [roads, setRoads] = useState(false);

  const sel = ZONES.find((z) => z.id === selected) ?? null;
  const vb = useViewBox(sel ? zoneBox(sel) : FULL_BOX);
  const hour = new Date().getHours() + new Date().getMinutes() / 60;

  /** the number each zone shows right now for the chosen colouring (null = not occupied) */
  const values = useMemo(() => {
    const v: Record<string, number | null> = {};
    ZONES.forEach((z, i) => {
      v[z.id] = metric === "power" ? wobble(zoneMw(z.id, z.mw, hour), i + 1, t, 0.01) : metric === "water" ? wobble(z.water, i + 11, t, 0.01) : metric === "occ" ? (z.occ == null ? null : Math.min(100, wobble(z.occ, i + 31, t, 0.01))) : z.feddan;
    });
    return v;
  }, [metric, t, hour]);
  const nums = Object.values(values).filter((x): x is number => x != null);
  const lo = Math.min(...nums), hi = Math.max(...nums);
  const fills = useMemo(() => {
    if (metric === "use") return undefined;
    const f: Partial<Record<ZoneId, string>> = {};
    ZONES.forEach((z) => { const x = values[z.id]; f[z.id] = x == null ? "var(--line)" : heat((x - lo) / Math.max(1e-6, hi - lo)); });
    return f;
  }, [metric, values, lo, hi]);
  const m = METRICS.find((x) => x.id === metric) ?? METRICS[0];
  const shown = ZONES.find((z) => z.id === (hover ?? selected)) ?? null;
  const decimals = metric === "power" ? 1 : 0;
  const curve = useMemo(() => (sel ? zoneCurve(sel.id, sel.mw) : []), [sel]);

  return (
    <div className="plan">
      <div className="subtabs" role="tablist">
        <button role="tab" aria-selected={view === "zoning"} className={view === "zoning" ? "on" : ""} onClick={() => setView("zoning")}>Zoning strategy</button>
        <button role="tab" aria-selected={view === "location"} className={view === "location" ? "on" : ""} onClick={() => setView("location")}>Prime location</button>
      </div>

      {view === "location" ? <Location /> : (
        <div className="plan-grid">
          <Panel title="Zoning strategy" className="plan-map" i={0} aside={
            <div className="map-tools">
              <button className={`chip ${dims ? "on" : ""}`} aria-pressed={dims} onClick={() => setDims(!dims)}>Boundary lengths</button>
              <button className={`chip ${neighbors ? "on" : ""}`} aria-pressed={neighbors} onClick={() => setNeighbors(!neighbors)}>Neighbours</button>
              <button className={`chip ${roads ? "on" : ""}`} aria-pressed={roads} onClick={() => setRoads(!roads)}>Roads</button>
              <LivePill />
            </div>
          }>
            <div className="colorby" role="group" aria-label="Colour the map by">
              <span>Colour by</span>
              {METRICS.map((x) => <button key={x.id} className={`chip ${metric === x.id ? "on" : ""}`} aria-pressed={metric === x.id} onClick={() => setMetric(x.id)}>{x.label}</button>)}
              {metric !== "use" && <div className="ramp" aria-hidden><b>{lo.toFixed(decimals)}</b><i style={{ background: `linear-gradient(90deg, ${heat(0)}, ${heat(0.35)}, ${heat(0.7)}, ${heat(1)})` }} /><b>{hi.toFixed(decimals)} {m.unit}</b></div>}
              {sel && <button className="chip reset" onClick={() => setSelected(null)}><ZoomOut size={13} /> Whole plan</button>}
            </div>
            <div className="map-wrap">
              <MasterMap hover={hover} selected={selected} onHover={setHover} onSelect={(id) => setSelected(selected === id ? null : id)} dims={dims} neighbors={neighbors} grow={grow} viewBox={vb} fills={fills}>
                {roads && <g className="plan-roads" aria-hidden>{ROADS.map((r) => <g key={r.id}><path className="rd-case" d={asPath(r.pts)} /><path className="rd" d={asPath(r.pts)} /><title>{r.name}</title></g>)}</g>}
              </MasterMap>
            </div>
            <p className="map-note">Select a zone to zoom to it. Zone areas are measured from the brief's zoning map; power, water and occupancy are sample numbers.</p>
          </Panel>

          <div className="side">
            <Panel title="Zones" i={1}>
              <ul className="zlist">
                {[...ZONES].sort((a, b) => b.feddan - a.feddan).map((z) => {
                  const v = values[z.id];
                  return (
                    <li key={z.id}>
                      <button className={`${selected === z.id ? "sel" : ""} ${hover === z.id ? "hot" : ""}`} onClick={() => setSelected(selected === z.id ? null : z.id)} onMouseEnter={() => setHover(z.id)} onMouseLeave={() => setHover(null)}>
                        <i style={{ background: `var(${z.color})` }} />
                        <span className="zn">{z.name}</span>
                        <span className="zbar"><em style={{ width: grow ? `${(z.feddan / 135) * 100}%` : 0, background: `var(${z.color})` }} /></span>
                        <b>{z.feddan}<small> fd</small></b>
                        {metric !== "use" && <u>{v == null ? "—" : `${v.toFixed(decimals)} ${m.unit}`}</u>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            <Panel title={shown ? shown.name : "Zone detail"} className="grow" i={2}>
              {shown ? (
                <div className="zdetail" style={{ ["--zc" as string]: `var(${shown.color})` }}>
                  <p className="zd-blurb">{shown.blurb}</p>
                  {shown.note && <p className="zc-note">{shown.note}</p>}
                  <div className="zd-tiles">
                    <div><b><CountUp value={shown.feddan} /></b><span>feddan · {Math.round((shown.feddan / TOTAL) * 100)}%</span></div>
                    <div><b><CountUp value={wobble(zoneMw(shown.id, shown.mw, hour), ZONES.indexOf(shown) + 1, t, 0.01)} decimals={1} /></b><span>MW now</span></div>
                    <div><b><CountUp value={wobble(shown.water, ZONES.indexOf(shown) + 11, t, 0.01)} /></b><span>m³/h water</span></div>
                    <div><b>{shown.occ == null ? "—" : <CountUp value={Math.min(100, wobble(shown.occ, ZONES.indexOf(shown) + 31, t, 0.01))} suffix="%" />}</b><span>{shown.occ == null ? "not occupied" : "occupancy"}</span></div>
                  </div>
                  {sel && shown.id === sel.id && (
                    <div className="zd-chart" aria-label="Power through the day">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={curve} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                          <defs><linearGradient id="zg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--zc)" stopOpacity=".55" /><stop offset="1" stopColor="var(--zc)" stopOpacity=".05" /></linearGradient></defs>
                          <CartesianGrid stroke="var(--line-2)" vertical={false} />
                          <XAxis dataKey="label" interval={5} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={40} />
                          <Tooltip formatter={(v) => [`${v} MW`, "Power"]} contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }} />
                          <ReferenceLine x={`${String(Math.floor(hour)).padStart(2, "0")}:00`} stroke="var(--gold)" strokeDasharray="3 3" />
                          <Area dataKey="mw" stroke="var(--zc)" strokeWidth={2} fill="url(#zg)" isAnimationActive={grow} />
                        </AreaChart>
                      </ResponsiveContainer>
                      <span className="zd-cap">Power through the day (MW), gold line is now</span>
                    </div>
                  )}
                  <div className="zd-serves">
                    <span>AI services here</span>
                    {SERVES[shown.id].map((name) => {
                      const o = OFFERS.find((x) => x.name === name);
                      return <button key={name} className="chip" onClick={() => o && go(o.tab)} title={o?.text}>{name}</button>;
                    })}
                  </div>
                </div>
              ) : <p className="zd-hint">Hover a zone to preview it, select it to zoom in.</p>}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
