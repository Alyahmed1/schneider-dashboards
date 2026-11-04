/* ================= Landscape: the headquarters gardens, roads and villas (all numbers are sample data) =================
   12 irrigation zones on 3 smart controllers, with soil probes, a weather station, flow meters and pressure sensors.
   Each controller runs its zones one after the other from its start time, so only one valve per controller is open at a time. */
import { etShare, FARM, rng } from "./farm";

export type ZType = "Lawn" | "Shrubs" | "Trees" | "Flowers" | "Palms";
export type CtrlId = "C1" | "C2" | "C3";
const KC: Record<ZType, number> = { Lawn: 0.85, Shrubs: 0.55, Trees: 0.6, Flowers: 0.9, Palms: 0.7 };
const RATE: Record<ZType, number> = { Lawn: 30, Flowers: 25, Shrubs: 10, Trees: 6, Palms: 5 }; // mm of water per hour the emitters put on
export const ZTYPES: ZType[] = ["Lawn", "Shrubs", "Trees", "Flowers", "Palms"];

export interface LZone { id: string; name: string; type: ZType; ctrl: CtrlId; area: number; base: number; poly: [number, number][]; fault?: string } // poly: corners on the Madinaty map picture (see geo.ts)
export const LZONES: LZone[] = [
  { id: "Z1", name: "Villa lawn NW", type: "Lawn", ctrl: "C1", area: 600, base: 37, poly: [[215, 200], [440, 195], [500, 265], [475, 385], [235, 405], [175, 270]] },
  { id: "Z2", name: "Mosque flower beds", type: "Flowers", ctrl: "C1", area: 250, base: 36, poly: [[100, 605], [250, 572], [262, 690], [112, 716]] },
  { id: "Z3", name: "Park palms north", type: "Palms", ctrl: "C1", area: 400, base: 35, poly: [[262, 515], [505, 490], [525, 590], [430, 628], [305, 588]] },
  { id: "Z4", name: "Park trees south", type: "Trees", ctrl: "C1", area: 500, base: 34, poly: [[190, 692], [430, 690], [485, 765], [205, 765]] },
  { id: "Z5", name: "Club roundabout", type: "Lawn", ctrl: "C2", area: 700, base: 38, poly: [[520, 330], [585, 325], [600, 425], [540, 450], [517, 385]] },
  { id: "Z6", name: "Villa hedges NE", type: "Shrubs", ctrl: "C2", area: 300, base: 36, poly: [[570, 205], [800, 205], [805, 285], [600, 335]] },
  { id: "Z7", name: "Club gate flowers", type: "Flowers", ctrl: "C2", area: 260, base: 37, poly: [[640, 395], [760, 392], [765, 470], [645, 478]] },
  { id: "Z8", name: "Tennis court lawn", type: "Lawn", ctrl: "C2", area: 650, base: 36, poly: [[768, 395], [885, 395], [885, 462], [772, 466]] },
  { id: "Z9", name: "Football pitch", type: "Lawn", ctrl: "C2", area: 650, base: 33, poly: [[820, 497], [905, 497], [905, 592], [820, 592]], fault: "Valve will not open" },
  { id: "Z10", name: "Pool-side trees", type: "Trees", ctrl: "C3", area: 800, base: 35, poly: [[650, 500], [812, 490], [812, 600], [648, 612]] },
  { id: "Z11", name: "Club east palms", type: "Palms", ctrl: "C3", area: 700, base: 36, poly: [[915, 497], [1005, 497], [1005, 592], [915, 592]] },
  { id: "Z12", name: "Southern villa trees", type: "Trees", ctrl: "C3", area: 900, base: 34, poly: [[625, 668], [1090, 650], [1090, 765], [625, 765]] },
];
export const zoneById = (id: string) => LZONES.find((z) => z.id === id);

export interface LCtrl { id: CtrlId; name: string; place: string; start: number; link: string; fw: string; rssi: number; lastSeen: string }
export const LCTRLS: LCtrl[] = [
  { id: "C1", name: "Gate controller", place: "Main gate", start: 2.5, link: "4G", fw: "4.2.1", rssi: -71, lastSeen: "1 min ago" },
  { id: "C2", name: "HQ and villas controller", place: "Headquarters", start: 18.75, link: "4G", fw: "4.2.1", rssi: -64, lastSeen: "1 min ago" },
  { id: "C3", name: "Roads controller", place: "Service road", start: 7.67, link: "LoRa", fw: "4.1.7", rssi: -88, lastSeen: "3 min ago" },
];

export const planMm = (z: LZone) => FARM.et0 * KC[z.type] * 1.1; // mm per day
export const runMin = (z: LZone, etAdj = 100) => ((planMm(z) * (etAdj / 100)) / RATE[z.type]) * 60; // minutes the valve stays open
export const flowLpm = (z: LZone) => (z.area * RATE[z.type]) / 60; // litres per minute while the valve is open
const zonesOf = (c: CtrlId) => LZONES.filter((z) => z.ctrl === c);
/** hour at which a zone's valve opens and closes today */
export function runWindow(z: LZone, etAdj = 100): [number, number] {
  const c = LCTRLS.find((x) => x.id === z.ctrl)!;
  let t = c.start;
  for (const q of zonesOf(z.ctrl)) {
    const end = t + runMin(q, etAdj) / 60;
    if (q.id === z.id) return [t, end];
    t = end;
  }
  return [t, t];
}

export type ZStatus = "Watering" | "Scheduled" | "Done" | "Fault";
export interface ZoneNow { z: LZone; status: ZStatus; moist: number; applied: number; lpm: number; start: number; end: number }
const moistClass = (m: number) => (m < 28 ? "dry" : m < 33 ? "low" : m <= 45 ? "ok" : "wet") as "dry" | "low" | "ok" | "wet";
export { moistClass as lMoistClass };
/** the share of today's crop water use that has happened by hour h */
function etSoFar(h: number) { let s = 0; for (let t = 0; t < h; t += 0.25) { const dt = Math.min(0.25, h - t); s += etShare(t + dt / 2) * dt; } return s; }
/** every zone at hour h of today */
export function zonesAt(h: number, etAdj = 100): ZoneNow[] {
  return LZONES.map((z) => {
    const [s, e] = runWindow(z, etAdj);
    const watering = !z.fault && h >= s && h < e;
    const done = h >= e;
    const applied = z.fault ? 0 : done ? planMm(z) * (etAdj / 100) : watering ? planMm(z) * (etAdj / 100) * ((h - s) / (e - s)) : 0;
    const used = KC[z.type] * FARM.et0 * etSoFar(h); // mm of water the plants used so far today
    const moist = Math.min(55, Math.max(12, z.base + 0.9 * (applied - used)));
    return { z, status: z.fault ? "Fault" : watering ? "Watering" : done ? "Done" : "Scheduled", moist, applied, lpm: watering ? flowLpm(z) : 0, start: s, end: e };
  });
}

/* ---------- the weather at the site, hour by hour ---------- */
export const siteWeather = (h: number) => ({
  temp: Math.round(21 + 9 * Math.max(0, Math.sin((Math.PI * (h - 8)) / 12))),
  rh: Math.round(58 - 26 * Math.max(0, Math.sin((Math.PI * (h - 8)) / 12))),
  wind: Math.round(8 + 10 * Math.max(0, Math.sin((Math.PI * (h - 6)) / 12))),
  solar: Math.round(900 * Math.max(0, Math.sin((Math.PI * (h - 6)) / 12))),
  rain: 0,
});

/* ---------- sensors ---------- */
export type SKind = "Soil moisture" | "Rain" | "Wind" | "Air" | "Solar" | "Flow" | "Pressure" | "Tank level";
export type SStatus = "OK" | "Low battery" | "Offline";
export interface Sensor { id: string; name: string; kind: SKind; where: string; unit: string; battery: number; status: SStatus; seen: string; zone?: string }
const LOWBAT: Record<string, number> = { "S-04": 12, "S-11": 18 };
export const SENSORS: Sensor[] = [
  ...LZONES.map((z, i): Sensor => {
    const id = `S-${String(i + 1).padStart(2, "0")}`;
    const off = id === "S-09";
    return { id, name: `${z.name} probe`, kind: "Soil moisture", where: z.id, unit: "%", battery: off ? 0 : LOWBAT[id] ?? 60 + ((i * 17) % 38), status: off ? "Offline" : LOWBAT[id] ? "Low battery" : "OK", seen: off ? "42 min ago" : "2 min ago", zone: z.id };
  }),
  { id: "RG-1", name: "Rain gauge", kind: "Rain", where: "HQ roof", unit: "mm", battery: 88, status: "OK", seen: "1 min ago" },
  { id: "WS-1", name: "Wind sensor", kind: "Wind", where: "HQ roof", unit: "km/h", battery: 91, status: "OK", seen: "1 min ago" },
  { id: "TH-1", name: "Air temperature and humidity", kind: "Air", where: "HQ garden", unit: "°C", battery: 79, status: "OK", seen: "1 min ago" },
  { id: "SR-1", name: "Solar radiation", kind: "Solar", where: "HQ roof", unit: "W/m²", battery: 84, status: "OK", seen: "1 min ago" },
  { id: "FM-1", name: "Flow meter, gate", kind: "Flow", where: "C1", unit: "L/min", battery: 100, status: "OK", seen: "1 min ago" },
  { id: "FM-2", name: "Flow meter, HQ", kind: "Flow", where: "C2", unit: "L/min", battery: 100, status: "OK", seen: "1 min ago" },
  { id: "FM-3", name: "Flow meter, roads", kind: "Flow", where: "C3", unit: "L/min", battery: 100, status: "OK", seen: "3 min ago" },
  { id: "PT-1", name: "Pressure, gate", kind: "Pressure", where: "C1", unit: "bar", battery: 100, status: "OK", seen: "1 min ago" },
  { id: "PT-2", name: "Pressure, HQ", kind: "Pressure", where: "C2", unit: "bar", battery: 100, status: "OK", seen: "1 min ago" },
  { id: "PT-3", name: "Pressure, roads", kind: "Pressure", where: "C3", unit: "bar", battery: 100, status: "OK", seen: "3 min ago" },
  { id: "LT-1", name: "Reuse tank level", kind: "Tank level", where: "Pump house", unit: "%", battery: 100, status: "OK", seen: "1 min ago" },
];
export const sensorById = (id: string) => SENSORS.find((s) => s.id === id);
/** the reading of one sensor at hour h */
export function sensorValue(s: Sensor, h: number): number {
  const w = siteWeather(h);
  if (s.kind === "Soil moisture") return zonesAt(h).find((z) => z.z.id === s.zone)!.moist;
  if (s.kind === "Rain") return w.rain;
  if (s.kind === "Wind") return w.wind;
  if (s.kind === "Air") return w.temp;
  if (s.kind === "Solar") return w.solar;
  const c = s.where;
  if (s.kind === "Flow") return zonesAt(h).filter((z) => z.z.ctrl === c).reduce((a, z) => a + z.lpm, 0);
  if (s.kind === "Pressure") return zonesAt(h).some((z) => z.z.ctrl === c && z.lpm > 0) ? 3.1 + (rng(s.id.charCodeAt(3))() - 0.5) * 0.3 : 4.2;
  return 64 + 14 * Math.cos((h / 24) * Math.PI * 2); // reuse tank: drawn down by the morning and evening watering
}
export const sensorText = (s: Sensor, v: number) => (s.status === "Offline" ? "No signal" : `${s.kind === "Pressure" || s.kind === "Air" || s.kind === "Soil moisture" ? v.toFixed(1) : Math.round(v).toLocaleString("en-US")} ${s.unit}`);

/** water used by the whole landscape per day for a week, litres → m³ (the last day is today) */
export function weekUse(): { t: string; v: number }[] {
  const todayM3 = LZONES.reduce((s, z) => s + (z.fault ? 0 : (flowLpm(z) * runMin(z)) / 1000), 0);
  const r = rng(515);
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = new Date().getDay();
  return Array.from({ length: 7 }, (_, i) => ({ t: names[(d - 6 + i + 7) % 7], v: i === 6 ? todayM3 : todayM3 * (0.9 + r() * 0.25) }));
}
export const todayUseM3 = () => LZONES.reduce((s, z) => s + (z.fault ? 0 : (flowLpm(z) * runMin(z)) / 1000), 0);
