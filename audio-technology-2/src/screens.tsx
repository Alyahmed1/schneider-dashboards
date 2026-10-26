import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Bar2,
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
  clock,
  type EventRow,
  type KpiDef,
  type Range,
} from "./ui";

export type ScreenProps = { tick: number; now: Date; go: (id: string) => void };

function useSeries(range: Range, now: Date, tick: number, defs: { base: number; amp: number; salt: number; trend?: number }[]) {
  const labels = rangeLabels(range, now);
  return labels.map((x, i) => {
    const row: { x: string; a: number; b: number; c: number } = { x, a: 0, b: 0, c: 0 };
    defs.forEach((d, k) => {
      const v = Math.round(wave(i, labels.length, d.base, d.amp, d.salt + (range === "30d" ? 3 : range === "24h" ? 7 : 0), tick, d.trend));
      if (k === 0) row.a = v;
      if (k === 1) row.b = v;
      if (k === 2) row.c = v;
    });
    return row;
  });
}

/* ═══════════════════════ OVERVIEW (image 2) ═══════════════════════ */

const overviewEvents: EventRow[] = [
  { title: "Access Granted", detail: "Truck #A7-582 entered Gate 3", time: "10:18 AM", tone: "ok", icon: "shieldcheck" },
  { title: "Crane Operation Normal", detail: "Crane C1 running at 78% capacity", time: "09:56 AM", tone: "info", icon: "crane" },
  { title: "Temperature Alert Resolved", detail: "Reefer container RFU324 stabilized", time: "09:42 AM", tone: "violet", icon: "thermo" },
  { title: "Vehicle Departed", detail: "Truck #B4-116 exited the port", time: "09:21 AM", tone: "violet", icon: "truck" },
  { title: "Hardware Fault Detected", detail: "Conveyor CV-07 – sensor fault", time: "08:47 AM", tone: "alert", icon: "warn" },
  { title: "System Back Online", detail: "5G node 3 restored connectivity", time: "08:12 AM", tone: "ok", icon: "signal" },
];

const overviewPool: Omit<EventRow, "time">[] = [
  { title: "Access Granted", detail: "Truck #C2-904 entered Gate 1", tone: "ok", icon: "shieldcheck" },
  { title: "Crane Cycle Complete", detail: "QC-02 finished a 2.6 min cycle", tone: "info", icon: "crane" },
  { title: "Vehicle Departed", detail: "Truck #D1-377 exited the port", tone: "violet", icon: "truck" },
  { title: "Camera Reconnected", detail: "CAM-006 Warehouse back online", tone: "ok", icon: "camera" },
  { title: "Temperature Alert", detail: "Reefer RFU611 above band", tone: "watch", icon: "thermo" },
  { title: "5G Handover", detail: "AGV-04 moved to BS-02", tone: "info", icon: "signal" },
];

/* Positions (in % of the photo) of the icons already drawn into overview-map.jpg. */
const spots = [
  { id: "cranes", label: "Cranes", x: 35.7, y: 13.7 },
  { id: "vehicles", label: "Vehicles", x: 16.7, y: 38 },
  { id: "vehicles", label: "Vehicles", x: 30.4, y: 60.8 },
  { id: "vehicles", label: "Vehicles", x: 35.5, y: 86.5 },
  { id: "access", label: "Access Control", x: 86.4, y: 37.7 },
  { id: "access", label: "Access Control", x: 56.3, y: 60.5 },
  { id: "access", label: "Access Control", x: 67.6, y: 85.5 },
  { id: "surveillance", label: "Surveillance", x: 86.3, y: 7.8 },
  { id: "surveillance", label: "Surveillance", x: 10.4, y: 73 },
  { id: "fiveg", label: "Private 5G", x: 62.3, y: 37.7 },
];

export function OverviewScreen({ tick, now, go }: ScreenProps) {
  const [range, setRange] = useState<Range>("24h");
  const feed = useFeed(overviewEvents, overviewPool);
  const kpis: KpiDef[] = [
    { label: "Port Availability", value: 98.7, decimals: 1, suffix: "%", delta: 0.5, icon: "clock", accent: "green" },
    { label: "Active Devices", value: 1248, delta: 12, icon: "chip", accent: "blue" },
    { label: "Energy Efficiency", value: 92.4, decimals: 1, suffix: "%", delta: 3.2, icon: "leaf", accent: "green" },
    { label: "Critical Alerts", value: 3, delta: -62, lowerIsBetter: true, icon: "bell", accent: "red" },
  ];
  const health = [
    { name: "Cranes", icon: "crane", v: 98, color: palette.blue, go: "cranes" },
    { name: "Vehicles", icon: "truck", v: 96, color: palette.purple, go: "vehicles" },
    { name: "Access Control", icon: "shield", v: 99, color: palette.green, go: "access" },
    { name: "Surveillance", icon: "camera", v: 97, color: palette.cyan, go: "surveillance" },
    { name: "Warehouse", icon: "warehouse", v: 94, color: palette.amber, go: "warehouse" },
    { name: "Network / 5G", icon: "signal", v: 98, color: palette.blue, go: "fiveg" },
  ];
  const thr = useSeries("24h", now, tick, [
    { base: 900, amp: 0.45, salt: 1, trend: 0.15 },
    { base: 780, amp: 0.4, salt: 2.4, trend: 0.1 },
  ]).map((r) => ({ ...r, x: r.x }));
  const today = 12842 + tick * 9;
  const rangeCount = range === "24h" ? 186 : range === "7d" ? 1204 : 4981;

  return (
    <div className="screen ov">
      <KpiRow items={kpis} tick={tick} spark />
      <div className="ov-mid">
        <Panel title="Port Operations" right={<><LiveBadge /><RangeSelect value={range} onChange={setRange} /></>} className="grow">
          <Photo src="/photos/overview-map.jpg" ratio={824 / 406} mode="natural" className="map" overlay={<span className="map-count">{fmt(rangeCount)} events in range</span>}>
            {spots.map((p, i) => (
              <Hot key={i} x={p.x} y={p.y} label={`Open ${p.label}`} onClick={() => go(p.id)} />
            ))}
            <button type="button" className="pin tagged" style={{ left: "73%", top: "24%", color: palette.blue }} onClick={() => go("monitoring")} title="Open Monitoring Center">
              <Icon name="monitor" size={16} />
              <em>Monitoring Center</em>
            </button>
          </Photo>
        </Panel>
        <Panel title="Recent Events" right={<ViewAll label="View all →" onClick={() => go("alerts:overview")} />}>
          <EventList rows={feed} max={6} compact />
        </Panel>
      </div>
      <div className="ov-bot">
        <Panel title="Systems Health" right={<ViewAll label="View details →" onClick={() => go("details:health")} />}>
          <ul className="health">
            {health.map((h, i) => {
              const v = Math.min(100, live(h.v, tick, i + 2, 0.006));
              return (
                <li key={h.name} onClick={() => go(h.go)}>
                  <i style={{ color: h.color }}>
                    <Icon name={h.icon} size={15} />
                  </i>
                  <span>{h.name}</span>
                  <em><i /> Healthy</em>
                  <b>{fmt(v, 0)}%</b>
                  <Bar2 value={v} color={h.color} />
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Port Connectivity" right={<ViewAll label="View details →" onClick={() => go("details:connectivity")} />}>
          <div className="conn">
            <Donut size={128} center={`${fmt(Math.min(100, live(99.2, tick, 3, 0.002)), 1)}%`} sub="Overall Connectivity" slices={[
              { name: "5G Network", value: 99.8, color: palette.cyan },
              { name: "Fiber", value: 99.5, color: palette.green },
              { name: "Wi-Fi", value: 98.7, color: palette.amber },
              { name: "Satellite", value: 98.9, color: palette.purple },
            ]} />
            <Legend rows={[
              { name: "5G Network", value: "99.8%", color: palette.cyan },
              { name: "Fiber (Core)", value: "99.5%", color: palette.green },
              { name: "Wi-Fi (Local)", value: "98.7%", color: palette.amber },
              { name: "Satellite (Backup)", value: "98.9%", color: palette.purple },
            ]} />
          </div>
          <div className="chips3">
            <span><b>5G</b> 5G Sites <em>6 / 6</em></span>
            <span><Icon name="server" size={15} /> Gateways <em>12 / 12</em></span>
            <span><Icon name="chip" size={15} /> Edge Nodes <em>8 / 8</em></span>
          </div>
        </Panel>
        <Panel title="Port Throughput (Containers)" icon="bars">
          <DualArea data={thr} aName="Today" bName="Yesterday" aColor={palette.blue} bColor={palette.purple} />
          <div className="two-stat">
            <span>Today <strong>{fmt(today)}</strong> <em className="up">▲ +8.3%</em></span>
            <span>Yesterday <strong>11,859</strong></span>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════════════ SURVEILLANCE (image 3) ═══════════════════════ */

const cams = [
  { id: "CAM-001", name: "Container Yard", zone: "Yard", img: "/photos/cam-1.jpg" },
  { id: "CAM-002", name: "Main Gate", zone: "Gate", img: "/photos/cam-2.jpg" },
  { id: "CAM-003", name: "Quay Area", zone: "Quay", img: "/photos/cam-3.jpg" },
  { id: "CAM-004", name: "Internal Roads", zone: "Yard", img: "/photos/cam-4.jpg" },
  { id: "CAM-005", name: "Crane Area", zone: "Quay", img: "/photos/cam-5.jpg" },
  { id: "CAM-006", name: "Warehouse", zone: "Warehouse", img: "/photos/cam-6.jpg" },
  { id: "CAM-007", name: "Truck Parking", zone: "Gate", img: "/photos/cam-7.jpg" },
  { id: "CAM-008", name: "Perimeter", zone: "Perimeter", img: "/photos/cam-8.jpg" },
  { id: "CAM-009", name: "Night View", zone: "Perimeter", img: "/photos/cam-9.jpg" },
];

const survEvents: EventRow[] = [
  { title: "Unauthorized Access Detected", detail: "Main Gate • Camera 002", time: "10:12 AM", tone: "alert", icon: "warn", badge: "High" },
  { title: "Person Detected in Restricted Area", detail: "Container Yard • Camera 001", time: "09:48 AM", tone: "watch", icon: "user", badge: "Medium" },
  { title: "Vehicle Entered Port", detail: "Main Gate • Camera 002", time: "09:32 AM", tone: "info", icon: "car", badge: "Info" },
  { title: "Motion Detected (Night)", detail: "Perimeter • Camera 008", time: "08:56 AM", tone: "alert", icon: "activity", badge: "High" },
  { title: "Camera Reconnected", detail: "Warehouse • Camera 006", time: "08:21 AM", tone: "info", icon: "camera", badge: "Info" },
];

const survPool: Omit<EventRow, "time">[] = [
  { title: "Perimeter Breach Alert", detail: "North Fence • Camera 008", tone: "alert", icon: "warn", badge: "High" },
  { title: "Person Detected", detail: "Quay Area • Camera 003", tone: "watch", icon: "user", badge: "Medium" },
  { title: "Vehicle Entered Port", detail: "Main Gate • Camera 002", tone: "info", icon: "car", badge: "Info" },
  { title: "Loitering Detected", detail: "Truck Parking • Camera 007", tone: "watch", icon: "user", badge: "Medium" },
];

export function SurveillanceScreen({ tick, now, go }: ScreenProps) {
  const [zone, setZone] = useState("All Zones");
  const [open, setOpen] = useState<(typeof cams)[number] | null>(null);
  const feed = useFeed(survEvents, survPool);
  const kpis: KpiDef[] = [
    { label: "Total Cameras", value: 248, delta: 2, icon: "camera", accent: "blue" },
    { label: "Online Cameras", value: 242, delta: 1.2, icon: "shieldcheck", accent: "green", note: "/ 248" },
    { label: "Security Incidents", value: 7, delta: 133, lowerIsBetter: true, icon: "warn", accent: "purple" },
    { label: "Avg. Response Time", value: 38, suffix: " sec", delta: -42, lowerIsBetter: true, icon: "clock", accent: "blue" },
  ];
  const labels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"];
  const data = labels.map((x, i) => ({
    x,
    motion: Math.round(wave(i, 7, 105, 0.6, 1, tick)),
    person: Math.round(wave(i, 7, 70, 0.55, 2.2, tick)),
    vehicle: Math.round(wave(i, 7, 45, 0.5, 3.4, tick)),
  }));
  const zones = ["All Zones", "Yard", "Gate", "Quay", "Warehouse", "Perimeter"];

  return (
    <div className="screen sv">
      <KpiRow items={kpis} tick={tick} spark />
      <div className="sv-mid">
        <Panel title="Live Camera Feeds" right={<><LiveBadge /><label className="select"><select value={zone} onChange={(e) => setZone(e.target.value)}>{zones.map((z) => <option key={z}>{z}</option>)}</select><Icon name="down" size={14} /></label></>}>
          <div className="cam-grid">
            {cams.map((c, i) => {
              const dim = zone !== "All Zones" && c.zone !== zone;
              return (
                <button type="button" key={c.id} className={`cam ${dim ? "dim" : ""} ${i === 8 ? "night" : ""}`} onClick={() => setOpen(c)}>
                  <img src={c.img} alt={c.name} draggable={false} />
                  <span className="rec"><i /></span>
                  <footer>
                    <i className="dotg" />
                    <b>{c.id}</b>
                    <span>{c.name}</span>
                    <time>{clock(now)}</time>
                  </footer>
                </button>
              );
            })}
          </div>
        </Panel>
        <div className="col">
          <Panel title="Surveillance Analytics" right={<ViewAll label="View details →" onClick={() => go("details:surveillance")} />}>
            <div className="legend">
              <span><i style={{ background: palette.blue }} /> Motion</span>
              <span><i style={{ background: palette.purple }} /> Person</span>
              <span><i style={{ background: palette.green }} /> Vehicle</span>
            </div>
            <div className="chart-plot short">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(120,170,255,.14)" />
                  <XAxis dataKey="x" tick={{ fill: "#8fb3d9", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8fb3d9", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={{ background: "#08183a", border: "1px solid rgba(80,160,255,.35)", borderRadius: 10, fontSize: 12 }} />
                  <Area dataKey="motion" name="Motion" stroke={palette.blue} fill={palette.blue} fillOpacity={0.3} strokeWidth={2} animationDuration={900} />
                  <Area dataKey="person" name="Person" stroke={palette.purple} fill={palette.purple} fillOpacity={0.3} strokeWidth={2} animationDuration={900} />
                  <Area dataKey="vehicle" name="Vehicle" stroke={palette.green} fill={palette.green} fillOpacity={0.25} strokeWidth={2} animationDuration={900} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="conn">
              <Donut size={104} center={`${fmt(Math.min(100, live(97.6, tick, 1, 0.002)), 1)}%`} sub="Camera Uptime" slices={[
                { name: "Normal", value: 242, color: palette.green },
                { name: "Offline", value: 6, color: palette.red },
                { name: "Maintenance", value: 1, color: palette.purple },
              ]} />
              <Legend rows={[
                { name: "Normal", value: "242", color: palette.green },
                { name: "Offline", value: "6", color: palette.red },
                { name: "Maintenance", value: "0", color: palette.purple },
              ]} />
            </div>
          </Panel>
          <Panel title="Recent Security Events" right={<ViewAll label="View all" onClick={() => go("alerts:surveillance")} />} className="grow">
            <EventList rows={feed} max={5} compact inline />
          </Panel>
        </div>
      </div>
      <div className="sv-bot">
        {[
          { i: "shield", l: "Security Coverage", v: "100%", s: "All zones monitored" },
          { i: "scan", l: "Detection Accuracy", v: `${fmt(live(98.7, tick, 2, 0.002), 1)}%`, s: "AI analytics" },
          { i: "clock", l: "Avg. Event Resolution", v: `${fmt(live(2.1, tick, 3, 0.03), 1)} min`, s: "-56% vs. yesterday" },
          { i: "server", l: "Storage Usage", v: "62%", s: "312 TB / 500 TB" },
        ].map((s) => (
          <div className="stat" key={s.l}>
            <i><Icon name={s.i} size={26} /></i>
            <div><span>{s.l}</span><strong>{s.v}</strong><em>{s.s}</em></div>
          </div>
        ))}
        <p className="brand-foot">Safer Ports<br /><b>Smarter Tomorrow</b></p>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.div className="lb-card" initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }} onClick={(e) => e.stopPropagation()}>
              <img src={open.img} alt={open.name} draggable={false} />
              <footer><b>{open.id}</b> {open.name} <LiveBadge /><button type="button" onClick={() => setOpen(null)}>Close</button></footer>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════ ACCESS CONTROL (image 4) ═══════════════════════ */

const gates = [
  { id: "Gate 1", name: "Gate 1 – Main Entrance", src: "/photos/gate-1.jpg", thumb: "/photos/gate-1-thumb.jpg", ratio: 555 / 341 },
  { id: "Gate 2", name: "Gate 2 – Service Entrance", src: "/photos/gate-2.jpg", thumb: "/photos/gate-2.jpg", ratio: 630 / 370 },
  { id: "Gate 3", name: "Gate 3 – Staff Entrance", src: "/photos/gate-3.jpg", thumb: "/photos/gate-3.jpg", ratio: 625 / 370 },
  { id: "Gate 4", name: "Gate 4 – Exit", src: "/photos/gate-4.jpg", thumb: "/photos/gate-4.jpg", ratio: 570 / 370 },
];

const accEvents: EventRow[] = [
  { title: "Access Granted", detail: "Truck #A317 – Gate 1", detail2: "Authorized entry", time: "14:28", tone: "ok", icon: "check" },
  { title: "Access Denied", detail: "Person #B562 – Gate 2", detail2: "Invalid credential", time: "14:24", tone: "alert", icon: "ban" },
  { title: "ANPR Match", detail: "Car #K842 – Gate 3", detail2: "White list match", time: "14:17", tone: "violet", icon: "car" },
  { title: "Access Granted", detail: "Worker ID #W328 – Gate 4", detail2: "Shift entry", time: "14:12", tone: "ok", icon: "check" },
  { title: "Access Denied", detail: "Truck #C771 – Gate 1", detail2: "Restricted area", time: "14:05", tone: "alert", icon: "ban" },
  { title: "Access Granted", detail: "Visitor #V102 – Gate 2", detail2: "Pre-registered", time: "13:58", tone: "ok", icon: "check" },
];

const accPool: Omit<EventRow, "time">[] = [
  { title: "Access Granted", detail: "Truck #A912 – Gate 1", detail2: "Authorized entry", tone: "ok", icon: "check" },
  { title: "ANPR Match", detail: "Car #M377 – Gate 3", detail2: "White list match", tone: "violet", icon: "car" },
  { title: "Access Denied", detail: "Person #X450 – Gate 2", detail2: "Expired badge", tone: "alert", icon: "ban" },
  { title: "Access Granted", detail: "Worker ID #W611 – Gate 4", detail2: "Shift entry", tone: "ok", icon: "check" },
];

export function AccessScreen({ tick, now, go }: ScreenProps) {
  const [range, setRange] = useState<Range>("7d");
  const [gate, setGate] = useState(0);
  const feed = useFeed(accEvents, accPool);
  const g = gates[gate];
  const kpis: KpiDef[] = [
    { label: "Total Accesses", value: 12482, delta: 8.4, icon: "gate", accent: "cyan" },
    { label: "Authorized Entries", value: 11903, delta: 9.1, icon: "user", accent: "green" },
    { label: "Denied Accesses", value: 579, delta: -12.7, lowerIsBetter: true, icon: "ban", accent: "red" },
    { label: "ANPR Matches", value: 1248, delta: 6.3, icon: "car", accent: "purple" },
  ];
  const data = useSeries(range, now, tick, [
    { base: 1150, amp: 0.28, salt: 1.2, trend: 0.18 },
    { base: 340, amp: 0.2, salt: 2.1 },
  ]);

  return (
    <div className="screen vb-grid">
      <PageTitle icon="shield" title="Access Control" subtitle="Gate & workforce access, ANPR, and integrated security management." />
      <KpiRow items={kpis} tick={tick} />
      <div className="vb-main three">
        <Panel title="Access Control Live View" icon="camera" right={<LiveBadge />}>
          <Photo
            key={g.id}
            src={g.src}
            ratio={g.ratio}
            className="live-photo"
            overlay={gate > 0 ? <span className="gate-tag"><i /> {g.name}</span> : null}
          />
          <div className="gate-strip">
            {gates.map((x, i) => (
              <button type="button" key={x.id} className={i === gate ? "on" : ""} onClick={() => setGate(i)}>
                <img src={x.thumb} alt="" draggable={false} />
                <span><i /> {x.id}</span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Access Trends" icon="bars" right={<RangeSelect value={range} onChange={setRange} />}>
          <DualArea data={data} aName="Authorized" bName="Denied" aColor={palette.cyan} bColor={palette.purple} domain={[0, 2000]} ticks={[0, 500, 1000, 1500, 2000]} />
          <MiniStats items={[
            { icon: "clock", label: "Avg. Processing Time", value: `${fmt(live(2.3, tick, 1, 0.03), 1)}s`, delta: "-18%", accent: "blue" },
            { icon: "scan", label: "ANPR Accuracy", value: "98.7%", delta: "+2.1%", down: true, accent: "cyan" },
            { icon: "shield", label: "System Uptime", value: "99.9%", delta: "+0.1%", down: true, accent: "blue" },
            { icon: "gate", label: "Active Gates", value: "4 / 4", delta: "Online", accent: "green" },
          ]} />
        </Panel>
        <Panel title="Recent Events" right={<ViewAll label="View All" onClick={() => go("alerts:access")} />}>
          <EventList rows={feed} max={6} />
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════════════ PRIVATE 5G (image 5) ═══════════════════════ */

const gEvents: EventRow[] = [
  { title: "Device Connected", detail: "RTG-12 (Crane) – 5G UE #C842", detail2: "Connected to BS-02", time: "14:28", tone: "ok", icon: "check", badge: "Success" },
  { title: "Handover Completed", detail: "Truck #T317 – BS-01 → BS-03", detail2: "Seamless connection maintained", time: "14:24", tone: "info", icon: "swap", badge: "Success" },
  { title: "Low Signal Detected", detail: "Warehouse Camera #WC-07", detail2: "Signal strength: -98 dBm", time: "14:17", tone: "watch", icon: "warn", badge: "Warning" },
  { title: "Network Optimization", detail: "Beamforming adjustment (Sector 2)", detail2: "Improved coverage by 18%", time: "14:12", tone: "violet", icon: "cog", badge: "Info" },
  { title: "Device Connected", detail: "AGV-04 – 5G UE #A103", detail2: "Connected to BS-01", time: "13:58", tone: "ok", icon: "check", badge: "Success" },
  { title: "Handover Completed", detail: "Container Crane #CC05 – BS-03 → BS-02", detail2: "Latency: 7.6 ms", time: "13:41", tone: "info", icon: "swap", badge: "Success" },
];

const gPool: Omit<EventRow, "time">[] = [
  { title: "Device Connected", detail: "Reefer Sensor #RS-221 – 5G UE #R221", detail2: "Connected to BS-03", tone: "ok", icon: "check", badge: "Success" },
  { title: "Handover Completed", detail: "Truck #T402 – BS-02 → BS-01", detail2: "Seamless connection maintained", tone: "info", icon: "swap", badge: "Success" },
  { title: "Low Signal Detected", detail: "Gate Camera #GC-03", detail2: "Signal strength: -96 dBm", tone: "watch", icon: "warn", badge: "Warning" },
  { title: "Slice Re-balanced", detail: "URLLC slice for crane control", detail2: "Latency reduced to 7.9 ms", tone: "violet", icon: "cog", badge: "Info" },
];

export function FiveGScreen({ tick, now, go }: ScreenProps) {
  const [range, setRange] = useState<Range>("7d");
  const feed = useFeed(gEvents, gPool);
  const kpis: KpiDef[] = [
    { label: "Connected Devices", value: 2847, delta: 12.6, icon: "device", accent: "green" },
    { label: "Network Availability", value: 99.98, decimals: 2, suffix: "%", delta: 0.02, icon: "signal", accent: "blue" },
    { label: "Avg. Latency", value: 8.4, decimals: 1, suffix: " ms", delta: -32.4, lowerIsBetter: true, icon: "clock", accent: "purple" },
    { label: "Data Throughput", value: 4.7, decimals: 1, suffix: " Gbps", delta: 28.3, icon: "gauge", accent: "cyan" },
  ];
  const data = useSeries(range, now, tick, [
    { base: 3700, amp: 0.1, salt: 1.3, trend: 0.25 },
    { base: 1500, amp: 0.12, salt: 2.5, trend: 0.15 },
  ]);

  return (
    <div className="screen vb-grid">
      <PageTitle icon="signal" title="Private 5G Network" subtitle="Secure, reliable, low-latency connectivity across the port." />
      <KpiRow items={kpis} tick={tick} />
      <div className="vb-main three g5">
        <Panel title="5G Network Live View" icon="scan" right={<LiveBadge />}>
          <Photo src="/photos/fiveg-map.jpg" ratio={573 / 470} className="live-photo">
            <span className="core" style={{ left: "51.8%", top: "29%" }}><span className="rings" /><span className="rings r2" /><span className="rings r3" /></span>
          </Photo>
        </Panel>
        <Panel title="Network Performance" icon="bars" right={<RangeSelect value={range} onChange={setRange} />}>
          <DualArea data={data} aName="Download (Mbps)" bName="Upload (Mbps)" aColor={palette.cyan} bColor={palette.purple} domain={[0, 6000]} ticks={[0, 1500, 3000, 4500, 6000]} />
          <MiniStats items={[
            { icon: "download", label: "Avg. Download", value: `${fmt(live(4.7, tick, 1, 0.01), 1)} Gbps`, delta: "28.3%", accent: "cyan" },
            { icon: "upload", label: "Avg. Upload", value: `${fmt(live(1.8, tick, 2, 0.01), 1)} Gbps`, delta: "21.7%", accent: "purple" },
            { icon: "clock", label: "Latency", value: `${fmt(live(8.4, tick, 3, 0.01), 1)} ms`, delta: "32.4%", down: true, accent: "blue" },
            { icon: "shieldcheck", label: "Reliability", value: "99.98%", delta: "0.02%", accent: "cyan" },
          ]} />
        </Panel>
        <Panel title="Recent Network Events" icon="doc" right={<ViewAll label="View All" onClick={() => go("alerts:fiveg")} />}>
          <EventList rows={feed} max={6} />
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════════════ CRANES (image 6) ═══════════════════════ */

/* The four crane cards are drawn into cranes-map.jpg; these are clickable areas over them (in % of the photo). */
const craneCards = [
  { id: "QC-01", x: 15.9, y: 15.3, load: 34.2, trolley: 68 },
  { id: "RTG-03", x: 73.4, y: 15.1, load: 18.7, trolley: 42 },
  { id: "QC-02", x: 15.7, y: 73, load: 27.5, trolley: 73 },
  { id: "RTG-01", x: 66.4, y: 83.1, load: 12.3, trolley: 35 },
];

const cEvents: EventRow[] = [
  { title: "Crane QC-01 – Operation Resumed", detail: "Load: 34.2 t • Trolley: 68%", detail2: "After maintenance (5 min)", time: "14:28", tone: "ok", icon: "check" },
  { title: "Crane RTG-03 – Position Updated", detail: "New location: Block B12", detail2: "GPS tracking", time: "14:24", tone: "info", icon: "monitor" },
  { title: "Crane QC-02 – High Load Alert", detail: "Load: 42.7 t • Limit: 40 t", detail2: "Operator notified", time: "14:17", tone: "watch", icon: "warn" },
  { title: "Crane RTG-01 – Operation Normal", detail: "Load: 12.3 t • Trolley: 35%", detail2: "Running smoothly", time: "14:12", tone: "ok", icon: "check" },
  { title: "Scheduled Maintenance", detail: "RMG-02 • Next: 2025-04-28", detail2: "Maintenance window set", time: "14:05", tone: "violet", icon: "wrench" },
  { title: "Crane QC-03 – Cycle Completed", detail: "Total cycle time: 2.8 min", detail2: "Operation log updated", time: "13:58", tone: "info", icon: "info" },
];

const cPool: Omit<EventRow, "time">[] = [
  { title: "Crane QC-01 – Cycle Completed", detail: "Total cycle time: 2.6 min", detail2: "Operation log updated", tone: "info", icon: "info" },
  { title: "Crane RTG-02 – Operation Normal", detail: "Load: 15.1 t • Trolley: 51%", detail2: "Running smoothly", tone: "ok", icon: "check" },
  { title: "Crane QC-02 – High Load Alert", detail: "Load: 41.3 t • Limit: 40 t", detail2: "Operator notified", tone: "watch", icon: "warn" },
  { title: "Crane RTG-03 – Position Updated", detail: "New location: Block C04", detail2: "GPS tracking", tone: "info", icon: "monitor" },
];

export function CranesScreen({ tick, now, go }: ScreenProps) {
  const [range, setRange] = useState<Range>("7d");
  const [sel, setSel] = useState("QC-01");
  const feed = useFeed(cEvents, cPool);
  const kpis: KpiDef[] = [
    { label: "Total Cranes", value: 12, delta: 0, icon: "crane", accent: "green" },
    { label: "Active Cranes", value: 10, delta: 11.1, icon: "crane", accent: "blue" },
    { label: "Avg. Operation Time", value: 92.4, decimals: 1, suffix: "%", delta: 3.2, icon: "clock", accent: "purple" },
    { label: "Maintenance Due", value: 2, delta: -50, lowerIsBetter: true, icon: "warn", accent: "cyan" },
  ];
  const labels = rangeLabels(range, now);
  const data = labels.map((x, i) => ({
    x,
    a: Math.round(wave(i, labels.length, 76, 0.07, 1.4, tick, 0.08)),
    b: Math.round(wave(i, labels.length, 6.5, 0.08, 2.6, tick) * 10) / 10,
  }));

  return (
    <div className="screen vb-grid">
      <PageTitle icon="crane" title="Cranes" subtitle="Safe, efficient, and automated crane operations." />
      <KpiRow items={kpis} tick={tick} />
      <div className="vb-main three cr">
        <Panel title="Crane Live View" icon="crane" right={<LiveBadge />}>
          <Photo
            src="/photos/cranes-map.jpg"
            ratio={573 / 395}
            className="live-photo"
            overlay={(() => {
              const c = craneCards.find((x) => x.id === sel) ?? craneCards[0];
              return (
                <span className="sel-chip">
                  <b>{c.id}</b> Operating · Load {fmt(live(c.load, tick, c.x, 0.03), 1)} t · Trolley {fmt(Math.min(100, live(c.trolley, tick, c.y, 0.03)))}%
                </span>
              );
            })()}
          >
            {craneCards.map((c) => (
              <Hot key={c.id} x={c.x} y={c.y} size={96} label={c.id} active={sel === c.id} onClick={() => setSel(c.id)} />
            ))}
          </Photo>
          <div className="crane-strip">
            <span><Icon name="crane" size={28} /><em>Total Cranes<b>12</b></em></span>
            <span><Icon name="gear" size={28} /><em>Operating<b>10</b></em></span>
            <span><Icon name="wrench" size={28} /><em>Maintenance<b>2</b></em></span>
            <span><Icon name="warn" size={28} /><em>Offline<b>0</b></em></span>
          </div>
        </Panel>
        <div className="col">
          <Panel title="Crane Performance" icon="bars" right={<RangeSelect value={range} onChange={setRange} />} className="grow">
            <DualArea type="line" rightAxis data={data} aName="Utilization Rate" bName="Avg. Cycle Time (min)" aColor={palette.cyan} bColor={palette.purple} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} pct rightDomain={[0, 30]} rightTicks={[0, 10, 20, 30]} />
          </Panel>
          <Panel title="Crane Distribution" icon="clock">
            <div className="conn">
              <Donut size={118} center="12" sub="Total Cranes" slices={[
                { name: "Quay Cranes (QC)", value: 4, color: palette.cyan },
                { name: "RTG Cranes", value: 6, color: palette.blue },
                { name: "RMG Cranes", value: 2, color: palette.purple },
              ]} />
              <Legend rows={[
                { name: "Quay Cranes (QC)", value: "4  33%", color: palette.cyan },
                { name: "RTG Cranes", value: "6  50%", color: palette.blue },
                { name: "RMG Cranes", value: "2  17%", color: palette.purple },
              ]} />
            </div>
          </Panel>
        </div>
        <Panel title="Recent Events" icon="doc" right={<ViewAll label="View All" onClick={() => go("alerts:cranes")} />}>
          <EventList rows={feed} max={6} />
        </Panel>
      </div>
    </div>
  );
}
