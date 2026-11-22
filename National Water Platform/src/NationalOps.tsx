import { motion } from "framer-motion";
import { Activity, ChevronRight, ClipboardList, FlaskConical, HardHat, Radio, TrendingUp, TriangleAlert, Wrench } from "lucide-react";
import { MINISTRIES, MINISTRY_BY_ID, type Go } from "./data";
import { HOURS, OPS } from "./ministryData";
import { Semi } from "./gauges";
import { SEV_ICON } from "./Header";
import { ago, useLive, useSupply, useWob, waiting } from "./live";
import { Panel, TrendChart, rise } from "./parts";
import { CountUp } from "./ui";
import "./pages.css";

const TASK: Record<string, string> = {
  Pivot: "Inspect the drive and restart the tower", Process: "Clean membrane train 3", Quality: "Check the discharge and take a sample", Pressure: "Open the booster pump and check valves",
  Gates: "Finish the gate repair", Pumps: "Return the two pumps to service", Capacity: "Move load to the next plant", Irrigation: "Review the irrigation plan",
};
const CREW = ["Crew A", "Crew B", "Crew C", "Crew D", "Crew E", "Crew F"];

export default function NationalOps({ go }: { go: Go }) {
  const { alarms } = useLive();
  const sup = useSupply();
  const all = MINISTRIES.map((m) => ({ m, o: OPS[m.id], t: OPS[m.id].running + OPS[m.id].standby + OPS[m.id].fault }));
  const running = all.reduce((a, x) => a + x.o.running, 0), total = all.reduce((a, x) => a + x.t, 0), fault = all.reduce((a, x) => a + x.o.fault, 0);
  const wait = waiting(alarms).sort((a, b) => a.priority - b.priority || b.at - a.at);
  const wo = wait.slice(0, 6).map((a, i) => ({ id: `WO-${2041 + i}`, a, task: TASK[a.cls] ?? "Inspect and report", crew: CREW[i], due: a.sev === "critical" ? "Today 16:00" : "Tomorrow 10:00", st: a.sev === "critical" ? "In progress" : "Scheduled" }));
  const quality = useWob(98.9, "ops-q", 0.004, 1);
  const qc = useWob(98, "ops-c", 0.01, 1), qcl = useWob(96, "ops-cl", 0.012, 1), qs = useWob(94, "ops-s", 0.015, 1);
  const q = [{ l: "Drinking water pass", v: Math.round(quality) }, { l: "Wastewater compliance", v: Math.round(qc) }, { l: "Chlorine in range", v: Math.round(qcl) }, { l: "Salinity in range", v: Math.round(qs) }];
  // national supply through today; the last point follows the live number shown on Home
  const series = OPS.mhuuc.flow.series.map((v, i, a) => (i === a.length - 1 ? Number((sup.network - 1.1).toFixed(1)) : v));
  const urgent = wait.filter((a) => a.sev === "critical").length;

  const kpis = [
    { label: "Systems running", node: <><CountUp value={(running / total) * 100} decimals={1} /><small>%</small></>, sub: `${running.toLocaleString("en-US")} of ${total.toLocaleString("en-US")}`, tone: "good", Icon: Activity, to: undefined },
    { label: "In fault now", node: <CountUp value={fault} />, sub: "across 4 ministries", tone: "bad", Icon: TriangleAlert, to: "alerts" as const },
    { label: "Open work orders", node: <CountUp value={wait.length + 4} />, sub: `${urgent} urgent`, tone: "warn", Icon: ClipboardList, to: undefined },
    { label: "Crews on site", node: <CountUp value={12} />, sub: "of 18 on shift", tone: "info", Icon: HardHat, to: undefined },
    { label: "Water quality pass", node: <><CountUp value={quality} decimals={1} /><small>%</small></>, sub: "all sites, today", tone: "good", Icon: FlaskConical, to: undefined },
  ];

  return (
    <motion.div className="pg" style={{ gridTemplateRows: "80px 120px 1fr 1fr" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <header className="x-hero">
        <div className="x-hero-t"><h2>Operations</h2><p>Is the system running? Plants, pumps and pivots in all four ministries</p></div>
        <div className="x-tools"><span className="pg-live"><Radio size={14} /> LIVE · every 10 s</span></div>
      </header>

      <section className="pg-kpis ops-kpis" aria-label="Operations key numbers">
        {kpis.map((k, i) => {
          const inner = (
            <>
              <i className="x-ico" style={{ ["--tone" as string]: "var(--tone)" }}><k.Icon size={30} /></i>
              <span className="t"><em>{k.label}</em><b>{k.node}</b><span className="sub">{k.sub}</span></span>
            </>
          );
          return (
            <motion.div key={k.label} style={{ display: "contents" }} {...rise(i)}>
              {k.to ? <button className={`pg-kpi ${k.tone}`} onClick={() => go(k.to!)}>{inner}</button> : <div className={`pg-kpi ${k.tone}`}>{inner}</div>}
            </motion.div>
          );
        })}
      </section>

      <div className="pg-grid" style={{ gridTemplateColumns: "1.05fr 1.2fr 1fr" }}>
        <Panel icon={Activity} title="Status by ministry" hint="share of systems running" i={0}>
          <div className="pg-center">
            <ul className="ops-min">
              {all.map(({ m, o, t }) => (
                <li key={m.id}>
                  <b style={{ color: m.accent }}>{m.short}</b>
                  <div className="pg-bar"><s className="g" style={{ width: `${(o.running / t) * 100}%` }} /><s className="r" style={{ width: `${(o.fault / t) * 100}%` }} /></div>
                  <strong>{Math.round((o.running / t) * 100)}%</strong>
                  <em>{o.fault > 0 ? <><u>{o.fault}</u> in fault</> : "No faults"}</em>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
        <Panel icon={TrendingUp} title="Drinking water supplied today" hint="every 2 hours, M m³/day" i={1}>
          <div className="mp-chart"><TrendChart series={series} labels={HOURS} unit="M m³/day" decimals={1} color="#5cb9f6" names={["Supplied", ""]} /></div>
        </Panel>
        <Panel icon={Wrench} title="Needs a visit" hint="from the live alarms" i={2}>
          <ul className="x-attn">
            {wait.slice(0, 4).map((a) => {
              const Icon = SEV_ICON[a.sev];
              return (
                <li key={a.id}>
                  <button onClick={() => go("alerts", a.id)}>
                    <span className={`sev ${a.sev}`}><Icon size={16} /></span>
                    <span className="x-attn-t"><b>{a.comment}</b><em>{a.name} · {ago(a.at)}</em></span>
                    <ChevronRight size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <div className="pg-grid" style={{ gridTemplateColumns: "1.55fr 1fr" }}>
        <Panel icon={ClipboardList} title="Work orders" hint="made from the open alarms" i={3}>
          <div className="pg-scroll">
            <table className="pg-table">
              <thead><tr><th>Order</th><th>Task</th><th>Station</th><th>Ministry</th><th>Crew</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                {wo.map((w) => (
                  <tr key={w.id} className="click" onClick={() => go("alerts", w.a.id)}>
                    <td><b>{w.id}</b></td><td>{w.task}</td><td>{w.a.name}</td><td>{MINISTRY_BY_ID[w.a.ministry].short}</td><td>{w.crew}</td><td>{w.due}</td>
                    <td><span className={`pg-pill ${w.st === "In progress" ? "warn" : "info"}`}>{w.st}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel icon={FlaskConical} title="Water quality now" hint="share inside the limits" i={4}>
          <div className="pg-semis">{q.map((x) => <Semi key={x.l} pct={x.v} tone={x.v >= 97 ? "var(--green)" : x.v >= 94 ? "var(--amber)" : "var(--red)"} label={x.l} size={118} />)}</div>
        </Panel>
      </div>
    </motion.div>
  );
}
