import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Droplets, Gauge, Hand, Leaf, MapPin, Pause, Play, Settings, Sprout, Waves, X, Zap, type LucideIcon } from "lucide-react";
import { MINISTRY_BY_ID, STATUS_LABEL, type Go } from "./data";
import { STATION_BY_ID, TYPE_INFO } from "./stations";
import { check100, split } from "./cycleData";
import { Donut, Semi } from "./gauges";
import Plant3D from "./Plant3D";
import { STAGES } from "./plantStages";
import "./station.css";

/** El Hamam numbers (simulated). Inflow 1.04 = treated 1.00 + sludge and process loss 0.04; treated 1.00 M m3/day matches stations.ts. */
const UNITS: { label: string; on: number; of: number }[] = [
  { label: "Intake pumps", on: 5, of: 6 }, { label: "Screens", on: 4, of: 4 }, { label: "Clarifiers", on: 3, of: 3 },
  { label: "Filter basins", on: 4, of: 4 }, { label: "Chlorine dosing", on: 2, of: 2 },
];
const USE = split([78, 16, 6]);
check100("El Hamam water use", USE);
const GOES = [
  { label: "Irrigation", pct: USE[0], color: "#34d399" },
  { label: "Land reclamation", pct: USE[1], color: "#22d3ee" },
  { label: "Landscape", pct: USE[2], color: "#a78bfa" },
];

const Tile = ({ icon: Icon, label, value, unit }: { icon: LucideIcon; label: string; value: string; unit?: string }) => (
  <div className="st-tile"><em><Icon size={13} /> {label}</em><b>{value}{unit && <small> {unit}</small>}</b></div>
);

export default function Station({ id, go }: { id: string; go: Go }) {
  const s = STATION_BY_ID[id];
  const [stage, setStage] = useState(-1); // -1 = the whole plant, 0..6 = a stage of the walkthrough
  const [tour, setTour] = useState(false);
  useEffect(() => {
    if (!tour) return;
    const t = window.setInterval(() => setStage((n) => { if (n >= STAGES.length - 1) { setTour(false); return -1; } return n + 1; }), 5000);
    return () => window.clearInterval(t);
  }, [tour]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setTour(false); setStage(-1); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  if (!s) return null;
  const owner = MINISTRY_BY_ID[s.ministry];
  const T = TYPE_INFO[s.type];
  const TIcon = T.icon;
  const cur = stage >= 0 ? STAGES[stage] : null;
  const show = (i: number) => { setTour(false); setStage(i); };
  const pick = (i: number) => show(stage === i ? -1 : i); // pressing the open stage again closes it and shows the whole plant
  const step = (d: number) => show(Math.min(STAGES.length - 1, Math.max(0, (stage < 0 ? (d > 0 ? -1 : STAGES.length) : stage) + d)));
  const startTour = () => { if (tour) { setTour(false); return; } setStage(0); setTour(true); };
  return (
    <motion.div className="st" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ ["--c" as string]: owner.accent }}>
      <header className="st-head">
        <button className="st-back" onClick={() => go("home")}><ArrowLeft size={15} /> Back to map</button>
        <i className="st-ic"><TIcon size={24} /></i>
        <span className="st-title"><h2>{s.name}</h2><p>{T.label} · Ismailia · simulated data</p></span>
        <u className={`x-chip ${s.status}`}>{STATUS_LABEL[s.status]}</u>
        <button className="st-owner" onClick={() => go("ministry", s.ministry)} title={`Open ${owner.name}`}>{owner.short}</button>
      </header>

      <aside className="st-col">
        <section className="st-panel">
          <h4><Gauge size={14} /> FLOW AND CAPACITY</h4>
          <div className="st-gt">
            <Semi pct={91} tone="#22d3ee" label="capacity used" size={150} />
            <div className="st-tiles one">
              <Tile icon={Waves} label="Treated water" value={s.kpis[0].replace(/ M.*/, "")} unit="M m³/day" />
              <Tile icon={Droplets} label="Inflow" value="1.04" unit="M m³/day" />
              <Tile icon={Zap} label="Energy" value="0.42" unit="kWh/m³" />
            </div>
          </div>
        </section>
        <section className="st-panel grow">
          <h4><Settings size={14} /> UNITS RUNNING</h4>
          <ul className="st-units">
            {UNITS.map((u) => (
              <li key={u.label}><span>{u.label}</span><u><s style={{ width: `${(u.on / u.of) * 100}%` }} /></u><b>{u.on} of {u.of}</b></li>
            ))}
          </ul>
        </section>
      </aside>

      <section className="st-mid">
        <Plant3D stage={stage} onPick={pick} />
        <span className="st-hint"><Hand size={13} /> Drag to turn · scroll to zoom · press a number</span>
        <motion.div key={cur ? cur.id : "all"} className="st-card" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
          {cur ? (
            <>
              <div className="st-card-b">
                <button className="st-close" onClick={() => show(-1)} title="Close (Esc)"><X size={14} /> Whole plant</button>
                <em>STAGE {stage + 1} OF {STAGES.length} · {cur.flow} M m³/day</em>
                <h3>{cur.title}</h3>
                <p>{cur.line}</p>
                <div className="st-card-k">
                  <Semi key={cur.id} pct={cur.gauge.pct} tone="#22d3ee" label={cur.gauge.label} size={120} />
                  <div className="st-tiles one">{cur.kpis.map(([l, v]) => <div key={l} className="st-tile"><em>{l}</em><b>{v}</b></div>)}</div>
                </div>
                <div className="st-prog">
                  {cur.bars.map(([l, p, t]) => (
                    <div key={l}><span><em>{l}</em><b>{t}</b></span><u><s style={{ width: `${p}%` }} /></u></div>
                  ))}
                </div>
                <div className="st-trend">
                  <em>{cur.trend.label}</em>
                  <div className="st-cols" aria-hidden>
                    {(() => {
                      const v = cur.trend.values, lo = Math.min(...v), hi = Math.max(...v);
                      return v.map((x, i) => <s key={i} className={i === v.length - 1 ? "now" : ""} style={{ height: `${28 + ((x - lo) / (hi - lo || 1)) * 72}%`, animationDelay: `${i * 0.04}s` }} />);
                    })()}
                  </div>
                  <span><i>12 h ago</i><i>now {cur.trend.values[cur.trend.values.length - 1]}</i></span>
                </div>
              </div>
            </>
          ) : (
            <div className="st-card-b">
              <em>WALKTHROUGH</em>
              <h3>Follow the water</h3>
              <p>From the intake canal to the farms in 7 stages. Press a number on the plant, use the arrows, or start the tour.</p>
            </div>
          )}
        </motion.div>
        <div className="st-steps" aria-label="Walkthrough stages">
          <button className="st-nav" onClick={() => step(-1)} aria-label="Previous stage"><ChevronLeft size={18} /></button>
          {STAGES.map((g, i) => (
            <button key={g.id} className={`st-chip ${stage === i ? "on" : ""}`} onClick={() => pick(i)} aria-pressed={stage === i}>
              <span><i>{i + 1}</i>{g.short}</span><b>{g.flow}</b>
            </button>
          ))}
          <button className="st-nav" onClick={() => step(1)} aria-label="Next stage"><ChevronRight size={18} /></button>
          <button className={`st-tour ${tour ? "on" : ""}`} onClick={startTour}>{tour ? <><Pause size={15} /> Stop</> : <><Play size={15} /> Tour</>}</button>
        </div>
      </section>

      <aside className="st-col">
        <section className="st-panel">
          <h4><Droplets size={14} /> WATER QUALITY</h4>
          <div className="st-gt">
            <Semi pct={99} tone="#34d399" label="quality pass" size={150} />
            <div className="st-tiles one">
              <Tile icon={Waves} label="Salinity" value={s.kpis[2].replace(/ dS.*/, "")} unit="dS/m" />
              <Tile icon={Droplets} label="Turbidity" value="1.8" unit="NTU" />
              <Tile icon={Droplets} label="Chlorine left" value="0.6" unit="mg/L" />
            </div>
          </div>
        </section>
        <section className="st-panel grow">
          <h4><Sprout size={14} /> WHERE THE WATER GOES</h4>
          <div className="st-use">
            <Donut parts={GOES} size={128} centre="100%" />
            <ul>
              {GOES.map((g) => <li key={g.label}><i style={{ background: g.color }} /><span>{g.label}</span><b>{g.pct}%</b></li>)}
            </ul>
          </div>
          <div className="st-tiles two">
            <Tile icon={Leaf} label="Area served" value={s.kpis[1].replace(/ feddan.*/, "")} unit="feddan" />
            <Tile icon={MapPin} label="Governorate" value="Ismailia" />
          </div>
        </section>
      </aside>
    </motion.div>
  );
}
