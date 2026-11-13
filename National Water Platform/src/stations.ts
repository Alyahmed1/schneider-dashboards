/**
 * Stations shown as pins on the Home map (all simulated). Each station belongs to one ministry; the owner can be changed here later.
 * `kpis` are the three mini numbers shown on the pin card; labels come from the station type.
 */
import { Waves, Droplet, Factory, Sprout, Zap, Gauge, Recycle, FlaskConical, Building2, Activity, type LucideIcon } from "lucide-react";
import type { MinistryId, Status } from "./data";

export type StationType = "dam" | "barrage" | "pumps" | "plant" | "desal" | "wwtp" | "zone" | "monitor" | "farm" | "reuse";
export const TYPE_INFO: Record<StationType, { label: string; icon: LucideIcon; kpiLabels: [string, string, string] }> = {
  dam: { label: "Dam", icon: Waves, kpiLabels: ["Storage", "Release", "Level"] },
  barrage: { label: "Barrage", icon: Gauge, kpiLabels: ["Flow", "Gates open", "Level"] },
  pumps: { label: "Pump station", icon: Zap, kpiLabels: ["Flow", "Pumps running", "Energy"] },
  plant: { label: "Drinking water plant", icon: Droplet, kpiLabels: ["Output", "Capacity used", "Quality pass"] },
  desal: { label: "Desalination plant", icon: FlaskConical, kpiLabels: ["Output", "Recovery", "Energy"] },
  wwtp: { label: "Wastewater plant", icon: Recycle, kpiLabels: ["Treated", "Capacity used", "Compliance"] },
  zone: { label: "Industrial zone", icon: Factory, kpiLabels: ["Discharge", "COD", "Compliance"] },
  monitor: { label: "Monitoring station", icon: Activity, kpiLabels: ["Compliance", "Parameters", "Last alert"] },
  farm: { label: "Smart farm", icon: Sprout, kpiLabels: ["Area", "Efficiency", "Soil moisture"] },
  reuse: { label: "Farm-water reuse station", icon: Building2, kpiLabels: ["Reused water", "Area served", "Salinity"] },
};

/** what is wrong at each station that is not on track (these feed the Executive View list, bell and ticker) */
const ISSUES: Record<string, string> = {
  sharm: "Membrane cleaning overdue, output down to 60 K m³/day",
  helwan: "Discharge COD 96 mg/L, above the 80 mg/L limit",
  minya: "Pivot P4 drive fault, 150 feddan not irrigating",
  giza: "Low pressure in Zone 4, about 38,000 people affected",
  alexz: "COD near the limit at 2 discharge points",
  naga: "One gate under repair, flow 365 m³/s",
  mahmoudiya: "Two pumps off for service",
  suez: "Running at 96% of capacity",
  mariut: "Dissolved oxygen low in the lake",
  fayoumf: "Soil moisture 31%, irrigation plan under review",
};
export interface Station { id: string; name: string; ministry: MinistryId; type: StationType; lat: number; lng: number; status: Status; kpis: [string, string, string]; featured?: boolean; issue?: string }
const S = (id: string, name: string, ministry: MinistryId, type: StationType, lat: number, lng: number, status: Status, kpis: [string, string, string], featured = false): Station =>
  ({ id, name, ministry, type, lat, lng, status, kpis, featured, issue: ISSUES[id] });

export const STATIONS: Station[] = [
  // Water Resources and Irrigation
  S("aswan", "Aswan High Dam", "mwri", "dam", 23.97, 32.88, "good", ["82 %", "92 % of plan", "178.4 m"]),
  S("toshka", "Toshka pumping station", "mwri", "pumps", 22.95, 31.55, "good", ["38 m³/s", "9 of 10", "21 MWh"]),
  S("esna", "Esna Barrage", "mwri", "barrage", 25.29, 32.55, "good", ["410 m³/s", "6 of 8", "76.2 m"]),
  S("naga", "Naga Hammadi Barrage", "mwri", "barrage", 26.07, 32.24, "watch", ["365 m³/s", "5 of 7", "69.8 m"]),
  S("assiut", "Assiut Barrage", "mwri", "barrage", 27.2, 31.19, "good", ["420 m³/s", "7 of 9", "51.6 m"]),
  S("fayoum", "Lake Qarun inlet pumps", "mwri", "pumps", 29.4, 30.65, "good", ["24 m³/s", "6 of 6", "9 MWh"]),
  S("delta", "Delta Barrage", "mwri", "barrage", 30.19, 31.13, "good", ["380 m³/s", "8 of 10", "17.9 m"]),
  S("mahmoudiya", "Mahmoudiya canal pumps", "mwri", "pumps", 31.0, 30.45, "watch", ["52 m³/s", "7 of 9", "18 MWh"]),
  S("damietta", "Damietta Barrage", "mwri", "barrage", 31.38, 31.76, "good", ["95 m³/s", "4 of 5", "2.9 m"]),
  // Housing, Utilities and Urban Communities
  S("rod", "Rod El Farag water plant", "mhuuc", "plant", 30.1, 31.25, "good", ["1.1 M m³/day", "88 %", "99.2 %"]),
  S("giza", "Giza water plant", "mhuuc", "plant", 29.99, 31.2, "watch", ["1.4 M m³/day", "93 %", "98.6 %"]),
  S("asfar", "Gabal El Asfar wastewater plant", "mhuuc", "wwtp", 30.17, 31.43, "good", ["2.5 M m³/day", "91 %", "97 %"]),
  S("siouf", "Siouf water plant, Alexandria", "mhuuc", "plant", 31.2, 29.95, "good", ["0.9 M m³/day", "84 %", "99.0 %"]),
  S("alamein", "El Alamein desalination", "mhuuc", "desal", 30.83, 28.95, "good", ["150 K m³/day", "41 %", "3.3 kWh/m³"]),
  S("suez", "Suez wastewater plant", "mhuuc", "wwtp", 29.97, 32.55, "watch", ["0.4 M m³/day", "96 %", "94 %"]),
  S("portsaid", "Port Said water plant", "mhuuc", "plant", 31.26, 32.3, "good", ["0.5 M m³/day", "79 %", "99.4 %"]),
  S("luxor", "Luxor water plant", "mhuuc", "plant", 25.7, 32.65, "good", ["0.3 M m³/day", "72 %", "99.1 %"]),
  S("hurghada", "Hurghada desalination", "mhuuc", "desal", 27.26, 33.8, "good", ["80 K m³/day", "92 %", "3.5 kWh/m³"]),
  S("sharm", "Sharm El Sheikh desalination", "mhuuc", "desal", 27.9, 34.3, "bad", ["60 K m³/day", "78 %", "3.9 kWh/m³"]),
  // Environment
  S("alexz", "Alexandria industrial zone", "eeaa", "zone", 31.1, 29.85, "watch", ["220 K m³/day", "62 mg/L", "94 %"]),
  S("mariut", "Lake Mariout station", "eeaa", "monitor", 31.0, 29.8, "watch", ["91 %", "18", "2 days ago"]),
  S("tenth", "10th of Ramadan zone", "eeaa", "zone", 30.3, 31.75, "good", ["310 K m³/day", "48 mg/L", "98 %"]),
  S("october", "6th of October zone", "eeaa", "zone", 29.95, 30.9, "good", ["260 K m³/day", "51 mg/L", "97 %"]),
  S("helwan", "Helwan industrial zone", "eeaa", "zone", 29.85, 31.34, "bad", ["190 K m³/day", "96 mg/L", "86 %"]),
  S("zayat", "Kafr El Zayat Nile station", "eeaa", "monitor", 30.82, 30.82, "good", ["97 %", "18", "6 days ago"]),
  S("gulf", "Gulf of Suez coast station", "eeaa", "monitor", 29.6, 32.45, "good", ["96 %", "14", "9 days ago"]),
  S("assiutq", "Assiut Nile station", "eeaa", "monitor", 27.18, 31.15, "good", ["98 %", "18", "12 days ago"]),
  S("aswanq", "Aswan Nile station", "eeaa", "monitor", 24.1, 32.9, "good", ["99 %", "18", "20 days ago"]),
  // Agriculture and Land Reclamation
  S("hamam", "El Hamam", "moalr", "reuse", 31.0, 32.05, "good", ["1.0 M m³/day", "135 K feddan", "1.1 dS/m"], true),
  S("minya", "Minya smart farms", "moalr", "farm", 28.1, 30.75, "bad", ["52 K feddan", "81 %", "34 %"]),
  S("nubaria", "Nubaria drip farms", "moalr", "farm", 30.7, 30.1, "good", ["64 K feddan", "90 %", "38 %"]),
  S("natrun", "Wadi El Natrun farms", "moalr", "farm", 30.4, 30.3, "good", ["38 K feddan", "88 %", "36 %"]),
  S("fayoumf", "Fayoum drip farms", "moalr", "farm", 29.3, 30.85, "watch", ["46 K feddan", "84 %", "31 %"]),
  S("farafra", "Farafra pivots", "moalr", "farm", 27.06, 27.97, "good", ["72 K feddan", "89 %", "33 %"]),
  S("owainat", "East Owainat pivots", "moalr", "farm", 22.6, 28.6, "good", ["110 K feddan", "91 %", "30 %"]),
  S("tosh-f", "Toshka farms", "moalr", "farm", 22.85, 31.2, "good", ["90 K feddan", "87 %", "32 %"]),
  S("gharbia", "Gharbia Delta farms", "moalr", "farm", 30.9, 31.0, "good", ["58 K feddan", "86 %", "40 %"]),
];

/** where each ministry's icon sits on the national view */
export const HUBS: Record<MinistryId, [number, number]> = {
  mwri: [25.4, 32.75],
  mhuuc: [29.9, 31.4],
  eeaa: [30.55, 29.3],
  moalr: [27.4, 28.6],
};
/** stations that have their own page (3D plant + KPIs). Add an id here when another station gets a page. */
export const STATION_PAGES = new Set(["hamam"]);
export const STATION_BY_ID: Record<string, Station> = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

/** short name for the label under a pin ("Toshka pumping station" -> "Toshka") */
export const shortName = (s: Station) =>
  s.name.replace(/,.*$/, "").replace(/\b(pumping station|water plant|wastewater plant|desalination|station|farms|pivots|zone|canal pumps|inlet pumps|Barrage|drip|smart|Nile)\b/gi, "").replace(/\s+/g, " ").trim() || s.name;

/** extra simulated numbers for the pin card (same station always gets the same numbers): health score, two bars and a 12-hour chart */
const hash = (t: string) => { let h = 2166136261; for (const c of t) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export function stationStats(s: Station) {
  let seed = hash(s.id);
  const r = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const score = Math.round((s.status === "good" ? 90 : s.status === "watch" ? 75 : 55) + r() * 7);
  const load = Math.round(62 + r() * 32);
  const up = (s.status === "good" ? 99.2 : s.status === "watch" ? 97.4 : 93.5) + r() * 0.6;
  const drift = s.status === "bad" ? -1 : s.status === "watch" ? -0.3 : 0.1;
  const trend = Array.from({ length: 12 }, (_, i) => 50 + drift * (i - 6) * 3 + (r() - 0.5) * 14);
  return { score, bars: [["Load today", load, `${load} %`], ["Uptime, 30 days", up, `${up.toFixed(1)} %`]] as [string, number, string][], trend };
}
