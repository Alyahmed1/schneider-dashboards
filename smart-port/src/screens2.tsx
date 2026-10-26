import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Bar2,
  Bars,
  Hot,
  Donut,
  DualArea,
  EventList,
  Icon,
  KpiRow,
  Legend,
  LiveBadge,
  MiniStats,
  PageTitle,
  Photo,
  Panel,
  RangeSelect,
  ViewAll,
  fmt,
  live,
  palette,
  rangeLabels,
  useFeed,
  wave,
  type EventRow,
  type KpiDef,
  type Range,
} from "./ui";
import type { ScreenProps } from "./screens";


/* ═══════════════ shared: zoomable live map (monitoring + vehicles) ═══════════════ */

function ZoomMap({ title, src, ratio, children }: { title: string; src: string; ratio: number; children: ReactNode }) {
  const [zoom, setZoom] = useState(1);
  return (
    <Panel title={title} right={<span className="rt"><i /> {title === "Live Fleet View" ? "Real-time tracking" : "Real-time view"}</span>} className="grow">
      <Photo
        src={src}
        ratio={ratio}
        mode="natural"
        className="live-photo"
        zoom={zoom}
        overlay={
          <div className="zoom-ctl">
            <button type="button" onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.4).toFixed(1)))} aria-label="Zoom in">+</button>
            <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.4).toFixed(1)))} aria-label="Zoom out">−</button>
            <button type="button" onClick={() => setZoom(1)} aria-label="Reset view"><Icon name="pin" size={16} /></button>
          </div>
        }
      >
        {children}
      </Photo>
    </Panel>
  );
}

/* ═══════════════ MONITORING CENTER (image 9) ═══════════════ */

const monEvents: EventRow[] = [
  { title: "Access Control Granted", detail: "Truck A27-582 entered Gate 3", time: "10:18 AM", tone: "ok", icon: "shieldcheck" },
  { title: "Crane Operation Normal", detail: "Crane C1 running at 78% capacity", time: "09:56 AM", tone: "violet", icon: "crane" },
  { title: "Temperature Alert Resolved", detail: "Reefer container RFTU334 stabilized", time: "09:42 AM", tone: "ok", icon: "thermo" },
  { title: "Vehicle Departed", detail: "Truck B86-716 exited the port", time: "09:21 AM", tone: "info", icon: "truck" },
  { title: "Hardware Fault Detected", detail: "Conveyor CV-2 - sensor fault", time: "08:47 AM", tone: "alert", icon: "warn" },
];

const monPool: Omit<EventRow, "time">[] = [
  { title: "Access Control Granted", detail: "Truck C14-209 entered Gate 1", tone: "ok", icon: "shieldcheck" },
  { title: "Crane Cycle Complete", detail: "Crane C3 finished a 2.7 min cycle", tone: "violet", icon: "crane" },
  { title: "Vessel Berthed", detail: "MV Horizon docked at Berth 2", tone: "info", icon: "ship" },
  { title: "Camera Reconnected", detail: "CAM-006 Warehouse back online", tone: "ok", icon: "camera" },
  { title: "Alarm Acknowledged", detail: "Operator 3 took AL-2040", tone: "ok", icon: "check" },
];

const monSpots = [
  { label: "Surveillance (vessel berth cameras)", tag: "Surveillance", x: 32.7, y: 11.4, to: "surveillance" },
  { label: "Cranes", tag: "Cranes", x: 48, y: 24, to: "cranes" },
  { label: "Surveillance (vessel berth cameras)", tag: "Surveillance", x: 87.5, y: 25.6, to: "surveillance" },
  { label: "Private 5G", tag: "Private 5G", x: 62.5, y: 37, to: "fiveg" },
  { label: "Vehicles", tag: "Vehicles", x: 24.7, y: 41.9, to: "vehicles" },
  { label: "Vehicles", tag: "Vehicles", x: 88.4, y: 47.8, to: "vehicles" },
  { label: "Vehicles", tag: "Vehicles", x: 47, y: 70, to: "vehicles" },
  { label: "Vehicles", tag: "Vehicles", x: 71.2, y: 69.8, to: "vehicles" },
  { label: "Vehicles", tag: "Vehicles", x: 26, y: 79, to: "vehicles" },
  { label: "Access Control", tag: "Access Control", x: 53, y: 84.4, to: "access" },
];

export function MonitoringScreen({ tick, go }: ScreenProps) {
  const feed = useFeed(monEvents, monPool);
  const kpis: KpiDef[] = [
    { label: "Active Incidents", value: 3, delta: -57, lowerIsBetter: true, icon: "warn", accent: "red" },
    { label: "Connected Assets", value: 1248, delta: 12, icon: "server", accent: "cyan" },
    { label: "System Health", value: 98.7, decimals: 1, suffix: "%", delta: 0.5, icon: "activity", accent: "green" },
    { label: "Response Time", value: 1.8, decimals: 1, suffix: " min", delta: -33, lowerIsBetter: true, icon: "clock", accent: "purple" },
  ];
  const health = [
    { n: "Cranes", icon: "crane", v: 96, c: palette.blue, to: "cranes" },
    { n: "Vehicles", icon: "truck", v: 94, c: palette.green, to: "vehicles" },
    { n: "Access Control", icon: "shield", v: 99, c: palette.blue, to: "access" },
    { n: "Surveillance", icon: "camera", v: 97, c: palette.purple, to: "surveillance" },
    { n: "Network / 5G", icon: "signal", v: 98, c: palette.cyan, to: "fiveg" },
  ];

  return (
    <div className="screen vc mon">
      <KpiRow items={kpis} tick={tick} spark />
      <div className="vc-mid">
        <ZoomMap title="Live Operations" src="/photos/monitoring-map.jpg" ratio={932 / 473}>
          {monSpots.map((p, i) => (
            <Hot key={i} x={p.x} y={p.y} label={`Open ${p.label}`} tag={p.tag} onClick={() => go(p.to)} />
          ))}
        </ZoomMap>
        <Panel title="Recent Events" icon="activity" right={<ViewAll label="View all →" onClick={() => go("alerts:monitoring")} />}>
          <EventList rows={feed} max={5} />
        </Panel>
      </div>
      <Panel title="System Health" icon="bars" className="vc-health">
        <ul className="health-row">
          {health.map((h, i) => {
            const v = Math.min(100, live(h.v, tick, i + 1, 0.006));
            return (
              <li key={h.n} onClick={() => go(h.to)}>
                <i style={{ color: h.c }}><Icon name={h.icon} size={26} /></i>
                <div>
                  <span>{h.n}</span>
                  <strong>{fmt(v)}%</strong>
                </div>
                <Bar2 value={v} color={h.c} />
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

/* ═══════════════ VEHICLES (image 10) ═══════════════ */

/* Vehicle icons already drawn into fleet-map.jpg (% of the photo). */
const fleet = [
  { id: "T-042", kind: "Truck", status: "In Transit", x: 37.3, y: 42.8 },
  { id: "TR-301", kind: "Trailer", status: "Departing", x: 61.3, y: 36.4 },
  { id: "TR-214", kind: "Trailer", status: "Idle", x: 17.2, y: 65.7 },
  { id: "TR-276", kind: "Trailer", status: "Delayed", x: 47.3, y: 57.2 },
  { id: "SV-08", kind: "Service vehicle", status: "On site", x: 57.3, y: 65.2 },
  { id: "TR-310", kind: "Trailer", status: "In Transit", x: 65.9, y: 81.3 },
  { id: "T-067", kind: "Truck", status: "Waiting", x: 29.2, y: 83.7 },
  { id: "T-118", kind: "Truck", status: "Loading", x: 87.7, y: 71.4 },
  { id: "F-17", kind: "Forklift", status: "Working", x: 86.7, y: 47.3 },
  { id: "TR-088", kind: "Trailer", status: "Parked", x: 93.9, y: 12.8 },
];

/* Each vehicle has its own loop in its own part of the 880 x 423 photo, so no two routes ever cross. */
const movers = [
  { path: "M110,250 L200,236 L270,300 L200,370 L120,330 Z", c: palette.blue, dur: 24, off: 0 },
  { path: "M290,150 L370,140 L400,200 L330,230 L280,200 Z", c: palette.blue, dur: 20, off: 5 },
  { path: "M420,260 L480,240 L500,290 L440,320 L410,300 Z", c: palette.green, dur: 18, off: 2 },
  { path: "M520,110 L610,110 L640,170 L560,190 L520,160 Z", c: palette.green, dur: 22, off: 8 },
  { path: "M720,170 L800,150 L820,230 L740,250 Z", c: palette.amber, dur: 19, off: 3 },
  { path: "M600,330 L700,320 L760,340 L700,390 L610,380 Z", c: palette.purple, dur: 25, off: 11 },
  { path: "M780,30 L850,40 L850,100 L790,90 Z", c: palette.blue, dur: 16, off: 6 },
];

const vehEvents: EventRow[] = [
  { title: "Truck #T-042 entered Gate 3", detail: "Inbound - Container Delivery", time: "10:18 AM", tone: "info", icon: "truck" },
  { title: "Forklift #F-17 completed loading", detail: "Warehouse B - Zone 2", time: "09:56 AM", tone: "watch", icon: "box" },
  { title: "Trailer #TR-301 departed port", detail: "Export - Gate 2", time: "09:42 AM", tone: "ok", icon: "truck" },
  { title: "Service vehicle #SV-08 on site", detail: "Maintenance - Yard", time: "09:21 AM", tone: "violet", icon: "wrench" },
  { title: "Truck #T-067 waiting for inspection", detail: "Gate 1", time: "08:47 AM", tone: "info", icon: "truck" },
  { title: "Trailer #TR-276 delayed", detail: "Traffic congestion - Main Road", time: "08:32 AM", tone: "alert", icon: "warn" },
];

const vehPool: Omit<EventRow, "time">[] = [
  { title: "Truck #T-118 entered Gate 1", detail: "Inbound - Bulk Delivery", tone: "info", icon: "truck" },
  { title: "Forklift #F-09 completed loading", detail: "Warehouse A - Zone 4", tone: "watch", icon: "box" },
  { title: "Trailer #TR-310 departed port", detail: "Export - Gate 4", tone: "ok", icon: "truck" },
  { title: "Truck #T-201 flagged for speeding", detail: "Main Road - 41 km/h", tone: "alert", icon: "warn" },
];

export function VehiclesScreen({ tick, now, go }: ScreenProps) {
  const [sel, setSel] = useState("T-042");
  const feed = useFeed(vehEvents, vehPool);
  const kpis: KpiDef[] = [
    { label: "Total Vehicles", value: 184, delta: 6, icon: "truck", accent: "cyan" },
    { label: "Active Vehicles", value: 158, delta: 8, icon: "shieldcheck", accent: "green" },
    { label: "Idle Vehicles", value: 26, delta: -12, icon: "warn", accent: "red" },
    { label: "Avg. Turnaround Time", value: 42, suffix: " min", delta: -18, lowerIsBetter: true, icon: "clock", accent: "purple" },
  ];
  const labels = rangeLabels("24h", now);
  const flow = labels.map((x, i) => ({ x, a: Math.round(wave(i, 7, 80, 0.45, 1.3, tick)), b: Math.round(wave(i, 7, 75, 0.45, 2.7, tick)) }));
  const breakdown = [
    { n: "Trucks", v: 112, c: palette.blue },
    { n: "Trailers", v: 48, c: palette.green },
    { n: "Forklifts", v: 18, c: palette.amber },
    { n: "Service Vehicles", v: 6, c: palette.purple },
  ];
  const active = Math.round(live(158, tick, 1, 0.01));
  const cur = fleet.find((f) => f.id === sel) ?? fleet[0];

  return (
    <div className="screen vc veh">
      <KpiRow items={kpis} tick={tick} spark />
      <div className="vc-mid">
        <ZoomMap title="Live Fleet View" src="/photos/fleet-map.jpg" ratio={880 / 423}>
          <svg className="route-layer" viewBox="0 0 880 423" aria-hidden>
            {movers.map((m, i) => (
              <g key={i} style={{ color: m.c }}>
                <circle r="13" fill="currentColor" opacity="0.22" />
                <circle r="6.5" fill="currentColor" stroke="#fff" strokeWidth="1.5" />
                <animateMotion dur={`${m.dur}s`} begin={`-${m.off}s`} repeatCount="indefinite" path={m.path} />
              </g>
            ))}
          </svg>
          {fleet.map((f) => (
            <Hot key={f.id} x={f.x} y={f.y} size={40} label={`${f.kind} #${f.id}`} active={sel === f.id} onClick={() => setSel(f.id)} />
          ))}
          <span className="sel-chip">
            <b>{cur.kind} #{cur.id}</b> {cur.status} · {fmt(18 + Math.abs(Math.sin(tick + cur.x)) * 22)} km/h
          </span>
        </ZoomMap>
        <Panel title="Recent Events" icon="truck" right={<ViewAll label="View all →" onClick={() => go("alerts:vehicles")} />}>
          <EventList rows={feed} max={6} compact />
        </Panel>
      </div>
      <div className="vc-bot">
        <Panel title="Vehicle Flow" icon="truck" right={<span className="flow-key"><i style={{ background: palette.green }} />In <i style={{ background: palette.blue }} />Out</span>}>
          <DualArea data={flow} aName="In" bName="Out" aColor={palette.green} bColor={palette.blue} type="line" />
        </Panel>
        <Panel title="Fleet Utilization" icon="truck">
          <div className="conn">
            <Donut size={128} center="86%" sub="Active" slices={[
              { name: "Active", value: active, color: palette.green },
              { name: "Idle", value: 26, color: palette.amber },
              { name: "Maintenance", value: 8, color: palette.purple },
              { name: "Out of Service", value: 4, color: palette.red },
            ]} />
            <Legend rows={[
              { name: "Active", value: String(active), color: palette.green },
              { name: "Idle", value: "26", color: palette.amber },
              { name: "Maintenance", value: "8", color: palette.purple },
              { name: "Out of Service", value: "4", color: palette.red },
            ]} />
          </div>
        </Panel>
        <Panel title="Fleet Breakdown" icon="truck">
          <ul className="feed-bars brk">
            {breakdown.map((b) => (
              <li key={b.n}>
                <span>{b.n}</span>
                <Bar2 value={(b.v / 120) * 100} color={b.c} />
                <b>{b.v}</b>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════ WAREHOUSE — zone heatmap + cold chain ═══════════════ */

const zones = [
  "A1", "A2", "A3", "A4",
  "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4",
];

const whPool: Omit<EventRow, "time">[] = [
  { title: "RFID read", detail: "Pallet 4412 located in B3", tone: "ok", icon: "scan" },
  { title: "Dock 2 door opened", detail: "Inbound truck T-311", tone: "info", icon: "gate" },
  { title: "Humidity warning", detail: "Zone C2 at 71% RH", tone: "watch", icon: "drop" },
  { title: "Forklift route cleared", detail: "Aisle D free again", tone: "ok", icon: "check" },
];

export function WarehouseScreen({ tick, now, go }: ScreenProps) {
  const [range, setRange] = useState<Range>("24h");
  const [zone, setZone] = useState("B2");
  const feed = useFeed([{ title: "Cold room recovered", detail: "Cold 1 back to -18°C", time: "09:42", tone: "ok", icon: "thermo" }], whPool);
  const kpis: KpiDef[] = [
    { label: "Inventory Accuracy", value: 99.1, decimals: 1, suffix: "%", delta: 0.6, icon: "scan", accent: "green" },
    { label: "Storage Utilization", value: 74, suffix: "%", delta: 2.4, icon: "warehouse", accent: "amber" },
    { label: "Picks Today", value: 960, delta: 8, icon: "box", accent: "cyan" },
    { label: "Environment Alarms", value: 1, delta: -50, lowerIsBetter: true, icon: "thermo", accent: "red" },
  ];
  const labels = rangeLabels(range, now);
  const picks = labels.map((x, i) => ({ x, a: Math.round(wave(i, labels.length, 150, 0.5, 1.1, tick)), b: Math.round(wave(i, labels.length, 120, 0.45, 2.4, tick)) }));
  const fill = (_z: string, i: number) => Math.round(Math.min(98, live(48 + ((i * 37) % 46), tick, i, 0.05)));
  const temps = [
    { n: "Cold Room 1", v: -18, u: "°C", ok: true },
    { n: "Cold Room 2", v: -17.2, u: "°C", ok: true },
    { n: "Ambient Hall", v: 24.6, u: "°C", ok: true },
    { n: "Bonded Aisle", v: 29.8, u: "°C", ok: false },
  ];

  return (
    <div className="screen vb-grid">
      <PageTitle icon="warehouse" title="Warehouse Management" subtitle="Inventory tracking, RFID, environmental sensors and automated loading." />
      <KpiRow items={kpis} tick={tick} />
      <div className="vb-main wh">
        <Panel title="Zone Occupancy" icon="warehouse" right={<LiveBadge />}>
          <div className="heat">
            {zones.map((z, i) => {
              const f = fill(z, i);
              const c = f > 85 ? palette.red : f > 70 ? palette.amber : f > 50 ? palette.blue : palette.green;
              return (
                <button type="button" key={z} className={zone === z ? "on" : ""} style={{ background: `linear-gradient(0deg, ${c}66 ${f}%, rgba(10,30,70,.6) ${f}%)`, borderColor: `${c}99` }} onClick={() => setZone(z)}>
                  <b>{z}</b>
                  <span>{f}%</span>
                </button>
              );
            })}
          </div>
          <p className="muted foot">Selected zone <b>{zone}</b>: {fill(zone, zones.indexOf(zone))}% full · {fmt(live(340, tick, 4, 0.02))} pallets · RFID scanning</p>
        </Panel>
        <div className="col">
          <Panel title="Picks & Puts" icon="bars" right={<RangeSelect value={range} onChange={setRange} />} className="grow">
            <Bars data={picks} color={palette.cyan} color2={palette.purple} names={["Picks", "Puts"]} />
          </Panel>
          <Panel title="Environmental Sensors" icon="thermo">
            <ul className="temp-list">
              {temps.map((t, i) => (
                <li key={t.n} className={t.ok ? "" : "warn"}>
                  <span>{t.n}</span>
                  <strong>{fmt(live(Math.abs(t.v), tick, i, 0.01) * Math.sign(t.v), 1)}{t.u}</strong>
                  <em>{t.ok ? "Normal" : "High"}</em>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="col">
          <Panel title="Automated Loading" icon="truck">
            <MiniStats items={[
              { icon: "gate", label: "Docks Active", value: "9 / 10", accent: "cyan" },
              { icon: "truck", label: "Trucks Waiting", value: "3", accent: "amber" },
              { icon: "scan", label: "RFID Scan Rate", value: "99.1%", delta: "0.4%", accent: "green" },
              { icon: "clock", label: "Dwell Time", value: "38 min", delta: "6%", down: true, accent: "blue" },
            ]} />
          </Panel>
          <Panel title="Warehouse Events" icon="doc" right={<ViewAll onClick={() => go("alerts:warehouse")} />} className="grow">
            <EventList rows={feed} max={6} compact />
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ HARDWARE FAILURE — predictive maintenance ═══════════════ */

const assets = [
  { n: "Conveyor CV-07", place: "Yard belt", health: 38, rul: 4, issue: "Sensor lost", tone: "alert" },
  { n: "Hoist Motor QC-2", place: "Crane QC-02", health: 61, rul: 19, issue: "Winding heat", tone: "watch" },
  { n: "Bearing B", place: "Yard belt", health: 66, rul: 27, issue: "Vibration trend", tone: "watch" },
  { n: "Gearbox RTG-7", place: "Block C", health: 88, rul: 96, issue: "Normal", tone: "ok" },
  { n: "Pump 3", place: "Power hall", health: 93, rul: 140, issue: "Normal", tone: "ok" },
  { n: "PLC Gate 2", place: "Gate cabinet", health: 97, rul: 210, issue: "Normal", tone: "ok" },
];

const hwPool: Omit<EventRow, "time">[] = [
  { title: "Vibration rising", detail: "Bearing B +0.4 mm/s in 1 h", tone: "watch", icon: "activity", badge: "Watch" },
  { title: "RUL recalculated", detail: "Hoist Motor QC-2 now 18 days", tone: "info", icon: "clock", badge: "AI" },
  { title: "Work order created", detail: "WO-5521 for conveyor CV-07", tone: "violet", icon: "wrench", badge: "Maint." },
  { title: "Thermal anomaly", detail: "Motor 14 winding at 92°C", tone: "alert", icon: "thermo", badge: "Alert" },
];

export function HardwareScreen({ tick, now, go }: ScreenProps) {
  const [range, setRange] = useState<Range>("24h");
  const [sel, setSel] = useState(0);
  const feed = useFeed([{ title: "Conveyor fault", detail: "CV-07 sensor lost, crew sent", time: "08:47", tone: "alert", icon: "warn", badge: "Alert" }], hwPool);
  const kpis: KpiDef[] = [
    { label: "Assets Monitored", value: 320, delta: 1, icon: "chip", accent: "cyan" },
    { label: "Predicted Failures", value: 7, delta: 2, lowerIsBetter: true, icon: "warn", accent: "red" },
    { label: "Avg. Remaining Life", value: 18, suffix: " days", delta: -3, lowerIsBetter: true, icon: "clock", accent: "purple" },
    { label: "Downtime Avoided", value: 41, suffix: " h", delta: 12, icon: "shieldcheck", accent: "green" },
  ];
  const labels = rangeLabels(range, now);
  const vib = labels.map((x, i) => ({ x, a: Math.round(wave(i, labels.length, 32, 0.3, 1.2, tick, 0.5) * 10) / 10, b: Math.round(wave(i, labels.length, 68, 0.15, 2.2, tick, 0.2)) }));
  const a = assets[sel];

  return (
    <div className="screen vb-grid">
      <PageTitle icon="gear" title="Hardware Failure Prediction" subtitle="AI predictive maintenance with vibration, temperature and current monitoring." />
      <KpiRow items={kpis} tick={tick} />
      <div className="vb-main hw">
        <Panel title="Asset Health & Remaining Useful Life" icon="chip" right={<ViewAll onClick={() => go("alerts:hardware")} />} className="grow">
          <ul className="asset-list">
            {assets.map((x, i) => (
              <li key={x.n} className={sel === i ? "on" : ""} onClick={() => setSel(i)}>
                <div><strong>{x.n}</strong><span>{x.place} · {x.issue}</span></div>
                <Bar2 value={Math.min(100, live(x.health, tick, i, 0.01))} color={x.tone === "alert" ? palette.red : x.tone === "watch" ? palette.amber : palette.green} />
                <b className={`rul t-${x.tone}`}>{x.rul} d</b>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="col">
          <Panel title={`${a.n} · Sensor Trend`} icon="activity" right={<RangeSelect value={range} onChange={setRange} />} className="grow">
            <DualArea data={vib} aName="Vibration (mm/s)" bName="Temperature (°C)" aColor={palette.amber} bColor={palette.red} type="line" />
          </Panel>
          <Panel title="Thermal Scan" icon="thermo">
            <div className="thermal">
              <span className="hot" style={{ left: "38%", top: "44%" }} />
              <span className="hot h2" style={{ left: "62%", top: "58%" }} />
              <em>Peak {fmt(live(92, tick, 1, 0.02))}°C</em>
            </div>
          </Panel>
        </div>
        <div className="col">
          <Panel title="Selected Asset" icon="gauge">
            <div className="conn">
              <Donut size={112} center={`${a.rul}d`} sub="RUL" slices={[
                { name: "Health", value: a.health, color: a.tone === "alert" ? palette.red : a.tone === "watch" ? palette.amber : palette.green },
                { name: "Wear", value: 100 - a.health, color: "rgba(90,130,200,.25)" },
              ]} />
              <Legend rows={[
                { name: "Health score", value: `${a.health}%`, color: palette.green },
                { name: "Confidence", value: "94%", color: palette.cyan },
                { name: "Next service", value: `${Math.max(1, Math.round(a.rul / 3))} d`, color: palette.purple },
              ]} />
            </div>
          </Panel>
          <Panel title="Predictions & Work Orders" icon="doc" right={<ViewAll onClick={() => go("alerts:hardware")} />} className="grow">
            <EventList rows={feed} max={5} compact />
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ POWER — energy dashboard ═══════════════ */

const pwrPool: Omit<EventRow, "time">[] = [
  { title: "Solar peak", detail: "Warehouse roof at 410 kW", tone: "ok", icon: "sun" },
  { title: "Feeder B above plan", detail: "Crane row drawing 1.1 MW", tone: "watch", icon: "bolt" },
  { title: "Demand shifted", detail: "Cold store pre-cooled off-peak", tone: "violet", icon: "leaf" },
  { title: "Meter 14 reconnected", detail: "Gate house reporting again", tone: "ok", icon: "check" },
];

export function PowerScreen({ tick, now, go }: ScreenProps) {
  const [range, setRange] = useState<Range>("24h");
  const feed = useFeed([{ title: "Meter 14 silent", detail: "Gate house not reporting", time: "09:28", tone: "alert", icon: "warn" }], pwrPool);
  const kpis: KpiDef[] = [
    { label: "Power Demand", value: 2.4, decimals: 1, suffix: " MW", delta: -3.1, lowerIsBetter: true, icon: "bolt", accent: "amber" },
    { label: "Energy Efficiency", value: 92.4, decimals: 1, suffix: "%", delta: 3.2, icon: "leaf", accent: "green" },
    { label: "Solar Generation", value: 410, suffix: " kW", delta: 14, icon: "sun", accent: "cyan" },
    { label: "Smart Meters Online", value: 84, delta: 0, icon: "gauge", accent: "blue", note: "/ 86" },
  ];
  const labels = rangeLabels(range, now);
  const load = labels.map((x, i) => ({ x, a: Math.round(wave(i, labels.length, 2.2, 0.28, 1.1, tick) * 100) / 100, b: Math.round(wave(i, labels.length, 2.1, 0.22, 1.5, 0) * 100) / 100 }));
  const feeders = [
    { n: "Feeder A · Substation", v: 62, c: palette.green },
    { n: "Feeder B · Crane row", v: 88, c: palette.amber },
    { n: "Feeder C · Cold store", v: 54, c: palette.cyan },
    { n: "Feeder D · Yards", v: 41, c: palette.blue },
  ];

  return (
    <div className="screen vb-grid">
      <PageTitle icon="bolt" title="Power Management" subtitle="Smart meters, energy optimization and electrical asset monitoring." />
      <KpiRow items={kpis} tick={tick} />
      <div className="vb-main pw">
        <Panel title="Load vs Plan (MW)" icon="activity" right={<><LiveBadge /><RangeSelect value={range} onChange={setRange} /></>} className="grow wide">
          <DualArea data={load} aName="Actual load" bName="Planned load" aColor={palette.amber} bColor={palette.blue} />
        </Panel>
        <div className="col">
          <Panel title="Feeder Loading" icon="bolt">
            <ul className="feed-bars">
              {feeders.map((f, i) => (
                <li key={f.n}>
                  <span>{f.n}</span>
                  <Bar2 value={Math.min(100, live(f.v, tick, i, 0.04))} color={f.c} />
                  <b>{fmt(Math.min(100, live(f.v, tick, i, 0.04)))}%</b>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Energy Mix" icon="leaf">
            <div className="conn">
              <Donut size={104} center="2.4 MW" slices={[
                { name: "Cranes", value: 46, color: palette.amber },
                { name: "Cold storage", value: 22, color: palette.cyan },
                { name: "Yards", value: 18, color: palette.blue },
                { name: "Other", value: 14, color: palette.purple },
              ]} />
              <Legend rows={[
                { name: "Cranes", value: "46%", color: palette.amber },
                { name: "Cold storage", value: "22%", color: palette.cyan },
                { name: "Yards", value: "18%", color: palette.blue },
                { name: "Other", value: "14%", color: palette.purple },
              ]} />
            </div>
          </Panel>
        </div>
        <Panel title="Electrical Events" icon="doc" right={<ViewAll onClick={() => go("alerts:power")} />}>
          <EventList rows={feed} max={6} />
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════ WATER — tanks, pressure, leaks ═══════════════ */

const tanks = [
  { n: "Roof Tank 1", v: 78 },
  { n: "Pier Tank", v: 64 },
  { n: "Cold Plant", v: 52 },
  { n: "Fire Reserve", v: 94 },
];

const wPool: Omit<EventRow, "time">[] = [
  { title: "Pressure stabilised", detail: "Pier loop back to 4.2 bar", tone: "ok", icon: "gauge" },
  { title: "Leak suspected", detail: "Hydrant 6 flow +8% overnight", tone: "alert", icon: "drop" },
  { title: "Bunkering started", detail: "Berth 2 fresh water supply", tone: "info", icon: "ship" },
  { title: "Meter W7 reconnected", detail: "Gate meter reporting", tone: "ok", icon: "check" },
];

export function WaterScreen({ tick, now, go }: ScreenProps) {
  const [range, setRange] = useState<Range>("24h");
  const feed = useFeed([{ title: "Hydrant 6 leak", detail: "Yard south, crew on the way", time: "09:33", tone: "alert", icon: "drop" }], wPool);
  const kpis: KpiDef[] = [
    { label: "Water Used Today", value: 640, suffix: " m³", delta: -2, lowerIsBetter: true, icon: "drop", accent: "cyan" },
    { label: "Network Pressure", value: 4.2, decimals: 1, suffix: " bar", delta: 0, icon: "gauge", accent: "blue" },
    { label: "Meters Online", value: 21, delta: 0, icon: "chip", accent: "green", note: "/ 22" },
    { label: "Leak Flags", value: 1, delta: 100, lowerIsBetter: true, icon: "warn", accent: "red" },
  ];
  const labels = rangeLabels(range, now);
  const use = labels.map((x, i) => ({ x, a: Math.round(wave(i, labels.length, 60, 0.5, 1.1, tick)), b: Math.round(wave(i, labels.length, 4.2, 0.06, 2, tick) * 10) / 10 * 10 }));

  return (
    <div className="screen vb-grid">
      <PageTitle icon="drop" title="Water Management" subtitle="Terminal consumption, network pressure, tank levels and leak detection." />
      <KpiRow items={kpis} tick={tick} />
      <div className="vb-main wt">
        <Panel title="Tank Levels" icon="tank" right={<LiveBadge />}>
          <div className="tanks">
            {tanks.map((t, i) => {
              const v = Math.min(99, live(t.v, tick, i, 0.03));
              return (
                <div key={t.n} className="tank">
                  <div className="tank-body">
                    <motion.i animate={{ height: `${v}%` }} transition={{ duration: 1.2 }} />
                    <b>{fmt(v)}%</b>
                  </div>
                  <span>{t.n}</span>
                </div>
              );
            })}
          </div>
        </Panel>
        <div className="col">
          <Panel title="Consumption & Pressure" icon="bars" right={<RangeSelect value={range} onChange={setRange} />} className="grow">
            <DualArea data={use} aName="Use (m³/h)" bName="Pressure ×10 (bar)" aColor={palette.cyan} bColor={palette.purple} />
          </Panel>
          <Panel title="Leak Watch" icon="drop">
            <ul className="temp-list">
              {[
                { n: "Hydrant 6 · Yard south", s: "Leak", w: true },
                { n: "Meter W7 · Gate", s: "Silent", w: true },
                { n: "Pier loop · Berth 2", s: "Normal", w: false },
              ].map((r) => (
                <li key={r.n} className={r.w ? "warn" : ""}><span>{r.n}</span><strong>{r.s}</strong><em>{r.w ? "Check" : "OK"}</em></li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="col">
          <Panel title="Usage by Area" icon="drop">
            <div className="conn">
              <Donut size={104} center="640 m³" slices={[
                { name: "Terminal", value: 46, color: palette.cyan },
                { name: "Ships", value: 28, color: palette.blue },
                { name: "Cold plant", value: 18, color: palette.purple },
                { name: "Other", value: 8, color: palette.amber },
              ]} />
              <Legend rows={[
                { name: "Terminal", value: "46%", color: palette.cyan },
                { name: "Ships", value: "28%", color: palette.blue },
                { name: "Cold plant", value: "18%", color: palette.purple },
                { name: "Other", value: "8%", color: palette.amber },
              ]} />
            </div>
          </Panel>
          <Panel title="Water Events" icon="doc" right={<ViewAll onClick={() => go("alerts:water")} />} className="grow">
            <EventList rows={feed} max={5} compact />
          </Panel>
        </div>
      </div>
    </div>
  );
}
