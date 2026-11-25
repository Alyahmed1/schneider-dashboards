import { Droplets, Gauge, Lamp, Leaf, Waves, Zap } from "lucide-react";
import { useCity } from "./model";
import { AlertList } from "./Alerts";
import { sp } from "./Overview";
import { WaterDiagram } from "./Diagram";
import { Donut, Kpi, KpiRow, Panel, TimeChart, fmt } from "./ui";

export default function Utilities() {
  const m = useCity();
  return (
    <div className="tab">
      <KpiRow cols={6}>
        <Kpi n={0} label="Smart meters" value={m.meters} icon={Gauge} sub={`${m.metersOnlinePct.toFixed(1)}% reporting`} />
        <Kpi n={1} label="Grid load" value={m.loadMW} decimals={1} suffix=" MW" icon={Zap} tone="warn" spark={sp(m.series.load, "Actual")} sub="ADMS + SCADA (sample)" />
        <Kpi n={2} label="Water sensors" value={m.sensors} icon={Droplets} tone="info" sub={`${m.sensorsOnline.toFixed(1)}% online`} />
        <Kpi n={3} label="Water flow" value={m.flow} suffix=" m³/h" icon={Waves} tone="info" spark={sp(m.series.water, "Flow")} />
        <Kpi n={4} label="Smart poles" value={m.poles} icon={Lamp} tone="warn" sub={`${m.polesFault} faults`} />
        <Kpi n={5} label="Lighting energy saved" value={m.saved} decimals={0} suffix="%" icon={Leaf} tone="good" sub="vs. always-on (sample)" />
      </KpiRow>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1.25fr) minmax(0,1fr)" }}>
          <Panel i={0} title="Electricity · load vs forecast (MW)"><TimeChart rows={m.series.load} unit=" MW" legend keys={[{ k: "Actual", color: "var(--accent)" }, { k: "Forecast", color: "var(--warn)", dash: true }]} /></Panel>
          <Panel i={1} title="Meter fleet (AMI)"><Donut center={fmt(m.meters)} sub="meters" data={[{ name: "Electricity", v: m.elec, color: "#e0a526" }, { name: "Water", v: m.water, color: "#2f9bd6" }, { name: "Gas", v: m.gas, color: "#d9733d" }]} /></Panel>
        </div>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1.25fr) minmax(0,1fr)" }}>
          <Panel i={2} title="Water network · flow (m³/h)"><TimeChart rows={m.series.water} unit=" m³/h" keys={[{ k: "Flow", color: "var(--info)" }]} /></Panel>
          <Panel i={3} title="Water network schematic" aside={<span className="muted">NRW {m.nrw.toFixed(1)}% · {m.leaks} possible leaks</span>}><WaterDiagram m={m} /></Panel>
        </div>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1fr) minmax(0,1.2fr)" }}>
          <Panel i={4} title="Street lighting status"><Donut center={fmt(m.poles)} sub="poles" data={[{ name: "On", v: m.polesOn, color: "#e0a526" }, { name: "Dimmed", v: m.polesDim, color: "#8a63c8" }, { name: "Fault", v: m.polesFault, color: "#d4463f" }]} /></Panel>
          <Panel i={5} title="Utilities alerts" className="grow"><AlertList domains={["Utilities & energy"]} compact /></Panel>
        </div>
      </div>
    </div>
  );
}
