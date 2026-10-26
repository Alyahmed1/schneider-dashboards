import { labels, rng, RANGES, type Area, type Filters } from "./data";

export type WoStatus = "Open" | "In progress" | "Done";
export interface WorkOrder {
  id: string; title: string; asset: string; area: Area; prio: "High" | "Medium" | "Low"; due: string; status: WoStatus;
  type: "Planned" | "Unplanned"; crew: string; hours: number; late?: boolean; note: string;
}
export const WORK_ORDERS: WorkOrder[] = [
  { id: "WO-2417", title: "Clean diffusers (lane B)", asset: "Aeration lane B", area: "Lane B", prio: "High", due: "27 Oct", status: "Open", type: "Planned", crew: "Process crew", hours: 16, note: "Dissolved oxygen is below 1.5 mg/L. Drain the lane, wash the diffusers and log the oxygen transfer before and after." },
  { id: "WO-2421", title: "Empty grit classifier 2", asset: "Grit & grease", area: "All plant", prio: "Medium", due: "Today", status: "In progress", type: "Planned", crew: "Process crew", hours: 3, note: "The hopper is 95% full. Empty it and check the screw wear." },
  { id: "WO-2409", title: "Check vibration on blower B-401C", asset: "Blower B-401C", area: "Lane C", prio: "High", due: "Yesterday", status: "Open", type: "Unplanned", crew: "Mechanical crew", hours: 6, late: true, note: "Vibration is trending up on the drive-end bearing. Take a spectrum reading and inspect the coupling." },
  { id: "WO-2425", title: "Refill polymer tank", asset: "Chemicals", area: "All plant", prio: "Low", due: "23 Oct", status: "Open", type: "Planned", crew: "Operations", hours: 2, note: "Tank level is 28%. The delivery is already on site." },
  { id: "WO-2431", title: "Replace diffuser membranes (grid 2)", asset: "Aeration lane A", area: "Lane A", prio: "Medium", due: "29 Oct", status: "Open", type: "Planned", crew: "Process crew", hours: 10, note: "Change when oxygen transfer is 15% below the clean value, or after 5 years." },
  { id: "WO-2436", title: "Replace DO probe AIT-401A", asset: "Instrumentation", area: "Lane A", prio: "High", due: "Today", status: "In progress", type: "Unplanned", crew: "I&C crew", hours: 2.5, note: "The reading drifts by 0.6 mg/L against the handheld meter." },
  { id: "WO-2412", title: "Dosing pump stroke fault", asset: "Chemicals", area: "All plant", prio: "Medium", due: "20 Oct", status: "Open", type: "Unplanned", crew: "Mechanical crew", hours: 3, late: true, note: "The stroke sensor is not responding on polymer dosing pump 2." },
  { id: "WO-2433", title: "Thermography on 11 kV switchgear", asset: "Electrical", area: "All plant", prio: "Medium", due: "31 Oct", status: "Open", type: "Planned", crew: "Electrical crew", hours: 5, note: "Yearly infrared scan of busbars and breaker lugs." },
  { id: "WO-2440", title: "Digester 2 mixer inspection", asset: "Digester 2", area: "All plant", prio: "Medium", due: "05 Nov", status: "Open", type: "Planned", crew: "Mechanical crew", hours: 8, note: "Check the gearbox oil and the mixer blades for wear." },
  { id: "WO-2402", title: "Calibrate pH analyser", asset: "Tertiary & disinfection", area: "All plant", prio: "Low", due: "18 Oct", status: "Done", type: "Planned", crew: "I&C crew", hours: 1.5, note: "Two-point calibration done." },
  { id: "WO-2399", title: "Fix seal leak on influent pump 2", asset: "Influent pump 2", area: "All plant", prio: "High", due: "16 Oct", status: "Done", type: "Unplanned", crew: "Mechanical crew", hours: 7, note: "Mechanical seal replaced." },
  { id: "WO-2388", title: "Lubricate reuse pumps", asset: "Effluent & reuse", area: "All plant", prio: "Low", due: "12 Oct", status: "Done", type: "Planned", crew: "Operations", hours: 1, note: "Routine grease round." },
];
export const woInArea = (w: WorkOrder, f: Filters) => f.area === "All plant" || w.area === "All plant" || w.area === f.area;

export interface Asset { name: string; area: Area | "All plant"; health: number; rul: number; lastService: string; nextPm: string; crit: "A" | "B" | "C" }
export const ASSETS: Asset[] = [
  { name: "Blower B-401A", area: "Lane A", health: 91, rul: 410, lastService: "03 Sep", nextPm: "03 Dec", crit: "A" },
  { name: "Blower B-401B", area: "Lane B", health: 84, rul: 330, lastService: "21 Aug", nextPm: "21 Nov", crit: "A" },
  { name: "Blower B-401C", area: "Lane C", health: 63, rul: 48, lastService: "11 Jul", nextPm: "Overdue", crit: "A" },
  { name: "Diffusers · Lane B", area: "Lane B", health: 73, rul: 6, lastService: "02 Aug", nextPm: "27 Oct", crit: "A" },
  { name: "Diffusers · Lane A", area: "Lane A", health: 88, rul: 41, lastService: "14 Sep", nextPm: "05 Dec", crit: "A" },
  { name: "Diffusers · Lane C", area: "Lane C", health: 91, rul: 58, lastService: "27 Sep", nextPm: "20 Dec", crit: "A" },
  { name: "CHP engine", area: "All plant", health: 95, rul: 620, lastService: "10 Aug", nextPm: "10 Feb", crit: "B" },
  { name: "Influent pump 2", area: "All plant", health: 78, rul: 190, lastService: "16 Oct", nextPm: "16 Jan", crit: "B" },
  { name: "Main transformer TR-1", area: "All plant", health: 94, rul: 2900, lastService: "02 Mar", nextPm: "02 Mar", crit: "A" },
  { name: "Grit classifier 2", area: "All plant", health: 69, rul: 22, lastService: "30 Sep", nextPm: "Today", crit: "B" },
  { name: "Polymer dosing pump 2", area: "All plant", health: 58, rul: 14, lastService: "05 Jun", nextPm: "Overdue", crit: "C" },
  { name: "Reuse pump 1", area: "All plant", health: 89, rul: 370, lastService: "12 Oct", nextPm: "12 Jan", crit: "B" },
];
export const assetsIn = (f: Filters) => ASSETS.filter((a) => f.area === "All plant" || a.area === "All plant" || a.area === f.area);

export function maintenanceHours(f: Filters) {
  const r = rng(555 + RANGES.indexOf(f.range) * 7 + AREA_SEED[f.area]);
  const scale = (f.range === "24H" ? 0.18 : f.range === "YTD" ? 28 : 1) * (f.area === "All plant" ? 1 : 1 / 3) * 1.4;
  return labels(f.range).map((t) => ({ t, planned: Math.round(26 * scale * (0.7 + r() * 0.6)), unplanned: Math.round(9 * scale * (0.3 + r() * 1.2)) }));
}
const AREA_SEED: Record<Area, number> = { "All plant": 1, "Lane A": 2, "Lane B": 3, "Lane C": 4 };

/* ---------- electrical ---------- */
export interface Feeder { id: string; kw: number; rated: number; kv: number; pf: number }
export const LOADS: Feeder[] = [
  { id: "blowers", kw: 1480, rated: 1900, kv: 11, pf: 0.93 },
  { id: "influent", kw: 540, rated: 700, kv: 11, pf: 0.91 },
  { id: "tertiary", kw: 330, rated: 450, kv: 0.4, pf: 0.92 },
  { id: "sludge", kw: 290, rated: 380, kv: 0.4, pf: 0.9 },
  { id: "aux", kw: 190, rated: 260, kv: 0.4, pf: 0.95 },
];
export const SOLAR_KW = 500; // a 0.6 MWp field at midday
export const GEN_KW = 1000; // the biogas engine's electric output (it is rated 1.2 MW)
export const PRODUCT_FLOW = 6080; // m³/h of treated water, for the energy per m³

export interface PowerPoint { t: string; solar: number; blowers: number; influent: number; tertiary: number; sludge: number; aux: number }
export function powerSeries(f: Filters): PowerPoint[] {
  const r = rng(909 + RANGES.indexOf(f.range) * 11 + AREA_SEED[f.area]);
  const k = f.area === "All plant" ? 1 : 1 / 3;
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
  "Blower B-401A": { signal: "Vibration", value: "2.4 mm/s", trend: "flat", confidence: 90, action: "Keep the routine PM. No fault is developing." },
  "Blower B-401B": { signal: "Vibration", value: "3.1 mm/s", trend: "up", confidence: 84, action: "Re-check the alignment at the next PM." },
  "Blower B-401C": { signal: "Vibration", value: "7.4 mm/s", trend: "up", confidence: 91, action: "Inspect the drive-end bearing and coupling within 2 weeks." },
  "Diffusers · Lane B": { signal: "Dissolved oxygen", value: "1.1 mg/L", trend: "down", confidence: 93, action: "Clean the diffusers before the oxygen drops below 1.0 mg/L." },
  "Diffusers · Lane A": { signal: "Air-pressure rise", value: "+0.12 bar", trend: "up", confidence: 82, action: "Plan the next diffuser clean in about 6 weeks." },
  "Diffusers · Lane C": { signal: "Air-pressure rise", value: "+0.08 bar", trend: "flat", confidence: 80, action: "No action. Keep monitoring." },
  "CHP engine": { signal: "Electrical efficiency", value: "38 %", trend: "flat", confidence: 88, action: "No action. Do the oil and spark-plug service at the next planned stop." },
  "Influent pump 2": { signal: "Seal temperature", value: "61 °C", trend: "flat", confidence: 76, action: "New seal fitted. Check again after 30 days of running." },
  "Main transformer TR-1": { signal: "Winding temperature", value: "82 °C", trend: "up", confidence: 74, action: "Check the cooling fans and oil level before the summer peak." },
  "Grit classifier 2": { signal: "Hopper level", value: "95 %", trend: "up", confidence: 87, action: "Empty the hopper now, then check the screw wear." },
  "Polymer dosing pump 2": { signal: "Stroke error", value: "4.2 %", trend: "up", confidence: 89, action: "Replace the stroke sensor and recalibrate the pump." },
  "Reuse pump 1": { signal: "Motor current", value: "77 A", trend: "flat", confidence: 85, action: "No action. Routine lubrication is enough." },
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
