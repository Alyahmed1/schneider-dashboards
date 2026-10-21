import { labels, rng, RANGES, type Area, type Filters } from "./data";

export type WoStatus = "Open" | "In progress" | "Done";
export interface WorkOrder {
  id: string; title: string; asset: string; area: Area; prio: "High" | "Medium" | "Low"; due: string; status: WoStatus;
  type: "Planned" | "Unplanned"; crew: string; hours: number; late?: boolean; note: string;
}
export const WORK_ORDERS: WorkOrder[] = [
  { id: "WO-2417", title: "Clean membranes (CIP)", asset: "RO Train B", area: "Train B", prio: "High", due: "27 Oct", status: "Open", type: "Planned", crew: "Membrane team", hours: 16, note: "Differential pressure is above 2.3 bar. Run the acid and alkaline clean and log the permeate flow before and after." },
  { id: "WO-2421", title: "Backwash gravity filter 3", asset: "Pre-treatment", area: "All plant", prio: "Medium", due: "Today", status: "In progress", type: "Planned", crew: "Process crew", hours: 3, note: "Filter ΔP reached 0.84 bar. Backwash and check the media level." },
  { id: "WO-2409", title: "Check vibration on HP pump C", asset: "HP pump C", area: "Train C", prio: "High", due: "Yesterday", status: "Open", type: "Unplanned", crew: "Mechanical crew", hours: 6, late: true, note: "Vibration is trending up on the drive-end bearing. Take a spectrum reading and inspect the coupling." },
  { id: "WO-2425", title: "Refill antiscalant tank", asset: "Chemicals", area: "All plant", prio: "Low", due: "23 Oct", status: "Open", type: "Planned", crew: "Operations", hours: 2, note: "Tank level is 28%. The delivery is already on site." },
  { id: "WO-2431", title: "Replace cartridge filters (set 2)", asset: "Cartridge filters", area: "Train A", prio: "Medium", due: "29 Oct", status: "Open", type: "Planned", crew: "Process crew", hours: 4, note: "Change at 1.2 bar ΔP or 30 days, whichever comes first." },
  { id: "WO-2436", title: "Replace pressure transmitter PT-204", asset: "Instrumentation", area: "Train A", prio: "High", due: "Today", status: "In progress", type: "Unplanned", crew: "I&C crew", hours: 2.5, note: "The reading drifts by 0.8 bar against the local gauge." },
  { id: "WO-2412", title: "Dosing pump stroke fault", asset: "Chemicals", area: "All plant", prio: "Medium", due: "20 Oct", status: "Open", type: "Unplanned", crew: "Mechanical crew", hours: 3, late: true, note: "The stroke sensor is not responding on dosing pump 2." },
  { id: "WO-2433", title: "Thermography on 11 kV switchgear", asset: "Electrical", area: "All plant", prio: "Medium", due: "31 Oct", status: "Open", type: "Planned", crew: "Electrical crew", hours: 5, note: "Yearly infrared scan of busbars and breaker lugs." },
  { id: "WO-2440", title: "Energy recovery device inspection", asset: "ERD bank C", area: "Train C", prio: "Medium", due: "05 Nov", status: "Open", type: "Planned", crew: "Mechanical crew", hours: 8, note: "Check rotor wear and seal leakage." },
  { id: "WO-2402", title: "Calibrate pH analyser", asset: "Post-treatment", area: "All plant", prio: "Low", due: "18 Oct", status: "Done", type: "Planned", crew: "I&C crew", hours: 1.5, note: "Two-point calibration done." },
  { id: "WO-2399", title: "Fix seal leak on intake pump 2", asset: "Intake pump 2", area: "All plant", prio: "High", due: "16 Oct", status: "Done", type: "Unplanned", crew: "Mechanical crew", hours: 7, note: "Mechanical seal replaced." },
  { id: "WO-2388", title: "Lubricate transfer pumps", asset: "Network", area: "All plant", prio: "Low", due: "12 Oct", status: "Done", type: "Planned", crew: "Operations", hours: 1, note: "Routine grease round." },
];
export const woInArea = (w: WorkOrder, f: Filters) => f.area === "All plant" || w.area === "All plant" || w.area === f.area;

export interface Asset { name: string; area: Area | "All plant"; health: number; rul: number; lastService: string; nextPm: string; crit: "A" | "B" | "C" }
export const ASSETS: Asset[] = [
  { name: "HP pump A", area: "Train A", health: 91, rul: 410, lastService: "03 Sep", nextPm: "03 Dec", crit: "A" },
  { name: "HP pump B", area: "Train B", health: 84, rul: 330, lastService: "21 Aug", nextPm: "21 Nov", crit: "A" },
  { name: "HP pump C", area: "Train C", health: 63, rul: 48, lastService: "11 Jul", nextPm: "Overdue", crit: "A" },
  { name: "RO membranes · Train B", area: "Train B", health: 73, rul: 6, lastService: "02 Aug", nextPm: "27 Oct", crit: "A" },
  { name: "RO membranes · Train A", area: "Train A", health: 88, rul: 41, lastService: "14 Sep", nextPm: "05 Dec", crit: "A" },
  { name: "RO membranes · Train C", area: "Train C", health: 91, rul: 58, lastService: "27 Sep", nextPm: "20 Dec", crit: "A" },
  { name: "Energy recovery bank A", area: "Train A", health: 95, rul: 620, lastService: "10 Aug", nextPm: "10 Feb", crit: "B" },
  { name: "Intake pump 2", area: "All plant", health: 78, rul: 190, lastService: "16 Oct", nextPm: "16 Jan", crit: "B" },
  { name: "Main transformer TR-1", area: "All plant", health: 94, rul: 2900, lastService: "02 Mar", nextPm: "02 Mar", crit: "A" },
  { name: "Gravity filter 3", area: "All plant", health: 69, rul: 22, lastService: "30 Sep", nextPm: "Today", crit: "B" },
  { name: "Dosing pump 2", area: "All plant", health: 58, rul: 14, lastService: "05 Jun", nextPm: "Overdue", crit: "C" },
  { name: "Transfer pump 1", area: "All plant", health: 89, rul: 370, lastService: "12 Oct", nextPm: "12 Jan", crit: "B" },
];
export const assetsIn = (f: Filters) => ASSETS.filter((a) => f.area === "All plant" || a.area === "All plant" || a.area === f.area);

export function maintenanceHours(f: Filters) {
  const r = rng(555 + RANGES.indexOf(f.range) * 7 + AREA_SEED[f.area]);
  const scale = (f.range === "24H" ? 0.18 : f.range === "YTD" ? 28 : 1) * (f.area === "All plant" ? 1 : 1 / 3) * 1.4;
  return labels(f.range).map((t) => ({ t, planned: Math.round(26 * scale * (0.7 + r() * 0.6)), unplanned: Math.round(9 * scale * (0.3 + r() * 1.2)) }));
}
const AREA_SEED: Record<Area, number> = { "All plant": 1, "Train A": 2, "Train B": 3, "Train C": 4 };

/* ---------- electrical ---------- */
export interface Feeder { id: string; kw: number; rated: number; kv: number; pf: number }
export const LOADS: Feeder[] = [
  { id: "hp", kw: 9100, rated: 11000, kv: 11, pf: 0.93 },
  { id: "intake", kw: 2100, rated: 2800, kv: 11, pf: 0.91 },
  { id: "pre", kw: 1050, rated: 1400, kv: 0.4, pf: 0.92 },
  { id: "transfer", kw: 2600, rated: 3200, kv: 11, pf: 0.9 },
  { id: "aux", kw: 986, rated: 1200, kv: 0.4, pf: 0.95 },
];
export const SOLAR_KW = 4100;
export const GEN_KW = 1800;
export const PRODUCT_FLOW = 4980;

export interface PowerPoint { t: string; solar: number; hp: number; intake: number; pre: number; transfer: number; aux: number }
export function powerSeries(f: Filters): PowerPoint[] {
  const r = rng(909 + RANGES.indexOf(f.range) * 11 + AREA_SEED[f.area]);
  const k = f.area === "All plant" ? 1 : 1 / 3;
  return labels(f.range).map((t, i) => {
    const sun = f.range === "24H" ? Math.max(0, Math.sin(((i - 6) / 12) * Math.PI)) * 1.05 : 0.5 + r() * 0.2;
    const row: PowerPoint = { t, solar: Math.round(SOLAR_KW * k * sun), hp: 0, intake: 0, pre: 0, transfer: 0, aux: 0 };
    LOADS.forEach((l) => { row[l.id as "hp"] = Math.round(l.kw * k * (0.95 + r() * 0.08)); });
    return row;
  });
}
