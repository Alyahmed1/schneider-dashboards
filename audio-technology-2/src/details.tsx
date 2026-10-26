import { Bar2, Donut, DualArea, Icon, KpiRow, Legend, PageTitle, Panel, fmt, live, palette, rangeLabels, wave, type KpiDef } from "./ui";
import type { ScreenProps } from "./screens";

export type DetailKind = "health" | "connectivity" | "surveillance";

/** Which sidebar tab a details page belongs to. */
export const detailOwner: Record<DetailKind, string> = { health: "overview", connectivity: "overview", surveillance: "surveillance" };

const systems = [
  { name: "Cranes", icon: "crane", to: "cranes", v: 98, online: 1186, total: 1210, incident: "QC-02 high load, 14:17", color: palette.blue },
  { name: "Vehicles", icon: "truck", to: "vehicles", v: 96, online: 612, total: 640, incident: "TR-276 delayed, 08:32", color: palette.purple },
  { name: "Access Control", icon: "shieldcheck", to: "access", v: 99, online: 96, total: 96, incident: "Person #B562 denied, 14:24", color: palette.green },
  { name: "Surveillance", icon: "camera", to: "surveillance", v: 97, online: 242, total: 248, incident: "CAM-003 offline, 07:10", color: palette.cyan },
  { name: "Warehouse", icon: "warehouse", to: "warehouse", v: 94, online: 388, total: 412, incident: "Dock 4 door sensor, 06:40", color: palette.amber },
  { name: "Network / 5G", icon: "signal", to: "fiveg", v: 98, online: 2791, total: 2847, incident: "Low signal WC-07, 14:17", color: palette.blue },
];

const links = [
  { name: "5G Network", v: 99.8, latency: 8.4, tput: "4.7 Gbps", note: "6 / 6 sites on air", color: palette.cyan },
  { name: "Fiber (Core)", v: 99.5, latency: 1.2, tput: "40 Gbps", note: "12 / 12 gateways up", color: palette.green },
  { name: "Wi-Fi (Local)", v: 98.7, latency: 14, tput: "1.2 Gbps", note: "84 / 86 access points", color: palette.amber },
  { name: "Satellite (Backup)", v: 98.9, latency: 540, tput: "120 Mbps", note: "Standby, link healthy", color: palette.purple },
];

const cameras = [
  ["CAM-001", "Container Yard", 1, "Online"], ["CAM-002", "Main Gate", 1, "Online"], ["CAM-003", "Quay Area", 0, "Offline"],
  ["CAM-004", "Internal Roads", 1, "Online"], ["CAM-005", "Crane Area", 1, "Online"], ["CAM-006", "Warehouse", 1, "Online"],
  ["CAM-007", "Truck Parking", 1, "Online"], ["CAM-008", "Perimeter", 1, "Online"], ["CAM-009", "Night View", 1, "Online"],
] as const;

export function DetailsScreen({ tick, now, go, kind }: ScreenProps & { kind: DetailKind }) {
  const back = detailOwner[kind];
  const backBtn = (
    <button type="button" className="al-back" onClick={() => go(back)}>
      ← Back to {back === "overview" ? "Overview" : "Surveillance"}
    </button>
  );
  const labels = rangeLabels("24h", now);

  if (kind === "health") {
    const kpis: KpiDef[] = [
      { label: "Overall Health", value: 96.8, decimals: 1, suffix: "%", delta: 0.6, icon: "activity", accent: "green" },
      { label: "Devices Online", value: 5315, delta: 1.4, icon: "chip", accent: "blue" },
      { label: "Systems Healthy", value: 6, delta: 0, icon: "shieldcheck", accent: "cyan", note: "/ 6" },
      { label: "Open Incidents", value: 3, delta: -57, lowerIsBetter: true, icon: "warn", accent: "red" },
    ];
    const trend = labels.map((x, i) => ({ x, a: Math.round(wave(i, 7, 96.5, 0.01, 1, tick) * 10) / 10, b: Math.round(wave(i, 7, 94.5, 0.012, 2, tick) * 10) / 10 }));
    return (
      <div className="screen vb-grid">
        <PageTitle icon="activity" title="Systems Health Details" subtitle="Every system, its devices, last incident and health trend." />
        <KpiRow items={kpis} tick={tick} />
        <div className="vb-main dt">
          <Panel title="All Systems" icon="list" right={backBtn} className="grow">
            <table className="tbl big">
              <thead><tr><th>System</th><th>Status</th><th>Health</th><th>Devices online</th><th>Last incident</th><th /></tr></thead>
              <tbody>
                {systems.map((s, i) => {
                  const v = Math.min(100, live(s.v, tick, i, 0.006));
                  return (
                    <tr key={s.name} onClick={() => go(s.to)}>
                      <td><i style={{ color: s.color }}><Icon name={s.icon} size={18} /></i> {s.name}</td>
                      <td><b className="pill t-ok">Healthy</b></td>
                      <td className="cell-bar"><Bar2 value={v} color={s.color} /> <span>{fmt(v)}%</span></td>
                      <td>{fmt(s.online)} / {fmt(s.total)}</td>
                      <td className="muted">{s.incident}</td>
                      <td><span className="go">Open →</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
          <Panel title="Health Trend (24 h)" icon="bars">
            <DualArea data={trend} aName="Best system" bName="Lowest system" aColor={palette.green} bColor={palette.amber} domain={[90, 100]} />
          </Panel>
        </div>
      </div>
    );
  }

  if (kind === "connectivity") {
    const kpis: KpiDef[] = [
      { label: "Overall Connectivity", value: 99.2, decimals: 1, suffix: "%", delta: 0.3, icon: "wifi", accent: "cyan" },
      { label: "5G Sites", value: 6, delta: 0, icon: "signal", accent: "green", note: "/ 6" },
      { label: "Gateways", value: 12, delta: 0, icon: "server", accent: "blue", note: "/ 12" },
      { label: "Edge Nodes", value: 8, delta: 0, icon: "chip", accent: "purple", note: "/ 8" },
    ];
    const trend = labels.map((x, i) => ({ x, a: Math.round(wave(i, 7, 99.4, 0.003, 1, tick) * 100) / 100, b: Math.round(wave(i, 7, 98.8, 0.004, 2, tick) * 100) / 100 }));
    return (
      <div className="screen vb-grid">
        <PageTitle icon="wifi" title="Port Connectivity Details" subtitle="Every link: availability, latency, throughput and node status." />
        <KpiRow items={kpis} tick={tick} />
        <div className="vb-main dt">
          <Panel title="All Links" icon="list" right={backBtn} className="grow">
            <table className="tbl big">
              <thead><tr><th>Link</th><th>Availability</th><th>Latency</th><th>Throughput</th><th>Nodes</th></tr></thead>
              <tbody>
                {links.map((l, i) => {
                  const v = Math.min(100, live(l.v, tick, i, 0.002));
                  return (
                    <tr key={l.name}>
                      <td><i style={{ color: l.color }}><Icon name="wifi" size={18} /></i> {l.name}</td>
                      <td className="cell-bar"><Bar2 value={v} color={l.color} /> <span>{fmt(v, 1)}%</span></td>
                      <td>{fmt(live(l.latency, tick, i, 0.04), 1)} ms</td>
                      <td>{l.tput}</td>
                      <td className="muted">{l.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="conn">
              <Donut size={120} center="99.2%" sub="Overall" slices={links.map((l) => ({ name: l.name, value: l.v, color: l.color }))} />
              <Legend rows={links.map((l) => ({ name: l.name, value: `${l.v}%`, color: l.color }))} />
            </div>
          </Panel>
          <Panel title="Availability Trend (24 h)" icon="bars">
            <DualArea data={trend} aName="5G + Fiber" bName="Wi-Fi + Satellite" aColor={palette.cyan} bColor={palette.purple} domain={[97, 100]} />
          </Panel>
        </div>
      </div>
    );
  }

  const kpis: KpiDef[] = [
    { label: "Cameras Online", value: 242, delta: 1.2, icon: "camera", accent: "green", note: "/ 248" },
    { label: "Detections Today", value: 18420, delta: 9.4, icon: "scan", accent: "blue" },
    { label: "AI Accuracy", value: 98.7, decimals: 1, suffix: "%", delta: 0.4, icon: "shieldcheck", accent: "cyan" },
    { label: "Storage Used", value: 62, suffix: "%", delta: 1.1, icon: "server", accent: "purple" },
  ];
  const trend = labels.map((x, i) => ({ x, a: Math.round(wave(i, 7, 105, 0.6, 1, tick)), b: Math.round(wave(i, 7, 70, 0.55, 2.2, tick)) }));
  return (
    <div className="screen vb-grid">
      <PageTitle icon="camera" title="Surveillance Analytics Details" subtitle="Detections, uptime and storage for every camera." />
      <KpiRow items={kpis} tick={tick} />
      <div className="vb-main dt">
        <Panel title="All Cameras" icon="list" right={backBtn} className="grow">
          <table className="tbl big">
            <thead><tr><th>Camera</th><th>Zone</th><th>Status</th><th>Motion</th><th>Person</th><th>Vehicle</th><th>Uptime</th></tr></thead>
            <tbody>
              {cameras.map(([id, zone, up, status], i) => (
                <tr key={id}>
                  <td>{id}</td>
                  <td>{zone}</td>
                  <td><b className={`pill ${up ? "t-ok" : "t-alert"}`}>{status}</b></td>
                  <td>{up ? fmt(live(420 + i * 37, tick, i, 0.05)) : "—"}</td>
                  <td>{up ? fmt(live(180 + i * 21, tick, i + 2, 0.05)) : "—"}</td>
                  <td>{up ? fmt(live(120 + i * 15, tick, i + 4, 0.05)) : "—"}</td>
                  <td className="cell-bar"><Bar2 value={up ? 99 - (i % 3) : 0} color={up ? palette.green : palette.red} /> <span>{up ? `${99 - (i % 3)}%` : "0%"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Camera Activity (24 h)" icon="bars">
          <DualArea data={trend} aName="Motion" bName="Person" aColor={palette.blue} bColor={palette.purple} />
        </Panel>
      </div>
    </div>
  );
}
