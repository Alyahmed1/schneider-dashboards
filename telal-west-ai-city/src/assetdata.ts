// Predictive maintenance: assets with one watched sensor each. The series is built from where the sensor started, where it is now and how fast it is bending, so the forecast and the days left are consistent. Sample data only.
import type { Pt, ZoneId } from "./data";

export type Status = "OK" | "Watch" | "Alert";
export interface AssetDef {
  id: string; name: string; type: string; zone: ZoneId; at: Pt; crit: "Critical" | "High" | "Normal";
  sensor: string; unit: string; base: number; limit: number; f: number; p: number; action: string; hours: number; perHour: number;
}

/** f: how far from normal toward the limit the sensor is now (0 to 1); p: how sharply it is bending upward */
export const DEFS: AssetDef[] = [
  { id: "PS-2", name: "Lagoon pump station 2", type: "Pump", zone: "golf", at: [514, 462], crit: "High", sensor: "Vibration", unit: "mm/s", base: 1.4, limit: 7.1, f: 0.7, p: 1.2, action: "Replace the bearing set and re-align the shaft", hours: 18, perHour: 4200 },
  { id: "PS-1", name: "Lagoon pump station 1", type: "Pump", zone: "golf", at: [505, 372], crit: "High", sensor: "Vibration", unit: "mm/s", base: 1.3, limit: 7.1, f: 0.15, p: 1.5, action: "Routine check at the next service", hours: 18, perHour: 4200 },
  { id: "IR-3", name: "Golf irrigation pump set", type: "Pump", zone: "golf", at: [585, 614], crit: "Normal", sensor: "Bearing temperature", unit: "°C", base: 48, limit: 85, f: 0.32, p: 1.4, action: "Re-grease the bearings and check the cooling fan", hours: 10, perHour: 1500 },
  { id: "CH-2", name: "Hospital chiller 2", type: "Chiller", zone: "hospital", at: [650, 232], crit: "Critical", sensor: "Refrigerant pressure drop", unit: "kPa", base: 22, limit: 60, f: 0.36, p: 1.4, action: "Inspect the condenser coil and top up the refrigerant", hours: 30, perHour: 9000 },
  { id: "GN-1", name: "Hospital backup generator", type: "Generator", zone: "hospital", at: [672, 250], crit: "Critical", sensor: "Start time", unit: "s", base: 3, limit: 10, f: 0.15, p: 1.5, action: "Replace the starter battery bank", hours: 8, perHour: 9000 },
  { id: "CH-1", name: "Hotel chiller 1", type: "Chiller", zone: "hotel", at: [443, 456], crit: "High", sensor: "Compressor current", unit: "A", base: 62, limit: 95, f: 0.15, p: 1.5, action: "Routine check at the next service", hours: 24, perHour: 3000 },
  { id: "TX-B", name: "Transformer B", type: "Transformer", zone: "commercial", at: [360, 742], crit: "Critical", sensor: "Oil temperature", unit: "°C", base: 55, limit: 95, f: 0.3, p: 1.3, action: "Schedule an oil test and clean the radiators", hours: 40, perHour: 12000 },
  { id: "TX-A", name: "Transformer A", type: "Transformer", zone: "apartments", at: [612, 420], crit: "Critical", sensor: "Oil temperature", unit: "°C", base: 54, limit: 95, f: 0.12, p: 1.5, action: "Routine check at the next service", hours: 40, perHour: 12000 },
  { id: "BS-2", name: "Water booster set 2", type: "Pump", zone: "villas", at: [400, 580], crit: "High", sensor: "Vibration", unit: "mm/s", base: 1.2, limit: 7.1, f: 0.58, p: 1.4, action: "Balance the impeller and replace the seal", hours: 12, perHour: 2500 },
  { id: "LF-4", name: "Lift 4, commercial tower", type: "Lift", zone: "commercial", at: [300, 690], crit: "High", sensor: "Door cycle time", unit: "s", base: 3.2, limit: 6.5, f: 0.3, p: 1.5, action: "Adjust the door operator at the next visit", hours: 6, perHour: 1800 },
  { id: "LC-12", name: "Street lighting controllers", type: "Controller", zone: "villas", at: [580, 500], crit: "Normal", sensor: "Packet loss", unit: "%", base: 0.5, limit: 8, f: 0.14, p: 1.3, action: "Update the firmware", hours: 4, perHour: 600 },
  { id: "EV-6", name: "EV charger bank", type: "Charger", zone: "commercial", at: [450, 780], crit: "Normal", sensor: "Contactor temperature", unit: "°C", base: 41, limit: 80, f: 0.18, p: 1.4, action: "Replace the contactors on bays 3 and 4", hours: 8, perHour: 900 },
  { id: "AH-2", name: "School air handling unit", type: "HVAC", zone: "school", at: [372, 252], crit: "Normal", sensor: "Filter pressure drop", unit: "Pa", base: 90, limit: 300, f: 0.78, p: 1.2, action: "Replace the filter bank", hours: 5, perHour: 700 },
  { id: "CAM-7", name: "CCTV node 7, school gate", type: "Camera", zone: "school", at: [335, 218], crit: "Normal", sensor: "Packet loss", unit: "%", base: 0.4, limit: 8, f: 0.42, p: 1.3, action: "Check the cable run and the switch port", hours: 3, perHour: 500 },
  { id: "SC-1", name: "Solar inverter 1", type: "Inverter", zone: "future", at: [900, 600], crit: "High", sensor: "Inverter temperature", unit: "°C", base: 46, limit: 85, f: 0.1, p: 1.5, action: "Routine check at the next service", hours: 14, perHour: 2800 },
  { id: "WT-1", name: "Lagoon filtration unit", type: "Filter", zone: "golf", at: [510, 700], crit: "Normal", sensor: "Differential pressure", unit: "kPa", base: 30, limit: 120, f: 0.34, p: 1.4, action: "Backwash and inspect the media", hours: 6, perHour: 800 },
];

export interface Asset extends AssetDef {
  now: number; health: number; rul: number | null; prob30: number; status: Status; confidence: number;
  past: number[]; future: number[];
}

/** the sensor value d days from today (negative = past) */
const value = (a: AssetDef, d: number) => a.base + (a.limit - a.base) * a.f * Math.pow((d + 30) / 30, a.p);

function build(a: AssetDef): Asset {
  const past = Array.from({ length: 31 }, (_, i) => +(value(a, i - 30) + Math.sin(i * 1.7 + a.id.length) * (a.limit - a.base) * 0.012).toFixed(2));
  const future: number[] = [];
  let rul: number | null = null;
  for (let d = 1; d <= 90; d++) {
    const v = value(a, d);
    if (d <= 30) future.push(+v.toFixed(2));
    if (rul === null && v >= a.limit) rul = d;
  }
  const now = past[30];
  const health = Math.round(Math.max(0, Math.min(100, 100 * (1 - (now - a.base) / (a.limit - a.base)))));
  const prob30 = rul === null ? 0.02 : 1 / (1 + Math.exp((rul - 22) / 6));
  const status: Status = (rul !== null && rul <= 20) || health < 30 ? "Alert" : (rul !== null && rul <= 60) || health < 62 ? "Watch" : "OK";
  return { ...a, now, health, rul, prob30, status, confidence: Math.round(78 + (a.id.charCodeAt(0) % 17)), past, future };
}
export const ASSETS: Asset[] = DEFS.map(build).sort((a, b) => b.prob30 - a.prob30);

export const STATUS_TONE: Record<Status, "good" | "warn" | "bad"> = { OK: "good", Watch: "warn", Alert: "bad" };
export const days = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
/** expected hours of downtime and what they would cost, if the forecast failures were left to happen */
export const avoided = (list: Asset[]) => list.reduce((s, a) => ({ hours: s.hours + a.prob30 * a.hours, egp: s.egp + a.prob30 * a.hours * a.perHour }), { hours: 0, egp: 0 });
