import { Droplets, Gauge, Landmark, MapPinned, Sprout, TrendingUp, Waves, Waypoints, Wrench } from "lucide-react";
import { ALLOCATION, CANALS, DAMS, DEMAND, LAKE, PUMPS, RELEASE, statusColor } from "./ministryData";
import { CountUp } from "./ui";
import { BarList, Panel, StatusChip, TrendChart } from "./parts";

/** half-circle gauge: how full Lake Nasser is */
function Gauge180({ pct }: { pct: number }) {
  const R = 78, C = Math.PI * R;
  return (
    <svg className="gauge" viewBox="0 0 200 118" role="img" aria-label={`Lake Nasser is ${pct}% full`}>
      <defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stopColor="#22d3ee" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
      <path d="M22 100 A78 78 0 0 1 178 100" className="g-bg" />
      <path d="M22 100 A78 78 0 0 1 178 100" className="g-fg" stroke="url(#gg)" strokeDasharray={`${(C * pct) / 100} ${C}`} />
      <text x="100" y="86" textAnchor="middle" className="g-n">{pct}%</text>
      <text x="100" y="108" textAnchor="middle" className="g-l">of storage</text>
    </svg>
  );
}

/** three-colour ring: pumps running, standby, fault */
function Donut({ running, standby, fault }: { running: number; standby: number; fault: number }) {
  const total = running + standby + fault, R = 40, C = 2 * Math.PI * R;
  const seg = (n: number, off: number, col: string) => <circle r={R} cx="55" cy="55" fill="none" stroke={col} strokeWidth="13" strokeDasharray={`${(C * n) / total} ${C}`} strokeDashoffset={-off} transform="rotate(-90 55 55)" />;
  return (
    <svg className="donut" viewBox="0 0 110 110" role="img" aria-label={`${running} running, ${standby} standby, ${fault} in fault`}>
      {seg(running, 0, "#34d399")}{seg(standby, (C * running) / total, "#fbbf24")}{seg(fault, (C * (running + standby)) / total, "#fb7185")}
      <text x="55" y="53" textAnchor="middle" className="d-n">{total}</text><text x="55" y="68" textAnchor="middle" className="d-l">stations</text>
    </svg>
  );
}

export function NileDams() {
  return (
    <div className="mb-3">
      <Panel icon={Landmark} title="Dams and barrages" hint="level, % of storage" i={0}>
        <ul className="mb-dams">
          {DAMS.map((d) => (
            <li key={d.name}>
              <span><b>{d.name}</b><em>{d.note}</em></span>
              <u><s style={{ width: `${d.level}%`, background: `linear-gradient(90deg, #6d4aff, ${statusColor(d.level < 80 ? "watch" : "good")})` }} /></u>
              <strong>{d.level}%</strong>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel icon={TrendingUp} title="Nile release at Aswan" hint="actual against plan, M m³/day" i={1}>
        <div className="mp-chart"><TrendChart series={RELEASE.actual} compare={RELEASE.plan} names={["Actual", "Plan"]} unit="M m³/day" decimals={1} color="#f5b942" color2="#22d3ee" /></div>
      </Panel>
      <Panel icon={Gauge} title="Lake Nasser" hint="today" i={2}>
        <div className="mb-lake">
          <Gauge180 pct={LAKE.pct} />
          <ul>
            <li><Waves size={16} /><span>Level</span><b><CountUp value={LAKE.level} decimals={1} /> m</b></li>
            <li><Gauge size={16} /><span>Safe minimum</span><b>{LAKE.min} m</b></li>
            <li><Landmark size={16} /><span>Flood maximum</span><b>{LAKE.max} m</b></li>
            <li><Droplets size={16} /><span>Release held at</span><b>92% of plan</b></li>
          </ul>
        </div>
      </Panel>
    </div>
  );
}

export function Canals() {
  return (
    <div className="mb-3">
      <Panel icon={MapPinned} title="Water by governorate" hint="top 8, M m³/day" i={0}>
        <BarList items={ALLOCATION.map((a) => ({ name: a.name, value: a.v, label: a.v.toFixed(2) }))} max={0.7} color="linear-gradient(90deg,#f59e0b,#f5b942)" />
      </Panel>
      <Panel icon={Waypoints} title="Main canals" hint="flow and load" i={1}>
        <ul className="mb-canals">
          {CANALS.map((c) => (
            <li key={c.name}>
              <b>{c.name}</b><span>{c.flow}</span>
              <span className="m-use"><u><s style={{ width: `${c.pct}%`, background: statusColor(c.status) }} /></u><em>{c.pct}%</em></span>
              <StatusChip status={c.status} />
            </li>
          ))}
        </ul>
      </Panel>
      <div className="mb-col">
        <Panel icon={Wrench} title="Pumping stations" hint="28 in total" i={2}>
          <div className="mb-pumps">
            <Donut {...PUMPS} />
            <ul>
              <li><i style={{ background: "#34d399" }} />Running <b>{PUMPS.running}</b></li>
              <li><i style={{ background: "#fbbf24" }} />Standby <b>{PUMPS.standby}</b></li>
              <li><i style={{ background: "#fb7185" }} />In fault <b>{PUMPS.fault}</b></li>
            </ul>
          </div>
        </Panel>
        <Panel icon={Sprout} title="Demand and delivery" hint="M m³/day" i={3}>
          <div className="mp-chart"><TrendChart series={DEMAND.delivered} compare={DEMAND.demand} names={["Delivered", "Demand"]} unit="M m³/day" decimals={1} color="#34d399" color2="#fbbf24" /></div>
        </Panel>
      </div>
    </div>
  );
}
