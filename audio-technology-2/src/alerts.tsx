import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, KpiRow, PageTitle, Panel, clock, type KpiDef } from "./ui";
import type { ScreenProps } from "./screens";

type Sev = "High" | "Medium" | "Low";
type Item = { title: string; detail: string; sev: Sev };
type Alert = Item & { id: number; time: string; done: boolean; fresh?: boolean };

type Module = { title: string; subtitle: string; icon: string; items: Item[]; pool: Item[] };

/* Fake demo alerts for every tab that has a Recent Events / Alerts panel. */
const modules: Record<string, Module> = {
  overview: {
    title: "Port",
    subtitle: "Every event and alert raised across the port.",
    icon: "home",
    items: [
      { title: "Hardware fault detected", detail: "Conveyor CV-07 · sensor fault", sev: "High" },
      { title: "Temperature alert", detail: "Reefer container RFU324 above band", sev: "Medium" },
      { title: "5G node restored", detail: "5G node 3 back online", sev: "Low" },
      { title: "Crane at high load", detail: "Crane C1 running at 92% capacity", sev: "Medium" },
      { title: "Access denied", detail: "Truck #A7-582 · invalid credential at Gate 3", sev: "Medium" },
      { title: "Vehicle departed", detail: "Truck #B4-116 exited the port", sev: "Low" },
      { title: "Camera reconnected", detail: "CAM-006 Warehouse back online", sev: "Low" },
      { title: "Power meter silent", detail: "Gate house meter 14 not reporting", sev: "Medium" },
    ],
    pool: [
      { title: "Reefer temperature rising", detail: "Container RFU611 +2°C in 10 min", sev: "Medium" },
      { title: "Gate queue growing", detail: "Gate 2 average wait 6 min", sev: "Low" },
      { title: "Crane stoppage", detail: "STS-3 wind hold on boom", sev: "High" },
    ],
  },
  surveillance: {
    title: "Surveillance",
    subtitle: "All security events from cameras and AI analytics.",
    icon: "camera",
    items: [
      { title: "Unauthorized access detected", detail: "Main Gate · Camera 002", sev: "High" },
      { title: "Motion detected (night)", detail: "Perimeter · Camera 008", sev: "High" },
      { title: "Person detected in restricted area", detail: "Container Yard · Camera 001", sev: "Medium" },
      { title: "Loitering detected", detail: "Truck Parking · Camera 007", sev: "Medium" },
      { title: "Vehicle entered port", detail: "Main Gate · Camera 002", sev: "Low" },
      { title: "Camera reconnected", detail: "Warehouse · Camera 006", sev: "Low" },
      { title: "Camera offline", detail: "Quay Area · Camera 003", sev: "Medium" },
    ],
    pool: [
      { title: "Perimeter breach alert", detail: "North fence · Camera 008", sev: "High" },
      { title: "Person detected", detail: "Quay Area · Camera 003", sev: "Medium" },
      { title: "Storage nearing limit", detail: "NVR 2 at 88% capacity", sev: "Low" },
    ],
  },
  access: {
    title: "Access Control",
    subtitle: "Every gate, badge and ANPR event.",
    icon: "shieldcheck",
    items: [
      { title: "Access denied", detail: "Person #B562 · Gate 2 · invalid credential", sev: "High" },
      { title: "Access denied", detail: "Truck #C771 · Gate 1 · restricted area", sev: "High" },
      { title: "Plate mismatch", detail: "Truck 18-4421 held at Gate 1", sev: "Medium" },
      { title: "After-hours entry", detail: "Badge 2204 · warehouse door", sev: "Medium" },
      { title: "ANPR match", detail: "Car #K842 · Gate 3 · white list", sev: "Low" },
      { title: "Access granted", detail: "Visitor #V102 · Gate 2 · pre-registered", sev: "Low" },
      { title: "Gate lane reset", detail: "Gate 3 staff lane back to auto", sev: "Low" },
    ],
    pool: [
      { title: "Access denied", detail: "Person #X450 · Gate 2 · expired badge", sev: "High" },
      { title: "ANPR low confidence", detail: "Truck at Gate 4 needs manual check", sev: "Medium" },
      { title: "Visitor pass issued", detail: "Contractor · pier office", sev: "Low" },
    ],
  },
  fiveg: {
    title: "Private 5G",
    subtitle: "All network events, handovers and signal warnings.",
    icon: "signal",
    items: [
      { title: "Low signal detected", detail: "Warehouse Camera #WC-07 · -98 dBm", sev: "Medium" },
      { title: "Site 5 power dip", detail: "Back online after 40 seconds", sev: "Medium" },
      { title: "Handover completed", detail: "Truck #T317 · BS-01 → BS-03", sev: "Low" },
      { title: "Device connected", detail: "RTG-12 (crane) · 5G UE #C842", sev: "Low" },
      { title: "Network optimization", detail: "Beamforming adjustment (Sector 2)", sev: "Low" },
      { title: "Latency spike", detail: "Backhaul to BS-02 reached 21 ms", sev: "High" },
    ],
    pool: [
      { title: "Low signal detected", detail: "Gate Camera #GC-03 · -96 dBm", sev: "Medium" },
      { title: "Slice re-balanced", detail: "URLLC slice for crane control", sev: "Low" },
      { title: "Core failover test", detail: "Finished, no dropped calls", sev: "Low" },
    ],
  },
  cranes: {
    title: "Cranes",
    subtitle: "Every crane alert, load warning and maintenance notice.",
    icon: "crane",
    items: [
      { title: "QC-02 high load alert", detail: "Load 42.7 t · limit 40 t", sev: "High" },
      { title: "STS-3 wind hold", detail: "Boom parked, crew waiting", sev: "High" },
      { title: "RTG-09 twistlock check", detail: "Cleared, back in block E", sev: "Medium" },
      { title: "Scheduled maintenance", detail: "RMG-02 · next 2025-04-28", sev: "Low" },
      { title: "QC-01 operation resumed", detail: "After maintenance (5 min)", sev: "Low" },
      { title: "RTG-03 position updated", detail: "New location Block B12", sev: "Low" },
    ],
    pool: [
      { title: "QC-02 high load alert", detail: "Load 41.3 t · limit 40 t", sev: "High" },
      { title: "RTG-02 trolley slow", detail: "Trolley speed 12% below normal", sev: "Medium" },
      { title: "QC-03 cycle completed", detail: "Cycle time 2.6 min", sev: "Low" },
    ],
  },
  monitoring: {
    title: "Monitoring Center",
    subtitle: "Every incident, alarm and system event.",
    icon: "monitor",
    items: [
      { title: "Hardware fault detected", detail: "Conveyor CV-2 · sensor fault", sev: "High" },
      { title: "Backhaul latency spike", detail: "5G node 3", sev: "Medium" },
      { title: "Reefer alarm", detail: "Container RFTU334 temperature", sev: "Medium" },
      { title: "Wall panel blink", detail: "Wall B recovered in 6 s", sev: "Low" },
      { title: "Access control granted", detail: "Truck A27-582 entered Gate 3", sev: "Low" },
      { title: "Vessel berthed", detail: "MV Horizon docked at Berth 2", sev: "Low" },
    ],
    pool: [
      { title: "New alarm raised", detail: "Camera 006 packet loss", sev: "Medium" },
      { title: "Digital twin out of sync", detail: "Berth 2 model 40 s behind", sev: "Low" },
      { title: "Operator escalation", detail: "Incident INC-221 sent to supervisor", sev: "High" },
    ],
  },
  vehicles: {
    title: "Vehicles",
    subtitle: "Every fleet, driver-safety and route alert.",
    icon: "truck",
    items: [
      { title: "Trailer #TR-276 delayed", detail: "Traffic congestion · Main Road", sev: "Medium" },
      { title: "Truck #T-067 waiting for inspection", detail: "Gate 1", sev: "Medium" },
      { title: "Collision warning (ADAS)", detail: "T-184 braked early near Block C", sev: "High" },
      { title: "Driver fatigue alert (DMS)", detail: "SV-08 driver · 2 yawns in 5 min", sev: "High" },
      { title: "Truck #T-042 entered Gate 3", detail: "Inbound · container delivery", sev: "Low" },
      { title: "Forklift #F-17 completed loading", detail: "Warehouse B · Zone 2", sev: "Low" },
    ],
    pool: [
      { title: "Truck #T-201 speeding", detail: "Main Road · 41 km/h", sev: "High" },
      { title: "Lane departure", detail: "T-311 drifted at the weighbridge", sev: "Medium" },
      { title: "Route optimized", detail: "Trucks diverted around Block E", sev: "Low" },
    ],
  },
  warehouse: {
    title: "Warehouse",
    subtitle: "Inventory, RFID and environmental alerts.",
    icon: "warehouse",
    items: [
      { title: "Bonded aisle high", detail: "Aisle D at 81% full", sev: "Medium" },
      { title: "Humidity warning", detail: "Zone C2 at 71% RH", sev: "Medium" },
      { title: "RFID miss", detail: "Pallet 4412 recounted", sev: "Low" },
      { title: "Cold room recovered", detail: "Cold 1 back to -18°C", sev: "Low" },
      { title: "Dock 4 closed", detail: "Door sensor fault", sev: "Medium" },
      { title: "Dock 2 burst", detail: "Three trucks unloaded", sev: "Low" },
    ],
    pool: [
      { title: "Temperature drift", detail: "Cold Room 2 at -15.4°C", sev: "High" },
      { title: "Forklift route blocked", detail: "Aisle B pallet down", sev: "Medium" },
      { title: "RFID read", detail: "Pallet 4501 located in B3", sev: "Low" },
    ],
  },
  hardware: {
    title: "Hardware",
    subtitle: "Every predictive-maintenance alert in one place. Mark them done as they are handled.",
    icon: "gear",
    items: [
      { title: "Conveyor sensor lost", detail: "Conveyor CV-07 · yard belt", sev: "High" },
      { title: "Winding temperature above band", detail: "Hoist Motor QC-2 · Crane QC-02", sev: "High" },
      { title: "Vibration trend rising", detail: "Bearing B · yard belt", sev: "Medium" },
      { title: "Predicted failure in 19 days", detail: "Hoist Motor QC-2 · Crane QC-02", sev: "Medium" },
      { title: "Current draw spike", detail: "Pump 3 · power hall", sev: "Low" },
      { title: "PLC heartbeat missed", detail: "PLC Gate 2 · gate cabinet", sev: "Low" },
      { title: "Gearbox oil temperature high", detail: "Gearbox RTG-7 · Block C", sev: "Medium" },
    ],
    pool: [
      { title: "Vibration above threshold", detail: "Bearing B · yard belt", sev: "Medium" },
      { title: "Belt tension out of range", detail: "Conveyor CV-07 · yard belt", sev: "High" },
      { title: "RUL recalculated", detail: "Gearbox RTG-7 · Block C", sev: "Low" },
    ],
  },
  power: {
    title: "Power",
    subtitle: "Every electrical event and meter alarm.",
    icon: "bolt",
    items: [
      { title: "Meter 14 silent", detail: "Gate house not reporting", sev: "High" },
      { title: "Feeder B above plan", detail: "Crane row drawing 1.1 MW", sev: "Medium" },
      { title: "Power factor low", detail: "Main feeder at 0.91", sev: "Medium" },
      { title: "Solar peak", detail: "Warehouse roof at 410 kW", sev: "Low" },
      { title: "UPS test passed", detail: "Data room stayed up", sev: "Low" },
      { title: "Demand shifted", detail: "Cold store pre-cooled off-peak", sev: "Low" },
    ],
    pool: [
      { title: "Voltage dip", detail: "Feeder C dipped 4% for 2 s", sev: "Medium" },
      { title: "Meter 14 reconnected", detail: "Gate house reporting again", sev: "Low" },
      { title: "Peak demand warning", detail: "2.7 MW expected at 13:10", sev: "High" },
    ],
  },
  water: {
    title: "Water",
    subtitle: "Every leak, pressure and tank alert.",
    icon: "drop",
    items: [
      { title: "Hydrant 6 leak", detail: "Yard south · crew on the way", sev: "High" },
      { title: "Meter W7 silent", detail: "Gate meter not reporting", sev: "Medium" },
      { title: "Cold plant high use", detail: "+18% above plan", sev: "Medium" },
      { title: "Tank level fine", detail: "Roof tank at 78%", sev: "Low" },
      { title: "Bunkering finished", detail: "Berth 2 fresh water supply", sev: "Low" },
      { title: "Pressure stabilised", detail: "Pier loop back to 4.2 bar", sev: "Low" },
    ],
    pool: [
      { title: "Leak suspected", detail: "Hydrant 6 flow +8% overnight", sev: "High" },
      { title: "Pressure drop", detail: "Pier loop at 3.6 bar", sev: "Medium" },
      { title: "Meter W7 reconnected", detail: "Gate meter reporting", sev: "Low" },
    ],
  },
};

export function hasAlerts(id: string) {
  return id in modules;
}

export function AlertsScreen({ tick, go, module }: ScreenProps & { module: string }) {
  const mod = modules[module] ?? modules.overview;
  const seed = useMemo<Alert[]>(
    () =>
      mod.items.map((it, i) => ({
        ...it,
        id: i + 1,
        time: clock(new Date(Date.now() - (i * 19 + 4) * 60000)),
        done: i >= mod.items.length - 2,
      })),
    [mod],
  );
  const [alerts, setAlerts] = useState(seed);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const next = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      const a = mod.pool[next.current++ % mod.pool.length];
      setAlerts((cur) => [{ ...a, id: Date.now(), time: clock(new Date()), done: false, fresh: true }, ...cur.map((x) => ({ ...x, fresh: false }))]);
    }, 12000);
    return () => window.clearInterval(id);
  }, [mod]);

  const open = alerts.filter((a) => !a.done).length;
  const toggle = (id: number) => setAlerts((cur) => cur.map((a) => (a.id === id ? { ...a, done: !a.done, fresh: false } : a)));
  const shown = alerts.filter((a) => (filter === "all" ? true : filter === "open" ? !a.done : a.done));
  const kpis: KpiDef[] = [
    { label: "Open Alerts", value: open, delta: -12, lowerIsBetter: true, icon: "bell", accent: "red" },
    { label: "Marked Done", value: alerts.length - open, delta: 18, icon: "shieldcheck", accent: "green" },
    { label: "High Severity", value: alerts.filter((a) => a.sev === "High" && !a.done).length, delta: -25, lowerIsBetter: true, icon: "warn", accent: "purple" },
    { label: "Avg. Time to Resolve", value: 42, suffix: " min", delta: -9, lowerIsBetter: true, icon: "clock", accent: "cyan" },
  ];

  return (
    <div className="screen vb-grid">
      <PageTitle icon="bell" title={`${mod.title} Alerts`} subtitle={mod.subtitle} />
      <KpiRow items={kpis} tick={tick} />
      <Panel
        title="All Alerts"
        icon="list"
        className="grow"
        right={
          <div className="al-bar">
            <div className="al-tabs">
              {(["all", "open", "done"] as const).map((f) => (
                <button type="button" key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
                  {f === "all" ? `All (${alerts.length})` : f === "open" ? `Open (${open})` : `Done (${alerts.length - open})`}
                </button>
              ))}
            </div>
            <button type="button" className="al-all" onClick={() => setAlerts((cur) => cur.map((a) => ({ ...a, done: true })))}>
              <Icon name="check" size={14} /> Mark all as done
            </button>
            <button type="button" className="al-back" onClick={() => go(module)}>← Back to {mod.title}</button>
          </div>
        }
      >
        <ul className="al-list">
          {shown.map((a) => (
            <li key={a.id} className={`${a.done ? "done" : ""} ${a.fresh ? "fresh" : ""}`}>
              <button type="button" className={`al-check ${a.done ? "on" : ""}`} onClick={() => toggle(a.id)} aria-label={a.done ? "Mark as open" : "Mark as done"}>
                <Icon name="check" size={16} />
              </button>
              <b className={`sev ${a.sev}`}>{a.sev}</b>
              <div><strong>{a.title}</strong><span>{a.detail}</span></div>
              <span>{a.done ? "Resolved and checked" : "Waiting to be handled"}</span>
              <time>{a.time}</time>
              <button type="button" className="al-act" onClick={() => toggle(a.id)}>{a.done ? "Reopen" : "Mark as done"}</button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
