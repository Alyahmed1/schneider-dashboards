import { useMemo, useState } from "react";
import { ArrowUp } from "lucide-react";
import { fmt, MOMENT_LABELS, momentHour, type Moment } from "./farm";
import { moistColor } from "./farmColor";
import { LCTRLS, LZONES, runWindow, runMin, flowLpm, SENSORS, siteWeather, todayUseM3, weekUse, zoneById, zonesAt, ZTYPES, type ZoneNow, type ZStatus } from "./landscape";
import { gwAt } from "./grey";
import { useOpenAlarms } from "./alarms";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import { useAspect } from "./useAspect";
import { Bars, CountUp, Panel, Pie, Segmented } from "./ui";
import type { Go } from "./App";

type LMetric = "Soil moisture" | "Valve status" | "Runtime today";
const METRICS: LMetric[] = ["Soil moisture", "Valve status", "Runtime today"];
const ST_C: Record<ZStatus, string> = { Watering: "#3db8ff", Scheduled: "#f0b429", Done: "#3ecf5a", Fault: "#ef5a6a" };
const RUN_C = ["#2a6f9c", "#3a93cc", "#3db8ff", "#9fdcff"];
const runBin = (m: number) => (m < 8 ? 0 : m < 15 ? 1 : m < 30 ? 2 : 3);
const colorOf = (m: LMetric, n: ZoneNow) => (m === "Soil moisture" ? moistColor(n.moist) : m === "Valve status" ? ST_C[n.status] : RUN_C[runBin(runMin(n.z))]);
const valueOf = (m: LMetric, n: ZoneNow) => (m === "Soil moisture" ? `${fmt(n.moist)}%` : m === "Valve status" ? n.status : `${fmt(runMin(n.z))} min`);
const LEGEND: Record<LMetric, { label: string; c: string }[]> = {
  "Soil moisture": [{ label: "Dry under 28%", c: "#ef5a6a" }, { label: "Low 28 to 33%", c: "#f0b429" }, { label: "Optimal 33 to 45%", c: "#3ecf5a" }, { label: "Wet over 45%", c: "#3db8ff" }],
  "Valve status": [{ label: "Watering", c: ST_C.Watering }, { label: "Scheduled", c: ST_C.Scheduled }, { label: "Done today", c: ST_C.Done }, { label: "Fault", c: ST_C.Fault }],
  "Runtime today": [{ label: "Under 8 min", c: RUN_C[0] }, { label: "8 to 15 min", c: RUN_C[1] }, { label: "15 to 30 min", c: RUN_C[2] }, { label: "Over 30 min", c: RUN_C[3] }],
};
const fmtHour = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

function SiteMap({ metric, snap, sel, onSelect, tank }: { metric: LMetric; snap: ZoneNow[]; sel: string; onSelect: (id: string) => void; tank: number }) {
  // the plan is drawn on a 1000 x 420 grid and stretched sideways (zones get wider, text stays the same size) so it fills its box
  const [ref, asp] = useAspect<SVGSVGElement>(1.5, 5);
  const W = Math.max(1000, 420 * asp), H = Math.max(420, W / asp);
  const kx = W / 1000, ky = H / 420;
  const markers = [[200, 298], [478, 278], [674, 262]];
  return (
    <svg ref={ref} className="fm sm" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Plan of the headquarters grounds with twelve irrigation zones">
      <rect className="sm-hq" x={320 * kx} y={225 * ky} width={350 * kx} height={45 * ky} rx={4} />
      <text className="sm-hq-t" x={495 * kx} y={254 * ky} textAnchor="middle">Headquarters</text>
      {snap.map((n, i) => {
        const z = n.z, c = colorOf(metric, n), tall = z.h * ky >= 70, v = valueOf(metric, n);
        const zx = z.x * kx, zy = z.y * ky, zw = z.w * kx, zh = z.h * ky;
        const cx = zx + zw / 2, cy = zy + zh / 2;
        return (
          <g key={z.id} className={`sm-zone ${n.status === "Watering" ? "wet" : ""} ${sel === z.id ? "sel" : ""}`} onClick={() => onSelect(z.id)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(z.id); }} style={{ ["--n" as string]: i }} aria-label={`Zone ${z.id}, ${z.name}, ${v}`}>
            <title>{`${z.id} ${z.name} · ${z.type} · ${n.status} · soil moisture ${fmt(n.moist, 1)}%`}</title>
            <rect className="r" x={zx} y={zy} width={zw} height={zh} rx={8} style={{ fill: c, stroke: c }} />
            {tall ? <>
              <text className="id" x={cx} y={cy - 6} textAnchor="middle">{zw < 130 ? z.id : `${z.id} ${z.type}`}</text>
              <text className="val" x={cx} y={cy + 24} textAnchor="middle">{v}</text>
            </> : <text className="val one" x={cx} y={cy + 8} textAnchor="middle">{z.id} {v}</text>}
            <circle className={`dot ${n.status.toLowerCase()}`} cx={zx + zw - 14} cy={zy + 14} r={7} />
          </g>
        );
      })}
      {LCTRLS.map((c, i) => (
        <g key={c.id} className="sm-ctrl"><rect x={markers[i][0] * kx} y={markers[i][1] * ky} width={34} height={24} rx={3} /><text x={markers[i][0] * kx + 17} y={markers[i][1] * ky + 17} textAnchor="middle">{c.id}</text></g>
      ))}
      <g className="sm-tank"><rect x={30 * kx} y={330 * ky} width={150 * kx} height={64 * ky} rx={6} /><text x={105 * kx} y={358 * ky} textAnchor="middle" className="n">Reuse tank</text><text x={105 * kx} y={382 * ky} textAnchor="middle" className="v">{fmt(tank)}% full</text></g>
    </svg>
  );
}

/** Landscape · Zones: the grounds as a plan, twelve zones coloured by soil moisture, valve state or run time */
export default function Zones({ start, go }: { start?: string; go: Go }) {
  const t = useTick();
  const grow = useGrow();
  const [metric, setMetric] = useState<LMetric>("Soil moisture");
  const [moment, setMoment] = useState<Moment>("Evening");
  const [sel, setSel] = useState(start && zoneById(start) ? start : "Z1");
  const hour = momentHour(moment);
  const snap = useMemo(() => zonesAt(hour), [hour]);
  const n = snap.find((x) => x.z.id === sel)!;
  const w = siteWeather(hour);
  const open = useOpenAlarms();
  const critical = open.filter((a) => a.sev === "Critical").length;
  const week = useMemo(() => weekUse(), []);
  const byType = ZTYPES.map((tp) => ({ name: tp, value: LZONES.filter((z) => z.type === tp && !z.fault).reduce((s, z) => s + (flowLpm(z) * runMin(z)) / 1000, 0) }));
  const watering = snap.filter((x) => x.status === "Watering").length;
  const online = Math.round((SENSORS.filter((s) => s.status !== "Offline").length / SENSORS.length) * 100);
  const tank = wobble(gwAt(hour).store / 0.6, 31, t, 0.01);
  const [s0, s1] = runWindow(n.z);

  const tiles = [
    { l: "Water today", v: todayUseM3(), d: 1, u: "m³" }, { l: "Zones watering now", v: watering, d: 0, u: `of ${LZONES.length}` },
    { l: "Sensors online", v: online, d: 0, u: "%" }, { l: "Temperature", v: w.temp, d: 0, u: "°C" },
    { l: "Wind", v: w.wind, d: 0, u: "km/h" }, { l: "Reuse tank", v: tank, d: 0, u: "%" },
  ];
  return (
    <div className="ag">
      <section className="ag-map-p" style={{ ["--i" as string]: 0 }}>
        <div className="ag-map-head">
          <div className="ag-map-lead">
            <button className={`ag-alarm ${critical ? "bad" : "ok"}`} onClick={() => go("alarms")}>{critical ? `${critical} critical alarm` : "All normal"}</button>
            <label className="select">
              <span className="sr">Colour the plan by</span>
              <select value={metric} onChange={(e) => setMetric(e.target.value as LMetric)}>{METRICS.map((x) => <option key={x} value={x}>Colour by {x.toLowerCase()}</option>)}</select>
            </label>
            <Segmented<Moment> label="Time of day" value={moment} options={MOMENT_LABELS} onChange={setMoment} />
          </div>
        </div>
        <div className="ag-map-wrap"><div className="ag-map-in"><SiteMap metric={metric} snap={snap} sel={sel} onSelect={setSel} tank={tank} /></div></div>
        <div className="ag-key" aria-label="Colour key">
          <b>{metric}:</b>
          {LEGEND[metric].map((i) => <span key={i.label}><i style={{ background: i.c }} />{i.label}</span>)}
          <button className="btn pri" onClick={() => go("controllers")}>Open the controllers</button>
        </div>
      </section>

      <div className="ag-side">
        <Panel title="Summary" className="ag-sum" i={1}>
          <div className="tiles">
            {tiles.map((k, i) => (
              <div key={k.l} className="tile" style={{ ["--n" as string]: i }}><span>{k.l}</span><b><CountUp value={k.v} decimals={k.d} /> <small>{k.u}</small>{i === 0 && <ArrowUp size={16} className="up" aria-hidden />}</b></div>
            ))}
          </div>
        </Panel>
        <Panel title={`Zone ${n.z.id} · ${n.z.name}`} className="ag-crop" i={2}>
          <dl className="kv">
            <div><dt>Type</dt><dd>{n.z.type}, {fmt(n.z.area)} m²</dd></div>
            <div><dt>Controller</dt><dd>{n.z.ctrl}</dd></div>
            <div><dt>Soil moisture</dt><dd>{fmt(n.moist, 1)} %</dd></div>
            <div><dt>Valve</dt><dd className={n.status === "Fault" ? "bad" : ""}>{n.status === "Fault" ? n.z.fault : n.status}</dd></div>
            <div><dt>Runs</dt><dd>{fmtHour(s0)} to {fmtHour(s1)}</dd></div>
            <div><dt>Water per run</dt><dd>{fmt(n.z.fault ? 0 : (flowLpm(n.z) * runMin(n.z)) / 1000, 1)} m³</dd></div>
          </dl>
        </Panel>
      </div>

      <div className="ag-strip">
        <Panel title="Water used, 7 days" i={3}><Bars labels={week.map((d) => d.t)} values={week.map((d) => d.v)} unit="m³" grow={grow} /></Panel>
        <Panel title="Water by zone type" i={4}><Pie items={byType} /></Panel>
        <Panel title="Weather now" i={5}>
          <div className="mini-boxes">
            <div className="box"><span>Humidity</span><b>{w.rh} %</b></div>
            <div className="box"><span>Rain today</span><b>{w.rain} mm</b></div>
          </div>
        </Panel>
        <Panel title="Rules" className="ag-bud" i={6}>
          <div className="box"><span>Rain delay</span><b>Off</b></div>
          <div className="box"><span>Wind lockout</span><b>over 35 km/h</b></div>
        </Panel>
      </div>

      <div className="ag-pair">
        <Panel title="Reuse tank" className="ag-pond" i={7}>
          <div className="box"><span>Level now</span><b><CountUp value={tank} decimals={0} /> %</b></div>
          <div className="box"><span>Source</span><b>Grey water</b></div>
        </Panel>
        <Panel title="Controllers" i={8}>
          <ul className="ctl-list">
            {LCTRLS.map((c) => {
              const act = snap.find((x) => x.z.ctrl === c.id && x.status === "Watering");
              return <li key={c.id}><i className="dot ok" /><b>{c.id}</b><span>{c.place}</span><em>{act ? `${act.z.id} watering` : "idle"}</em></li>;
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
