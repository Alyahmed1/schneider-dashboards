import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Pause, Play } from "lucide-react";
import { Chip, Segmented } from "./ui";
import { colorOf, LEGEND, METRICS, type Metric } from "./mapcolor";
import GeoNetwork, { type GeoFocus, type GeoLayers } from "./GeoNetwork";
import { BASEMAPS, pipeMid, zoneLoad as zoneLoadAt, type Basemap } from "./geo";
import { dayCurve, INSTRUMENTS, LEAKS, networkAt, pipeById, readInstrument, ZONES, type InstrumentType, type ZoneId } from "./network";

export type { Metric };

const TYPE_NAME: Record<InstrumentType, string> = { flow: "Flow meter", pressure: "Pressure sensor", quality: "Chlorine analyser", level: "Level sensor", pump: "Pump", leak: "Leak logger", prv: "Pressure-reducing valve" };

const CURVE = dayCurve();
const CURVE_MAX = Math.max(...CURVE.map((d) => d.supplied));
const hh = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const period = (h: number) => (h < 5 ? "Night low" : h < 9 ? "Morning peak" : h < 17 ? "Daytime" : h < 21 ? "Evening peak" : "Night");



export default function NetworkMap({ preset }: { preset?: { hour: number; metric: Metric; n: number } | null }) {
  const [metric, setMetric] = useState<Metric>(preset?.metric ?? "Consumption");
  const [hour, setHour] = useState(preset?.hour ?? 8);
  const [play, setPlay] = useState(false);
  // the assistant can send the map to a time and a colouring
  useEffect(() => { if (preset) { setMetric(preset.metric); setHour(preset.hour); setPlay(false); } }, [preset?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const [zone, setZone] = useState<ZoneId | null>(null);
  const [sel, setSel] = useState<string | null>("FT-04");
  const [lay, setLay] = useState<GeoLayers>({ areas: true, pipes: true, inst: false, leaks: true });
  const [base, setBase] = useState<Basemap>("Streets");
  const [focus, setFocus] = useState<GeoFocus | null>(null);

  useEffect(() => {
    if (!play) return;
    const id = window.setInterval(() => setHour((h) => (h + 0.25) % 24), 230);
    return () => window.clearInterval(id);
  }, [play]);

  const s = networkAt(hour);

  const readings = useMemo(() => Object.fromEntries(INSTRUMENTS.map((i) => [i.id, readInstrument(i, hour)])), [hour]);
  const selInst = INSTRUMENTS.find((i) => i.id === sel) ?? null;
  const trend = useMemo(() => (selInst ? Array.from({ length: 24 }, (_, h) => ({ h, v: +readInstrument(selInst, h).value.toFixed(2) })) : []), [selInst]);

  const bad = INSTRUMENTS.filter((i) => readings[i.id].tone === "bad").length + LEAKS.length;

  /** mean pipe load of a zone, the same number the pipes are coloured with */
  const zoneLoad = (id: ZoneId) => zoneLoadAt(s, id);
  const avgP = ZONES.reduce((a, z) => a + s.zones[z.id].pressure * s.zones[z.id].demand, 0) / ZONES.reduce((a, z) => a + s.zones[z.id].demand, 0);
  const nrw = s.loss / s.supplied;
  const legend = LEGEND[metric];

  return (
    <div className="nm">
      <section className="hm-map-p nm-map-p">
        <div className="nm-head">
          <Segmented<Metric> label="Colour the network by" value={metric} options={METRICS} onChange={setMetric} />
          <div className="nm-head-r">
            <div className="nm-layers" role="group" aria-label="Map layers">
              <button className={`nm-btn ${lay.areas ? "on" : ""}`} onClick={() => setLay({ ...lay, areas: !lay.areas })} aria-pressed={lay.areas}><i className="sw" />Areas</button>
              <button className={`nm-btn ${lay.pipes ? "on" : ""}`} onClick={() => setLay({ ...lay, pipes: !lay.pipes })} aria-pressed={lay.pipes}><i className="sw" />Pipes</button>
              <button className={`nm-btn ${lay.inst ? "on" : ""}`} onClick={() => setLay({ ...lay, inst: !lay.inst })} aria-pressed={lay.inst}><i className="sw" />Instruments</button>
              <button className={`nm-btn lk ${lay.leaks ? "on" : ""}`} onClick={() => setLay({ ...lay, leaks: !lay.leaks })} aria-pressed={lay.leaks}><i className="sw" />Leaks</button>
            </div>
            <Segmented<Basemap> label="Base map" value={base} options={BASEMAPS} onChange={setBase} />
            <span className={`hm-alarm ${bad ? "bad" : "ok"}`}>{bad} active faults</span>
          </div>
        </div>

        <p className="nm-how"><b>How to read it:</b> each coloured area is a supply zone <i>·</i> thick lines are the main pipes <i>·</i> red dots are leaks <i>·</i> click a zone to see its street pipes.</p>

        <div className="nm-wrap">
          <GeoNetwork mode="network" metric={metric} hour={hour} basemap={base} zone={zone} onZone={setZone} layers={lay} sel={sel} onSel={setSel} focus={focus}
            label={`Interactive map of the water network over New Cairo, coloured by ${metric}. Drag to move, scroll or use the plus and minus to zoom.`} />

          {/* legend */}
          <div className="nm-legend" aria-label="Colour key">
            <b>{legend.title}</b>
            {legend.items.map((i) => <div key={i.label} className="row"><i style={{ background: i.c }} /><span>{i.label}</span><em>{i.note}</em></div>)}
            <div className="row"><i className="tie" /><span>Closed valve</span><em>no flow</em></div>
          </div>
        </div>

        {/* time: drag to see the network through the day, or press play */}
        <div className="nm-time">
          <button className="nm-play" onClick={() => setPlay(!play)} aria-label={play ? "Pause" : "Play the day"}>{play ? <Pause size={16} /> : <Play size={16} />}</button>
          <div className="nm-track">
            <svg viewBox="0 0 96 28" preserveAspectRatio="none" aria-hidden>
              <path d={`M0 28 ${CURVE.map((d, i) => `L${(i / 23) * 96} ${28 - (d.supplied / CURVE_MAX) * 24}`).join(" ")} L96 28Z`} />
            </svg>
            <i className="cur" style={{ left: `${(hour / 23.75) * 100}%` }} />
            <input type="range" min={0} max={23.75} step={0.25} value={hour} onChange={(e) => { setPlay(false); setHour(+e.target.value); }} aria-label="Time of day" />
          </div>
          <div className="nm-clock"><b>{hh(hour)}</b><span>{period(hour)}</span></div>
          <button className="nm-btn" onClick={() => { setPlay(false); const d = new Date(); setHour(Math.floor((d.getHours() + d.getMinutes() / 60) * 4) / 4); }}>Now</button>
        </div>
      </section>

      <aside className="nm-side">
        <section className="hm-p nm-stats">
          <div><span>Supplied</span><b>{s.supplied.toFixed(0)}<small> L/s</small></b></div>
          <div><span>Water lost</span><b className={nrw > 0.2 ? "warn" : ""}>{(nrw * 100).toFixed(1)}<small> %</small></b></div>
          <div><span>Avg pressure</span><b className={avgP < 2.8 ? "warn" : ""}>{avgP.toFixed(1)}<small> bar</small></b></div>
          <div><span>Reservoir</span><b>{s.tank.toFixed(0)}<small> %</small></b></div>
        </section>

        <section className="hm-p nm-zones">
          <h3>Zones {zone && <button className="nm-clear" onClick={() => setZone(null)}>Show all</button>}</h3>
          <table>
            <thead><tr><th>Zone</th><th>Use L/s</th><th>Bar</th><th>Lost</th><th>m³/day</th></tr></thead>
            <tbody>
              {[...ZONES].sort((a, b) => s.zones[b.id].demand - s.zones[a.id].demand).map((z) => {
                const q = s.zones[z.id];
                const col = metric === "Pressure" ? colorOf(metric, q.pressure) : metric === "Leakage" ? colorOf(metric, q.nrw) : colorOf("Consumption", zoneLoad(z.id));
                return (
                  <tr key={z.id} className={zone === z.id ? "on" : ""} onClick={() => setZone(zone === z.id ? null : z.id)}>
                    <td><i style={{ background: col }} />{z.name}</td>
                    <td>{q.demand.toFixed(0)}</td>
                    <td className={q.minPressure < 2.5 ? "warn" : ""}>{q.pressure.toFixed(1)}</td>
                    <td className={q.nrw > 0.2 ? "warn" : ""}>{(q.nrw * 100).toFixed(0)}%</td>
                    <td className={q.nrw > 0.2 ? "warn" : ""}>{(q.loss * 86.4).toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="hm-p nm-loss">
          <h3>Leaks and losses <small>{LEAKS.length} known · {(LEAKS.reduce((a, l) => a + l.rate, 0) * 86.4).toFixed(0)} m³/day</small></h3>
          <div className="nm-leaks">
            {LEAKS.map((l) => { const p = pipeById(l.pipe), ll = pipeMid(p, 0.55); return (
              <button key={l.id} onClick={() => { setLay({ ...lay, leaks: true }); setFocus({ lat: ll[0], lng: ll[1], n: Date.now(), zoom: 16.5 }); }} aria-label={`${l.id}, ${l.rate} litres per second, ${l.status}: show on the map`}>
                <i /><span>{l.id} · {ZONES.find((z) => z.id === p.zone)?.name ?? "Trunk"}<small>{l.status} · {l.since}</small></span><b>{l.rate} L/s</b>
              </button>
            ); })}
          </div>
        </section>

        <section className="hm-p nm-detail">
          {selInst ? (() => { const r = readings[selInst.id]; const off = selInst.forced === "offline"; return <>
            <div className="nm-dh"><div><small>{selInst.id} · {TYPE_NAME[selInst.type]}</small><h3>{selInst.name}</h3></div><Chip tone={r.tone}>{off ? "Offline" : r.tone === "good" ? "Normal" : r.tone === "warn" ? "Watch" : "Fault"}</Chip></div>
            <div className="nm-val"><b>{off ? "—" : r.text}</b><span>{r.detail}</span></div>
            <div className="nm-chart">
              {off ? <p>No data since 06:10. Check the radio link at the pole.</p> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--line-2)" strokeDasharray="3 4" vertical={false} />
                    <XAxis dataKey="h" ticks={[0, 6, 12, 18, 23]} tickFormatter={(v) => `${v}h`} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={46} />
                    <ReferenceLine x={Math.floor(hour)} stroke="var(--teal)" strokeDasharray="4 3" />
                    <Line type="monotone" dataKey="v" stroke="var(--teal)" strokeWidth={2} dot={false} isAnimationActive />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </>; })() : <p className="nm-empty">Click an instrument on the map to see its reading and its day.</p>}
        </section>
      </aside>
    </div>
  );
}
