import { Bus, Car, Clock, MonitorPlay, Timer, Users } from "lucide-react";
import { CITY, SHARE, ZONES } from "./data";
import { useCity } from "./model";
import { rng } from "./live";
import { useFilters } from "./state";
import { AlertList } from "./Alerts";
import { sp } from "./Overview";
import { Bars, Donut, Kpi, KpiRow, Panel, StatusPill, TimeChart, fmt } from "./ui";

const CAMPAIGNS = [["City events this week", 420], ["Bus arrivals and delays", 310], ["Utility and safety notices", 260], ["Parking guidance", 240], ["Tourism and marina", 180], ["Municipal services", 140]] as const;

export default function Mobility() {
  const m = useCity();
  const { zone } = useFilters();
  const riders = Math.round(Number(m.series.ridership[m.series.ridership.length - 1].Riders));
  const byZone = ZONES.map((z, i) => ({ name: z.name.split(" ")[0], v: Math.round(CITY.parking * SHARE.parking[i] * (0.45 + rng(i * 17 + 3)() * 0.5) * 100) / 100 }));
  return (
    <div className="tab">
      <KpiRow cols={6}>
        <Kpi n={0} label="Parking lots" value={m.lots} icon={Car} tone="violet" sub={`${fmt(m.occupied)} occupied`} />
        <Kpi n={1} label="Occupancy" value={m.occPct} decimals={0} suffix="%" icon={Car} tone={m.occPct > 85 ? "bad" : "accent"} spark={sp(m.series.parking, "Occupancy")} />
        <Kpi n={2} label="Bus stations" value={m.stations} icon={Bus} tone="warn" sub={`${m.buses} buses on route`} />
        <Kpi n={3} label="Average wait" value={m.wait} decimals={1} suffix=" min" icon={Timer} tone="info" />
        <Kpi n={4} label="On-time rate" value={m.onTime} decimals={0} suffix="%" icon={Clock} tone="good" />
        <Kpi n={5} label="Signage online" value={m.screens} icon={MonitorPlay} tone="bad" sub={`${m.screensOnline.toFixed(1)}% online`} />
      </KpiRow>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1.1fr) minmax(0,1fr)" }}>
          <Panel i={0} title="Parking occupancy (%)"><TimeChart rows={m.series.parking} unit="%" domain={[0, 100]} keys={[{ k: "Occupancy", color: "var(--violet)" }]} /></Panel>
          <Panel i={1} title="Occupied lots by zone"><Bars data={byZone} color="#8a63c8" /></Panel>
        </div>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1.1fr) minmax(0,1fr)" }}>
          <Panel i={2} title="Bus ridership" aside={<span className="muted"><Users size={12} /> {fmt(riders)} / {zone === "all" ? "period" : "zone"}</span>}><TimeChart rows={m.series.ridership} keys={[{ k: "Riders", color: "var(--warn)" }]} /></Panel>
          <Panel i={3} title="Digital signage fleet"><Donut center={fmt(m.screens)} sub="screens" data={[{ name: "Playing", v: Math.round(m.screens * 0.93), color: "#3f9d5a" }, { name: "Idle", v: Math.round(m.screens * 0.047), color: "#e0a526" }, { name: "Offline", v: m.screens - Math.round(m.screens * 0.93) - Math.round(m.screens * 0.047), color: "#d4463f" }]} /></Panel>
        </div>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1fr) minmax(0,1.1fr)" }}>
          <Panel i={4} title="Signage campaigns" aside={<StatusPill tone="info">sample</StatusPill>}>
            <ul className="rows scroll">{CAMPAIGNS.map(([n, s]) => <li key={n}><span>{n}</span><b>{Math.round((s * m.screens) / CITY.signage)} screens</b></li>)}</ul>
          </Panel>
          <Panel i={5} title="Mobility alerts" className="grow"><AlertList domains={["Mobility", "Citizens & commerce"]} compact /></Panel>
        </div>
      </div>
    </div>
  );
}
