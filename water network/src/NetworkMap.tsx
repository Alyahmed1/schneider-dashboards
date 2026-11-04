import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Segmented, TONE_COLOR } from "./ui";
import { WORK_ORDERS } from "./cmms";
import type { Go } from "./App";
import { METER_GROUPS } from "./meters";
import { LEGEND, METRICS, type Metric } from "./mapcolor";
import NetworkImage, { type GeoLayers } from "./NetworkImage";
import ZoneList from "./ZoneList";
import { dayCurve, INSTRUMENTS, LEAKS, pipeById, readInstrument, ZONES, type InstrumentType, type ZoneId } from "./network";

export type { Metric };

const GLYPH: Record<InstrumentType, string> = { flow: "Q", pressure: "P", quality: "Cl", level: "H", pump: "M", leak: "Lk", prv: "V" };
const TYPE_NAME: Record<InstrumentType, string> = { flow: "Flow meter", pressure: "Pressure sensor", quality: "Chlorine analyser", level: "Level sensor", pump: "Pump", leak: "Leak logger", prv: "Pressure-reducing valve" };

const PRIO = { High: 0, Medium: 1, Low: 2 } as const;
const OPEN = WORK_ORDERS.filter((w) => w.status !== "Done").sort((a, b) => PRIO[a.prio] - PRIO[b.prio] || (a.status === "In progress" ? -1 : 1));
const CURVE = dayCurve();
const CURVE_MAX = Math.max(...CURVE.map((d) => d.supplied));
const hh = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const SIDE_MIN = 320, TIME_H = 30;
const period = (h: number) => (h < 5 ? "Night low" : h < 9 ? "Morning peak" : h < 17 ? "Daytime" : h < 21 ? "Evening peak" : "Night");



export default function NetworkMap({ preset, go }: { preset?: { hour: number; metric: Metric; n: number } | null; go?: Go }) {
  const [metric, setMetric] = useState<Metric>(preset?.metric ?? "Consumption");
  const [hour, setHour] = useState(preset?.hour ?? 8);
  const [play, setPlay] = useState(false);
  // the assistant can send the map to a time and a colouring
  useEffect(() => { if (preset) { setMetric(preset.metric); setHour(preset.hour); setPlay(false); } }, [preset?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const [zone, setZone] = useState<ZoneId | null>(null);
  const [lay, setLay] = useState<GeoLayers>({ areas: true, pipes: true, ctl: true });
  const [sel, setSel] = useState<string | null>("FT-04");

  useEffect(() => {
    if (!play) return;
    const id = window.setInterval(() => setHour((h) => (h + 0.25) % 24), 230);
    return () => window.clearInterval(id);
  }, [play]);


  // the map column is as wide as the picture (2 : 1) can be at the height it gets; the readings and tasks column takes the rest
  const root = useRef<HTMLDivElement>(null), wrap = useRef<HTMLDivElement>(null);
  const [mapW, setMapW] = useState<number | null>(null);
  const [mapH, setMapH] = useState<number | null>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const r = root.current, w = wrap.current; if (!r || !w) return;
      if (window.innerWidth <= 960) { setMapW(null); setMapH(null); return; }
      const panel = w.parentElement!, pr = panel.getBoundingClientRect(), cs = getComputedStyle(panel);
      const extraW = panel.offsetWidth - w.offsetWidth;
      // the height the map may take: down to the panel's bottom, less the time bar under it
      const avail = pr.bottom - parseFloat(cs.paddingBottom) - parseFloat(cs.borderBottomWidth) - w.getBoundingClientRect().top - 8 - TIME_H;
      const sideMax = Math.max(SIDE_MIN, r.clientWidth * 0.42);
      const next = Math.round(Math.max(r.clientWidth - 10 - sideMax, Math.min(r.clientWidth - 10 - SIDE_MIN, avail * 2 + extraW)));
      setMapW((o) => (o !== null && Math.abs(o - next) < 2 ? o : next));
      setMapH(Math.floor(Math.min(avail, (next - extraW) / 2)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root.current!); ro.observe(wrap.current!);
    window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, []);

  const readings = useMemo(() => Object.fromEntries(INSTRUMENTS.map((i) => [i.id, readInstrument(i, hour)])), [hour]);

  const bad = INSTRUMENTS.filter((i) => readings[i.id].tone === "bad").length + LEAKS.length;


  return (
    <div className="nm" ref={root} style={mapW ? { gridTemplateColumns: `${mapW}px minmax(0, 1fr)` } : undefined}>
      <section className="hm-map-p nm-map-p">
        <div className="nm-head">
          <Segmented<Metric> label="Colour the network by" value={metric} options={METRICS} onChange={setMetric} />
          <div className="nm-key" aria-label="Colour key">
            <b>{LEGEND[metric].title}</b>
            {LEGEND[metric].items.map((i) => <span key={i.label} title={`${i.label}: ${i.note}`}><i style={{ background: i.c }} />{i.label} <em>{i.note.replace(" of the pipe", "").replace(", or a burst", "")}</em></span>)}
          </div>
          <div className="nm-head-r">
            <div className="nm-layers" role="group" aria-label="Map layers">
              <button className={`nm-btn ${lay.areas ? "on" : ""}`} onClick={() => setLay((l) => ({ ...l, areas: !l.areas }))} aria-pressed={lay.areas}><i className="sw" />Zones</button>
              <button className={`nm-btn ${lay.pipes ? "on" : ""}`} onClick={() => setLay((l) => ({ ...l, pipes: !l.pipes }))} aria-pressed={lay.pipes}><i className="sw" />Pipes</button>
              <button className={`nm-btn ${lay.ctl ? "on" : ""}`} onClick={() => setLay((l) => ({ ...l, ctl: !l.ctl }))} aria-pressed={lay.ctl}><i className="sw" />Controllers</button>
            </div>
            <span className={`hm-alarm ${bad ? "bad" : "ok"}`}>{bad} active faults</span>
          </div>
        </div>

        <p className="nm-how"><b>How to read it:</b> the glowing pipes carry the water from the plant, through the booster, to the three zones <i>·</i> the zone and pipe colours follow the button you pick above <i>·</i> the round badges are the controllers: click one to select it <i>·</i> click a zone to focus it, drag or scroll to move and zoom.</p>

        <div className="nm-wrap" ref={wrap} style={mapH ? { flex: "none", height: mapH } : undefined}>
          <NetworkImage metric={metric} hour={hour} zone={zone} onZone={setZone} layers={lay} sel={sel} onSel={setSel} />
        </div>
        <ZoneList metric={metric} hour={hour} zone={zone} onZone={setZone} />

        {/* time: drag to see the network through the day, or press play */}
        <div className="nm-time">
          <button className="nm-play" onClick={() => setPlay(!play)} aria-label={play ? "Pause" : "Play the day"}>{play ? <Pause size={13} /> : <Play size={13} />}</button>
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


        <section className="hm-p nm-read">
          <h3>Readings and leaks <small>{LEAKS.length} leaks · {(LEAKS.reduce((a, l) => a + l.rate, 0) * 86.4).toFixed(0)} m³/day</small> {zone && <button className="nm-clear" onClick={() => setZone(null)}>Show all</button>}</h3>
          {METER_GROUPS.map((g) => (
            <div key={g.name} className="nm-read-g">
              <span>{g.name}</span>
              <div className="ns-chips">
                {g.ids.map((id) => { const inst = INSTRUMENTS.find((i) => i.id === id)!, r = readings[id], off = inst.forced === "offline"; return (
                  <button key={id} type="button" className={`ns-chip ${r.tone} ${sel === id ? "sel" : ""}`} onClick={() => setSel(id)} title={`${id} · ${inst.name}`} aria-label={`${TYPE_NAME[inst.type]} ${id}, ${inst.name}: ${off ? "offline" : r.text}`}>
                    <i style={{ background: TONE_COLOR[r.tone] }} /><span>{GLYPH[inst.type]}</span><b>{off ? "offline" : r.text}</b>
                  </button>
                ); })}
                {(() => { const zid = ZONES.find((q) => q.name === g.name)?.id; return LEAKS.filter((l) => zid && pipeById(l.pipe).zone === zid).map((l) => (
                  <button key={l.id} type="button" className="ns-leak" onClick={() => setZone(zid ?? null)} title={`${l.id}: ${l.note}. ${l.status}, running for ${l.since}. Click to focus this zone.`} aria-label={`${l.id}, ${l.rate} litres per second, ${l.status}: focus ${g.name}`}><i />Leak <b>{l.rate}</b></button>
                )); })()}
              </div>
            </div>
          ))}
        </section>



        <section className="hm-p nm-tasks">
          <h3>Tasks <small>{OPEN.length} open</small>{go && <button className="nm-clear" onClick={() => go("maintenance")}>All tasks</button>}</h3>
          <ul>
            {OPEN.map((t) => { const zid = ZONES.find((q) => q.name === t.area)?.id; return (
              <li key={t.id}>
                <button type="button" className={zid && zone === zid ? "on" : ""} onClick={() => { if (zid) setZone(zone === zid ? null : zid); }}
                  title={`${t.id} · ${t.title}. ${t.asset}, ${t.area}. ${t.status}, due ${t.due}. ${t.crew}.`} aria-label={`${t.title}, ${t.area}, ${t.prio} priority, ${t.status}, due ${t.due}`}>
                  <i className={`p-${t.prio}`} /><span>{t.title}</span><em>{t.status === "In progress" ? "Now" : t.due}</em>
                </button>
              </li>
            ); })}
          </ul>
        </section>
      </aside>
    </div>
  );
}
