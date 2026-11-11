import { useState } from "react";
import { Activity, Droplets, Gauge, Landmark, TrendingUp, Waypoints, Wrench } from "lucide-react";
import { MINISTRY_BY_ID, type MinistryId } from "./data";
import { HOURS, OPS, statusColor } from "./ministryData";
import { CountUp } from "./ui";
import { BarList, Panel, StatusChip, TrendChart } from "./parts";
import { Canals, NileDams } from "./MwriBoards";

/** three-colour ring: running, standby, fault */
function OpsDonut({ running, standby, fault, unit }: { running: number; standby: number; fault: number; unit: string }) {
  const total = running + standby + fault, R = 40, C = 2 * Math.PI * R;
  const seg = (n: number, off: number, col: string) => <circle r={R} cx="55" cy="55" fill="none" stroke={col} strokeWidth="13" strokeDasharray={`${(C * n) / total} ${C}`} strokeDashoffset={-off} transform="rotate(-90 55 55)" />;
  return (
    <svg className="donut big" viewBox="0 0 110 110" role="img" aria-label={`${running} running, ${standby} standby, ${fault} in fault`}>
      {seg(running, 0, "#34d399")}{seg(standby, (C * running) / total, "#fbbf24")}{seg(fault, (C * (running + standby)) / total, "#fb7185")}
      <text x="55" y="55" textAnchor="middle" className="d-n sm">{total.toLocaleString("en-US")}</text><text x="55" y="69" textAnchor="middle" className="d-l">{unit}</text>
    </svg>
  );
}

/** Water Resources: its two live boards, one switch */
function MwriOps() {
  const [view, setView] = useState<"nile" | "canals">("nile");
  return (
    <div className="ops-mwri">
      <div className="mp-chips" role="group" aria-label="Operations board">
        <button className={view === "nile" ? "on" : ""} aria-pressed={view === "nile"} onClick={() => setView("nile")}><Landmark size={15} /> Nile &amp; dams</button>
        <button className={view === "canals" ? "on" : ""} aria-pressed={view === "canals"} onClick={() => setView("canals")}><Waypoints size={15} /> Canals &amp; irrigation</button>
      </div>
      {view === "nile" ? <NileDams /> : <Canals />}
    </div>
  );
}

/** the other ministries: how many things are running, the biggest loads, and today's flow */
function OtherOps({ id }: { id: Exclude<MinistryId, "mwri"> }) {
  const m = MINISTRY_BY_ID[id];
  const o = OPS[id];
  const pct = Math.round((o.running / (o.running + o.standby + o.fault)) * 100);
  return (
    <div className="mb-3">
      <Panel icon={Activity} title="Status right now" hint={`${pct}% running`} i={0}>
        <div className="op-status">
          <div className="op-top">
            <OpsDonut {...o} />
            <ul>
              <li><i style={{ background: "#34d399" }} />Running <b><CountUp value={o.running} /></b></li>
              <li><i style={{ background: "#fbbf24" }} />Standby <b><CountUp value={o.standby} /></b></li>
              <li><i style={{ background: "#fb7185" }} />In fault <b><CountUp value={o.fault} /></b></li>
            </ul>
          </div>
          <h4><Wrench size={14} /> Needs a visit</h4>
          <ul className="op-faults">
            {o.faults.map((f) => (
              <li key={f.text}><b>{f.text}</b><em>{f.where}</em><StatusChip status={f.status} text={f.status === "bad" ? "Fault" : "Watch"} /></li>
            ))}
          </ul>
        </div>
      </Panel>
      <Panel icon={Gauge} title="Load by type" hint="share in use now" i={1}>
        <BarList items={m.rows.map((r) => ({ name: r.label, value: r.pct, label: `${r.pct}%` }))} max={100} color={`linear-gradient(90deg, ${m.accent2}, ${m.accent})`} />
      </Panel>
      <Panel icon={TrendingUp} title={o.flow.title} hint={o.flow.sub} i={2}>
        <div className="mp-chart"><TrendChart series={o.flow.series} labels={HOURS} unit={o.flow.unit} decimals={o.flow.decimals} color={m.accent} names={[o.flow.title, ""]} /></div>
      </Panel>
    </div>
  );
}

export default function Operations({ id }: { id: MinistryId }) {
  return id === "mwri" ? <MwriOps /> : <OtherOps id={id} />;
}
export { Droplets, statusColor };
