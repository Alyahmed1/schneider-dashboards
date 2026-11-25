import { AlertTriangle, Building2, Fan, Gauge, Thermometer, Trash2, Truck } from "lucide-react";
import { ZONES } from "./data";
import { useCity } from "./model";
import { rng } from "./live";
import { useFilters } from "./state";
import { AlertList } from "./Alerts";
import { sp } from "./Overview";
import { WasteDiagram } from "./Diagram";
import { Bars, Kpi, KpiRow, Panel, StatusPill, TimeChart, fmt } from "./ui";

const SYSTEMS = [["HVAC", 0.34], ["Lighting", 0.22], ["Fire and life safety", 0.14], ["Access control", 0.1], ["Lifts and escalators", 0.08], ["Energy metering", 0.07], ["Water and pumps", 0.05]] as const;

export default function Environment() {
  const m = useCity();
  const { zone } = useFilters();
  const routes = ZONES.filter((z) => zone === "all" || z.id === zone).map((z, i) => {
    const r = rng(i * 29 + 5);
    const bins = Math.round(m.bins * (zone === "all" ? 0.12 + r() * 0.06 : 1));
    const fill = Math.round(m.avgFill + (r() - 0.5) * 24);
    return { id: `R${i + 1}`, zone: z.name, bins, fill: Math.max(20, Math.min(96, fill)), eta: `${8 + Math.floor(r() * 9)}:${r() > 0.5 ? "30" : "00"}` };
  });
  const dist = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"].map((name, i) => ({ name, v: m.hist[i] }));
  return (
    <div className="tab">
      <KpiRow cols={6}>
        <Kpi n={0} label="Smart waste bins" value={m.bins} icon={Trash2} tone="good" sub={`${m.avgFill.toFixed(0)}% average fill`} />
        <Kpi n={1} label="Bins to collect" value={m.binsFull} icon={AlertTriangle} tone={m.binsFull > m.bins * 0.15 ? "warn" : "accent"} sub="above 80% full" />
        <Kpi n={2} label="Trucks on route" value={m.trucks} icon={Truck} tone="info" />
        <Kpi n={3} label="IBMS points" value={m.points} icon={Gauge} tone="violet" sub={`${m.inAlarm} in alarm`} />
        <Kpi n={4} label="HVAC power" value={m.hvacKw} suffix=" kW" icon={Fan} tone="warn" spark={sp(m.series.hvac, "HVAC")} />
        <Kpi n={5} label="Comfort index" value={m.comfort} decimals={0} suffix="%" icon={Thermometer} tone="good" />
      </KpiRow>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1fr) minmax(0,1fr)" }}>
          <Panel i={0} title="Bin fill levels (bins per band)"><Bars data={dist} colors={["#3f9d5a", "#7fb85a", "#e0a526", "#d9733d", "#d4463f"]} /></Panel>
          <Panel i={1} title="Average fill over time (%)"><TimeChart rows={m.series.waste} unit="%" domain={[0, 100]} keys={[{ k: "Fill", color: "var(--good)" }]} /></Panel>
        </div>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1.15fr) minmax(0,1fr)" }}>
        <Panel i={2} title="Collection routes" aside={<StatusPill tone="info">sample</StatusPill>} className="grow">
          <div className="scroll">
            <table className="tbl">
              <thead><tr><th>Route</th><th>Zone</th><th className="r">Bins</th><th className="r">Fill</th><th className="r">Next</th></tr></thead>
              <tbody>{routes.map((r) => (
                <tr key={r.id}><td><b>{r.id}</b></td><td>{r.zone}</td><td className="r">{fmt(r.bins)}</td>
                  <td className="r"><span className={r.fill > 80 ? "bad" : r.fill > 65 ? "warn" : "good"}>{r.fill}%</span></td><td className="r">{r.eta}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </Panel>
        <Panel i={3} title="Waste flow"><WasteDiagram m={m} /></Panel>
        </div>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1fr) minmax(0,1fr)" }}>
          <Panel i={3} title="IBMS points by building system" aside={<Building2 size={14} />}>
            <ul className="rows scroll">{SYSTEMS.map(([n, s]) => <li key={n}><span>{n}</span><b>{fmt(Math.round(m.points * s))}</b></li>)}</ul>
          </Panel>
          <Panel i={4} title="Environment and building alerts" className="grow"><AlertList domains={["Environment", "Buildings"]} compact /></Panel>
        </div>
      </div>
    </div>
  );
}
