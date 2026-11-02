import { AREAS, labels, rng, RANGES, type Area, type Filters } from "./data";

export type WoStatus = "Open" | "In progress" | "Done";
export interface WorkOrder {
  id: string; title: string; asset: string; area: Area; prio: "High" | "Medium" | "Low"; due: string; status: WoStatus;
  type: "Planned" | "Unplanned"; crew: string; hours: number; late?: boolean; note: string;
}
export const WORK_ORDERS: WorkOrder[] = [
  { id: "WO-3117", title: "Raise pressure in Third Settlement", asset: "PRV, Third Settlement inlet", area: "Third Settlement", prio: "High", due: "Today", status: "In progress", type: "Unplanned", crew: "Network crew", hours: 6, note: "Pressure falls to 1.8 bar at the morning peak. Check the inlet valve position and the pipe on the way from the east hub." },
  { id: "WO-3121", title: "Repair burst on DN300 main", asset: "Main C2-C4, Fifth Settlement", area: "Fifth Settlement", prio: "High", due: "Today", status: "In progress", type: "Unplanned", crew: "Repair crew 1", hours: 10, note: "A joint failed and about 12 L/s is lost. Isolate the section, replace the joint and flush before returning to service." },
  { id: "WO-3109", title: "Restore pressure sensor PT-06", asset: "Pressure sensor PT-06", area: "Rehab Edge", prio: "Medium", due: "Yesterday", status: "Open", type: "Unplanned", crew: "I&C crew", hours: 3, late: true, note: "No signal for 2 hours. Check the radio link and the battery at the pole." },
  { id: "WO-3125", title: "Locate leak in Banafseg", asset: "Mains, Banafseg", area: "Banafseg", prio: "Medium", due: "Tomorrow", status: "Open", type: "Unplanned", crew: "Leak team", hours: 8, note: "Night flow rose by 4 L/s. Run the acoustic survey on the pipes east of the zone meter." },
  { id: "WO-3131", title: "Repair service line burst near the mall", asset: "Main B1-B3, Third Settlement", area: "Third Settlement", prio: "High", due: "Today", status: "Open", type: "Unplanned", crew: "Repair crew 2", hours: 5, note: "Logger LK-01 confirms a burst of about 6.5 L/s." },
  { id: "WO-3102", title: "Replace corroded cast iron, Narges Villas", asset: "Main D1-D3, Narges Villas", area: "Narges Villas", prio: "High", due: "30 Oct", status: "Open", type: "Planned", crew: "Network crew", hours: 24, late: true, note: "This pipe has leaked for 6 days. Replace 180 m with ductile iron." },
  { id: "WO-3114", title: "Clean chlorine analyser AT-03", asset: "Chlorine analyser AT-03", area: "Banafseg", prio: "Low", due: "04 Nov", status: "Open", type: "Planned", crew: "I&C crew", hours: 1.5, note: "Monthly clean and a two-point calibration." },
  { id: "WO-3133", title: "Service high-lift pump 2", asset: "High-lift pump 2", area: "All network", prio: "Medium", due: "06 Nov", status: "Open", type: "Planned", crew: "Mechanical crew", hours: 12, note: "Change the bearings and check the alignment. Pump 4 takes the duty while it is out." },
  { id: "WO-3138", title: "Inspect the reservoir roof and vents", asset: "Elevated reservoir", area: "All network", prio: "Medium", due: "12 Nov", status: "Open", type: "Planned", crew: "Civil crew", hours: 8, note: "Yearly inspection of the roof, vents and the overflow screen." },
  { id: "WO-3098", title: "Calibrate zone meter FT-03", asset: "Flow meter FT-03", area: "Third Settlement", prio: "Low", due: "20 Oct", status: "Done", type: "Planned", crew: "I&C crew", hours: 2, note: "Verified against the clamp-on meter, error 0.4%." },
  { id: "WO-3095", title: "Replace PRV diaphragm, Rehab Edge", asset: "PRV-02", area: "Rehab Edge", prio: "High", due: "16 Oct", status: "Done", type: "Unplanned", crew: "Mechanical crew", hours: 6, note: "The valve was hunting. Diaphragm replaced and set-point checked." },
  { id: "WO-3090", title: "Flush the dead-end mains", asset: "Dead ends, Banafseg", area: "Banafseg", prio: "Low", due: "12 Oct", status: "Done", type: "Planned", crew: "Operations", hours: 4, note: "Routine flushing to keep the chlorine up." },
];
export const woInArea = (w: WorkOrder, f: Filters) => f.area === "All network" || w.area === "All network" || w.area === f.area;

export interface Asset { name: string; area: Area | "All network"; health: number; rul: number; lastService: string; nextPm: string; crit: "A" | "B" | "C" }
export const ASSETS: Asset[] = [
  { name: "High-lift pump 1", area: "All network", health: 91, rul: 420, lastService: "03 Sep", nextPm: "03 Dec", crit: "A" },
  { name: "High-lift pump 2", area: "All network", health: 68, rul: 52, lastService: "11 Jul", nextPm: "06 Nov", crit: "A" },
  { name: "High-lift pump 3", area: "All network", health: 86, rul: 300, lastService: "21 Aug", nextPm: "21 Nov", crit: "A" },
  { name: "Booster pump 1", area: "Rehab Edge", health: 82, rul: 240, lastService: "30 Aug", nextPm: "30 Nov", crit: "B" },
  { name: "PRV, Narges Villas", area: "Narges Villas", health: 77, rul: 120, lastService: "14 Sep", nextPm: "14 Dec", crit: "B" },
  { name: "PRV-02, Rehab Edge", area: "Rehab Edge", health: 93, rul: 500, lastService: "16 Oct", nextPm: "16 Jan", crit: "B" },
  { name: "Main C2-C4, Fifth Settlement", area: "Fifth Settlement", health: 41, rul: 4, lastService: "2019", nextPm: "Replace", crit: "A" },
  { name: "Main D1-D3, Narges Villas", area: "Narges Villas", health: 38, rul: 9, lastService: "2018", nextPm: "30 Oct", crit: "A" },
  { name: "Main B1-B3, Third Settlement", area: "Third Settlement", health: 55, rul: 15, lastService: "2020", nextPm: "Replace", crit: "B" },
  { name: "Elevated reservoir", area: "All network", health: 92, rul: 3000, lastService: "12 Nov 2025", nextPm: "12 Nov", crit: "A" },
  { name: "Pressure sensor PT-06", area: "Rehab Edge", health: 58, rul: 14, lastService: "05 Jun", nextPm: "Overdue", crit: "C" },
  { name: "Chlorinator", area: "All network", health: 89, rul: 380, lastService: "12 Oct", nextPm: "12 Jan", crit: "A" },
];
export const assetsIn = (f: Filters) => ASSETS.filter((a) => f.area === "All network" || a.area === "All network" || a.area === f.area);

export function maintenanceHours(f: Filters) {
  const r = rng(555 + RANGES.indexOf(f.range) * 7 + AREA_SEED(f.area));
  const scale = (f.range === "24H" ? 0.18 : f.range === "YTD" ? 28 : 1) * (f.area === "All network" ? 1 : 1 / 3) * 1.4;
  return labels(f.range).map((t) => ({ t, planned: Math.round(26 * scale * (0.7 + r() * 0.6)), unplanned: Math.round(9 * scale * (0.3 + r() * 1.2)) }));
}
const AREA_SEED = (a: Area) => AREAS.indexOf(a) + 1;

/* ---------- electrical ---------- */
export interface Feeder { id: string; kw: number; rated: number; kv: number; pf: number }
export const LOADS: Feeder[] = [
  { id: "blowers", kw: 1120, rated: 1500, kv: 11, pf: 0.93 },
  { id: "influent", kw: 410, rated: 550, kv: 11, pf: 0.91 },
  { id: "tertiary", kw: 520, rated: 700, kv: 0.4, pf: 0.92 },
  { id: "sludge", kw: 380, rated: 500, kv: 0.4, pf: 0.9 },
  { id: "aux", kw: 140, rated: 200, kv: 0.4, pf: 0.95 },
];
export const SOLAR_KW = 500; // a 0.6 MWp field at midday
export const GEN_KW = 400; // the micro-hydro turbine's output (it is rated 0.6 MW)
export const PRODUCT_FLOW = 6165; // m³/h of water sent out, for the energy per m³

export interface PowerPoint { t: string; solar: number; blowers: number; influent: number; tertiary: number; sludge: number; aux: number }
export function powerSeries(f: Filters): PowerPoint[] {
  const r = rng(909 + RANGES.indexOf(f.range) * 11 + AREA_SEED(f.area));
  const k = f.area === "All network" ? 1 : 1 / 3;
  return labels(f.range).map((t, i) => {
    const sun = f.range === "24H" ? Math.max(0, Math.sin(((i - 6) / 12) * Math.PI)) * 1.05 : 0.5 + r() * 0.2;
    const row: PowerPoint = { t, solar: Math.round(SOLAR_KW * k * sun), blowers: 0, influent: 0, tertiary: 0, sludge: 0, aux: 0 };
    LOADS.forEach((l) => { row[l.id as "blowers"] = Math.round(l.kw * k * (0.95 + r() * 0.08)); });
    return row;
  });
}

/* ---------- predictive maintenance ---------- */
export interface Pred { signal: string; value: string; trend: "up" | "flat" | "down"; confidence: number; action: string }
const PRED: Record<string, Pred> = {
  "High-lift pump 1": { signal: "Vibration", value: "2.4 mm/s", trend: "flat", confidence: 90, action: "Keep the routine PM. No fault is developing." },
  "High-lift pump 2": { signal: "Bearing vibration", value: "6.8 mm/s", trend: "up", confidence: 91, action: "Change the bearings at the planned stop on 6 November." },
  "High-lift pump 3": { signal: "Vibration", value: "3.1 mm/s", trend: "up", confidence: 84, action: "Re-check the alignment at the next PM." },
  "Booster pump 1": { signal: "Motor current", value: "212 A", trend: "flat", confidence: 85, action: "No action. Routine lubrication is enough." },
  "PRV, Narges Villas": { signal: "Valve hunting", value: "0.3 bar", trend: "up", confidence: 80, action: "Check the pilot and the diaphragm at the next visit." },
  "PRV-02, Rehab Edge": { signal: "Outlet pressure", value: "4.8 bar", trend: "flat", confidence: 88, action: "No action. New diaphragm fitted." },
  "Main C2-C4, Fifth Settlement": { signal: "Burst noise", value: "71 dB", trend: "up", confidence: 96, action: "Repair in progress. Replace the joint and 12 m of pipe." },
  "Main D1-D3, Narges Villas": { signal: "Leak noise", value: "66 dB", trend: "up", confidence: 92, action: "Replace 180 m of corroded cast iron within 2 weeks." },
  "Main B1-B3, Third Settlement": { signal: "Leak noise", value: "62 dB", trend: "up", confidence: 89, action: "Repair the burst, then survey the rest of the zone." },
  "Elevated reservoir": { signal: "Level sensor drift", value: "0.4 %", trend: "flat", confidence: 86, action: "No action. Yearly roof inspection is booked." },
  "Pressure sensor PT-06": { signal: "Signal quality", value: "Lost", trend: "down", confidence: 89, action: "Replace the radio module and check the battery." },
  "Chlorinator": { signal: "Dose accuracy", value: "98 %", trend: "flat", confidence: 87, action: "No action. Routine service in January." },
};
export interface PredRow extends Asset { risk: number; failIn: number; failDate: string; pred: Pred }
/** chance of failure in the next 30 days, and when the model expects it, from each asset's health and remaining life */
export function predictive(f: Filters): PredRow[] {
  return assetsIn(f).map((a) => {
    const byHealth = Math.round((100 - a.health) * 1.7 - 6);
    const byLife = a.rul <= 40 ? Math.round(100 - a.rul * 2.2) : 0;
    const risk = Math.max(3, Math.min(97, Math.max(byHealth, byLife)));
    const failDate = new Date(Date.now() + a.rul * 86400000).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    return { ...a, risk, failIn: a.rul, failDate, pred: PRED[a.name] ?? { signal: "Condition", value: "-", trend: "flat", confidence: 70, action: "Keep the routine PM." } };
  });
}
