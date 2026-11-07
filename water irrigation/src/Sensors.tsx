import { useEffect, useMemo, useState } from "react";
import { BatteryLow, CheckCircle2, Radio, WifiOff, type LucideIcon } from "lucide-react";
import { MOMENT_LABELS, momentHour, type Moment } from "./farm";
import { SENSORS, sensorText, sensorValue, type SKind, type SStatus } from "./landscape";
import { Panel, Segmented } from "./ui";

const STATUSES: ("All" | SStatus)[] = ["All", "OK", "Low battery", "Offline"];
const KINDS: ("All kinds" | SKind)[] = ["All kinds", "Soil moisture", "Rain", "Wind", "Air", "Solar", "Flow", "Pressure", "Tank level"];
const ST_ICON: Record<"All" | SStatus, [LucideIcon, string]> = { All: [Radio, "var(--teal)"], OK: [CheckCircle2, "var(--good)"], "Low battery": [BatteryLow, "var(--warn)"], Offline: [WifiOff, "var(--bad)"] };
const TONE: Record<SStatus, string> = { OK: "good", "Low battery": "warn", Offline: "bad" };

const RAMP = 800, STAGGER = 20;
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
/** Milliseconds since the tab opened, ticking only until the fill-in is done (instant with reduced motion). */
function useOpenClock(rows: number): number {
  const total = RAMP + rows * STAGGER;
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [t, setT] = useState(reduce ? total : 0);
  useEffect(() => {
    if (reduce) return;
    let raf = 0; const t0 = performance.now();
    const step = (now: number) => { const d = now - t0; setT(Math.min(d, total)); if (d < total) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduce, total]);
  return t;
}

/** Landscape · Sensors: one list of every probe and meter, with its reading, battery and link. Filter by status or type. */
export default function Sensors(_: { start?: string }) {
  const [status, setStatus] = useState<"All" | SStatus>("All");
  const [kind, setKind] = useState<"All kinds" | SKind>("All kinds");
  const [moment, setMoment] = useState<Moment>("Evening");
  const hour = momentHour(moment);
  const rows = useMemo(() => SENSORS.filter((s) => (status === "All" || s.status === status) && (kind === "All kinds" || s.kind === kind)), [status, kind]);
  const t = useOpenClock(SENSORS.length);
  const count = (st: "All" | SStatus) => (st === "All" ? SENSORS.length : SENSORS.filter((x) => x.status === st).length);

  return (
    <div className="vw sn">
      <Panel title="Sensors" className="sn-list" i={0}
        right={<div className="sn-ctl">
          <label className="select"><span className="sr">Sensor type</span><select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
          <Segmented<Moment> label="Time of day" value={moment} options={MOMENT_LABELS} onChange={setMoment} />
        </div>}>
        <div className="fboxes">
          {STATUSES.map((st) => <button key={st} className={`fbox ${st === status ? "on" : ""}`} onClick={() => setStatus(st)}><span>{(() => { const [I, c] = ST_ICON[st]; return <I className="sym" size={18} style={{ color: c }} aria-hidden />; })()}{st === "All" ? "All sensors" : st}</span><b className={st === "Offline" && count(st) ? "bad" : ""}>{Math.round(count(st) * ease(t / RAMP))}</b></button>)}
        </div>
        <div className="tbl">
          <table>
            <thead><tr><th>Sensor</th><th>Type</th><th>Where</th><th>Reading</th><th>Battery</th><th>Status</th><th>Last seen</th></tr></thead>
            <tbody>
              {rows.map((x) => {
                const p = ease((t - SENSORS.indexOf(x) * STAGGER) / RAMP);
                return (
                <tr key={x.id}>
                  <td><b>{x.id}</b> {x.name}</td><td>{x.kind}</td><td>{x.where}</td>
                  <td><b>{sensorText(x, sensorValue(x, hour) * p)}</b></td>
                  <td className={x.battery < 20 ? "warn" : ""}>{x.battery >= 100 ? "Mains" : <>{Math.round(x.battery * p)} % <i className="sn-bat"><i style={{ width: `${x.battery * p}%` }} /></i></>}</td>
                  <td><span className={`chip ${TONE[x.status]}`}>{x.status}</span></td><td>{x.seen}</td>
                </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={7} className="none">No sensors match</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
