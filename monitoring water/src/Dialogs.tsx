import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, Check as Tick, CircleCheck, CloudRain, Container, Droplets, TriangleAlert, Waypoints, Waves, Wrench, X } from "lucide-react";
import { windowHours, hour, type PivotState, type Pumps } from "./model";
import { clockOf, stateOf, type Alarm } from "./alarmdata";
import { useCan } from "./role";
import { SevIcon } from "./alarmicons";
import type { Check } from "./model";

/** the four dialogs of Pivot detail. They open inside the stage (so they scale with it) and keep their own draft until Apply. */

export function Modal({ title, icon, onClose, onApply, applyLabel = "Apply", children }: { title: string; icon: ReactNode; onClose: () => void; onApply?: () => void; applyLabel?: string; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const host = document.querySelector(".stage");
  if (!host) return null;
  return createPortal(
    <div className="mdl-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mdl" role="dialog" aria-modal="true" aria-label={title}>
        <header><h3><span className="sym">{icon}</span>{title}</h3><button className="mdl-x" onClick={onClose} aria-label="Close"><X size={20} /></button></header>
        <div className="mdl-body">{children}</div>
        <footer>
          <button className="btn" onClick={onClose}>{onApply ? "Cancel" : "Close"}</button>
          {onApply && <button className="btn pri" onClick={onApply}>{applyLabel}</button>}
        </footer>
      </div>
    </div>,
    host,
  );
}

function Slider({ label, value, min, max, step = 1, show, onChange }: { label: string; value: number; min: number; max: number; step?: number; show: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="sld">
      <span>{label}<b>{show(value)}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ ["--p" as string]: `${((value - min) / (max - min)) * 100}%` }} />
    </label>
  );
}

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`sw ${on ? "on" : ""}`} onClick={() => onChange(!on)}>
      <i /><span>{label}</span>
    </button>
  );
}

const DAYS = [{ d: "Today", et: 6.1, rain: 0 }, { d: "Tomorrow", et: 6.4, rain: 0 }, { d: "In 2 days", et: 5.2, rain: 2 }];

export function ForecastDialog({ p, onApply, onClose }: { p: PivotState; onApply: (dryLimit: number, skipRain: boolean) => void; onClose: () => void }) {
  const [limit, setLimit] = useState(p.dryLimit);
  const [skip, setSkip] = useState(p.skipRain);
  const plan = windowHours(p.win) * p.flow;
  return (
    <Modal title={`Irrigation forecast · ${p.id}`} icon={<Waypoints size={20} />} onClose={onClose} onApply={() => { onApply(limit, skip); onClose(); }}>
      <table className="mtbl">
        <thead><tr><th>Day</th><th>ET (mm)</th><th>Rain (mm)</th><th>Irrigation (m³)</th></tr></thead>
        <tbody>
          {DAYS.map((x) => {
            const skipped = skip && x.rain >= 2;
            return <tr key={x.d} className={skipped ? "skip" : ""}><td>{x.d}</td><td>{x.et}</td><td>{x.rain > 0 ? <><CloudRain size={15} /> {x.rain}</> : "0"}</td><td>{skipped ? "Skipped" : plan.toLocaleString("en-US")}</td></tr>;
          })}
        </tbody>
      </table>
      <Slider label="Dry soil limit (moisture)" value={limit} min={15} max={45} show={(v) => `${v}%`} onChange={setLimit} />
      <Switch on={skip} label="Skip the irrigation of a day with rain of 2 mm or more" onChange={setSkip} />
    </Modal>
  );
}

export function PumpDialog({ pumps, onApply, onClose }: { pumps: Pumps; onApply: (p: Pumps) => void; onClose: () => void }) {
  const [d, setD] = useState<Pumps>({ ...pumps, on: pumps.on.slice() });
  const night = d.from === 22 && d.to === 6;
  return (
    <Modal title="Pumping schedule" icon={<Waves size={20} />} onClose={onClose} onApply={() => { onApply(d); onClose(); }}>
      <p className="mdl-note"><Container size={16} />The pumps fill the tanks inside this window.</p>
      <Slider label="Pumping starts" value={d.from} min={0} max={23} show={hour} onChange={(v) => setD({ ...d, from: v })} />
      <Slider label="Pumping ends" value={d.to} min={0} max={23} show={hour} onChange={(v) => setD({ ...d, to: v })} />
      <div className="mdl-row">{d.on.map((on, i) => <Switch key={i} on={on} label={`Tank ${i + 1}`} onChange={(v) => setD({ ...d, on: d.on.map((x, j) => (j === i ? v : x)) })} />)}</div>
      <p className="mdl-hint">{night ? "Night window: lowest cost." : `Window ${hour(d.from)} to ${hour(d.to)}, ${(d.to - d.from + 24) % 24} hours.`}</p>
    </Modal>
  );
}

export function ScheduleDialog({ p, onApply, onClose }: { p: PivotState; onApply: (w: [number, number]) => void; onClose: () => void }) {
  const [w, setW] = useState<[number, number]>(p.win);
  const hrs = windowHours(w);
  return (
    <Modal title={`Irrigation window · ${p.id}`} icon={<CalendarClock size={20} />} onClose={onClose} onApply={() => { onApply(w); onClose(); }}>
      <p className="mdl-note"><Droplets size={16} />The pivot starts and stops by itself with this window. The chart plan follows it.</p>
      <Slider label="Starts" value={w[0]} min={0} max={23} show={hour} onChange={(v) => setW([v, w[1]])} />
      <Slider label="Ends" value={w[1]} min={0} max={23} show={hour} onChange={(v) => setW([w[0], v])} />
      <div className="mdl-sum"><span>Duration<b>{hrs} h</b></span><span>Planned water<b>{(hrs * p.flow).toLocaleString("en-US")} m³</b></span><span>Flow<b>{p.flow} m³/h</b></span></div>
      {hrs === 0 && <p className="mdl-hint warn">Start and end are the same hour, so the pivot will not run.</p>}
    </Modal>
  );
}

/** asks before a command; a start also shows what must be true first, and cannot go ahead while something is not */
export function Confirm({ title, icon, text, checks, confirmLabel, onConfirm, onClose }: { title: string; icon: ReactNode; text: string; checks?: Check[]; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  const blocked = !!checks?.some((c) => !c.ok);
  return (
    <Modal title={title} icon={icon} onClose={onClose} onApply={blocked ? undefined : () => { onConfirm(); onClose(); }} applyLabel={confirmLabel}>
      <p className="mdl-note">{text}</p>
      {checks && (
        <ul className="chk-list" aria-label="Checks before starting">
          {checks.map((c) => <li key={c.label} className={c.ok ? "ok" : "bad"}>{c.ok ? <Tick size={18} /> : <X size={18} />}{c.label}</li>)}
        </ul>
      )}
      {blocked && <p className="mdl-hint warn">The pivot cannot start until every check passes.</p>}
    </Modal>
  );
}

export function AlertsDialog({ alarms, onReset, onRepair, onAck, onClose }: { alarms: Alarm[]; onReset: () => void; onRepair: (i: number) => void; onAck: (id: string) => void; onClose: () => void }) {
  const tune = useCan("tune");
  const title = alarms[0]?.pivot ? `Alarms · ${alarms[0].pivot}` : "Alarms";
  return (
    <Modal title={title} icon={<TriangleAlert size={20} />} onClose={onClose}>
      {alarms.length === 0 && <p className="mdl-ok"><CircleCheck size={22} />No active alarms on this pivot.</p>}
      <ul className="alist">
        {alarms.map((a) => {
          const nz = a.key.includes(":nz:") ? Number(a.key.split(":nz:")[1]) : -1;
          const waiting = stateOf(a) === "UNACK";
          return (
            <li key={a.id}>
              <SevIcon sev={a.sev} size={22} />
              <div><b>{a.text}</b><span>{a.sev} · since {clockOf(a.at)} · {waiting ? "Not acknowledged" : "Acknowledged"}</span></div>
              {a.key.endsWith(":fault") ? <button className="btn pri" onClick={onReset} disabled={!tune.ok} title={tune.why}><Wrench size={16} />Reset fault</button>
                : nz >= 0 ? <button className="btn" onClick={() => onRepair(nz)} disabled={!tune.ok} title={tune.why}><Wrench size={16} />Mark repaired</button>
                : waiting ? <button className="btn" onClick={() => onAck(a.id)}>Acknowledge</button>
                : <span className="ackd"><CircleCheck size={16} />Acknowledged</span>}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
