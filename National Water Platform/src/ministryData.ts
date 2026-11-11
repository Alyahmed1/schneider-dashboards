/**
 * Phase 3 data: what each ministry page shows beyond the numbers in data.ts.
 * All simulated. Embedded dashboards keep their OWN data (they are separate sites about ONE plant, farm or network),
 * the platform shows the national totals; a site is always smaller than the national figure, so they never clash.
 */
import {
  Waves, Waypoints, Sprout, Droplets, Factory, Recycle, ShieldCheck, Gauge, RotateCw, Activity, TrendingUp, BarChart3, FlaskConical, TriangleAlert, Wheat,
  type LucideIcon,
} from "lucide-react";
import type { MinistryId, Status, Tile } from "./data";

export interface Site { name: string; type: string; gov: string; cap: string; load: number; status: Status; dash?: string }
export interface Dash { id: string; title: string; blurb: string; url: string; icon: LucideIcon; tags: string[] }
export interface MinistryPage {
  tagline: string;
  extra: Tile[];
  trend: { title: string; sub: string; unit: string; decimals: number; series: number[]; ref: { label: string; value: number } };
  insights: string[];
  sites: Site[];
  dashboards: Dash[];
}

export const MINISTRY_PAGE: Record<MinistryId, MinistryPage> = {
  mwri: {
    tagline: "The Nile, dams, canals and the water that reaches every field",
    extra: [
      { icon: Gauge, value: 82, suffix: "%", label: "Reservoir level" },
      { icon: Waypoints, value: 55, suffix: " K", unit: "km", label: "Canals & drains" },
      { icon: TrendingUp, value: 94, suffix: "%", label: "Delivered vs plan" },
    ],
    trend: { title: "Lake Nasser level", sub: "last 12 months, % of storage", unit: "%", decimals: 0, series: [76, 75, 74, 74, 75, 77, 79, 80, 81, 82, 82, 82], ref: { label: "Safe minimum", value: 70 } },
    insights: ["Lake Nasser is at 82% of storage, 3 points above the same week last year.", "Canal losses fell 4% after the Delta lining works."],
    sites: [
      { name: "Aswan High Dam", type: "Dam", gov: "Aswan", cap: "111 BCM", load: 82, status: "good" },
      { name: "Aswan Reservoir", type: "Dam", gov: "Aswan", cap: "5.3 BCM", load: 91, status: "good" },
      { name: "Esna Barrage", type: "Barrage", gov: "Luxor", cap: "12 gates", load: 88, status: "good" },
      { name: "Naga Hammadi Barrage", type: "Barrage", gov: "Qena", cap: "11 gates", load: 76, status: "good" },
      { name: "Assiut Barrage", type: "Barrage", gov: "Assiut", cap: "9 gates", load: 84, status: "good" },
      { name: "Delta Barrage", type: "Barrage", gov: "Qalyubia", cap: "61 gates", load: 79, status: "watch" },
      { name: "Mahmoudiya Pumping", type: "Pumping", gov: "Beheira", cap: "0.9 M m³/day", load: 83, status: "good" },
      { name: "Salam Canal Pumping", type: "Pumping", gov: "North Sinai", cap: "1.2 M m³/day", load: 64, status: "bad" },
      { name: "El-Hammam Canal Intake", type: "Canal", gov: "Matrouh", cap: "0.7 M m³/day", load: 72, status: "watch" },
      { name: "Ismailia Canal Regulator", type: "Canal", gov: "Ismailia", cap: "0.6 M m³/day", load: 90, status: "good" },
    ],
    dashboards: [],
  },
  mhuuc: {
    tagline: "Drinking water, networks, wastewater and desalination for every city",
    extra: [
      { icon: Droplets, value: 24, suffix: "%", label: "Network losses" },
      { icon: TriangleAlert, value: 7, label: "Active alarms" },
      { icon: Recycle, value: 8.0, decimals: 1, unit: "M m³/day", label: "Wastewater treated" },
    ],
    trend: { title: "Drinking water supplied", sub: "last 12 months, M m³/day", unit: "M m³/day", decimals: 1, series: [14.2, 14.3, 14.4, 14.5, 14.6, 14.8, 14.9, 15.0, 15.1, 15.2, 15.3, 15.5], ref: { label: "Capacity 19.8", value: 19.8 } },
    insights: ["Fixing Zone 4 pressure would save about 0.3 M m³/day.", "Desalination plants run at 57% of capacity: room to add supply before summer."],
    sites: [
      { name: "Hurghada SWRO desalination", type: "Desalination", gov: "Red Sea", cap: "120,000 m³/day", load: 78, status: "good", dash: "desal" },
      { name: "Ain Sokhna desalination", type: "Desalination", gov: "Suez", cap: "150,000 m³/day", load: 55, status: "good", dash: "desal" },
      { name: "Port Said desalination", type: "Desalination", gov: "Port Said", cap: "50,000 m³/day", load: 48, status: "good", dash: "desal" },
      { name: "Giza water plant", type: "Drinking plant", gov: "Giza", cap: "1.2 M m³/day", load: 88, status: "good" },
      { name: "Mostorod water plant", type: "Drinking plant", gov: "Qalyubia", cap: "0.9 M m³/day", load: 81, status: "good" },
      { name: "Sidi Gaber water plant", type: "Drinking plant", gov: "Alexandria", cap: "1.0 M m³/day", load: 86, status: "good" },
      { name: "Greater Cairo network, Zone 4", type: "Network", gov: "Cairo", cap: "2.1 M m³/day", load: 74, status: "bad", dash: "network" },
      { name: "New Cairo network", type: "Network", gov: "Cairo", cap: "0.8 M m³/day", load: 69, status: "good", dash: "network" },
      { name: "Abu Rawash wastewater plant", type: "Wastewater", gov: "Giza", cap: "1.6 M m³/day", load: 72, status: "good", dash: "wwProcess" },
      { name: "Gabal El Asfar wastewater plant", type: "Wastewater", gov: "Cairo", cap: "2.0 M m³/day", load: 69, status: "good", dash: "wwKpi" },
    ],
    dashboards: [
      { id: "desal", title: "Smart Water Desalination", blurb: "Sea-water reverse osmosis plant: production, power, sustainability, cost and maintenance.", url: "https://water-desalination-dashboard-v2.vercel.app", icon: Waves, tags: ["Desalination", "Plant"] },
      { id: "network", title: "Smart Water Network", blurb: "New Cairo network zones, pressure, leaks and the live network map.", url: "https://smart-water-network-mu.vercel.app", icon: Waypoints, tags: ["Network", "Leaks"] },
      { id: "wwProcess", title: "Smart Wastewater: Process & CMMS", blurb: "Treatment stages, equipment, biogas, alarms and work orders.", url: "https://wastewater-treatment-dashboard.vercel.app", icon: Recycle, tags: ["Wastewater", "Operations"] },
      { id: "wwKpi", title: "Smart Wastewater: KPIs", blurb: "Plant KPIs, pumps, energy and catchment boards for managers.", url: "https://wastewater-kpis-dashboard.vercel.app", icon: BarChart3, tags: ["Wastewater", "KPIs"] },
    ],
  },
  eeaa: {
    tagline: "Water quality, industrial compliance and circular water",
    extra: [
      { icon: FlaskConical, value: 22, prefix: "−", suffix: "%", label: "Discharge (COD)" },
      { icon: ShieldCheck, value: 612, label: "Permitted plants" },
      { icon: Activity, value: 97, suffix: "%", label: "Stations online" },
    ],
    trend: { title: "Industrial compliance", sub: "last 12 months, % of sites compliant", unit: "%", decimals: 0, series: [94, 94, 95, 95, 96, 96, 96, 97, 97, 97, 98, 98], ref: { label: "Target 95%", value: 95 } },
    insights: ["98% of industrial sites are compliant, up 2 points on last year.", "Two Alexandria discharge points are within 5% of the COD limit."],
    sites: [
      { name: "Nile station, Aswan", type: "Monitoring", gov: "Aswan", cap: "18 parameters", load: 98, status: "good" },
      { name: "Nile station, Damietta", type: "Monitoring", gov: "Damietta", cap: "18 parameters", load: 96, status: "good" },
      { name: "Lake Manzala station", type: "Monitoring", gov: "Port Said", cap: "18 parameters", load: 91, status: "watch" },
      { name: "Sadat City industrial zone", type: "Industrial", gov: "Menoufia", cap: "62 permits", load: 99, status: "good", dash: "industrial" },
      { name: "10th of Ramadan zone", type: "Industrial", gov: "Sharqia", cap: "210 permits", load: 97, status: "good", dash: "industrial" },
      { name: "Alexandria (Mex) zone", type: "Industrial", gov: "Alexandria", cap: "140 permits", load: 94, status: "watch", dash: "industrial" },
      { name: "Suez industrial zone", type: "Industrial", gov: "Suez", cap: "55 permits", load: 98, status: "good", dash: "industrial" },
      { name: "Kafr El-Zayat reuse scheme", type: "Reuse", gov: "Gharbia", cap: "0.12 M m³/day", load: 70, status: "good" },
      { name: "Gabal El Asfar reuse", type: "Reuse", gov: "Cairo", cap: "0.30 M m³/day", load: 74, status: "good" },
      { name: "Greater Cairo reuse", type: "Reuse", gov: "Giza", cap: "0.25 M m³/day", load: 68, status: "good" },
    ],
    dashboards: [
      { id: "industrial", title: "Industrial Water Complex", blurb: "Process, MMM and CPG water systems for an industrial site: flow diagrams, alarms and work orders.", url: "https://industrial-water-dashboard.vercel.app", icon: Factory, tags: ["Industry", "Process"] },
    ],
  },
  moalr: {
    tagline: "Farms, pivots, drip systems and the water they use",
    extra: [
      { icon: RotateCw, value: 76, suffix: "%", label: "Pivots running" },
      { icon: Wheat, value: 20, prefix: "+", suffix: "%", label: "Crop productivity" },
      { icon: Recycle, value: 3.3, decimals: 1, unit: "M m³/day", label: "Reuse to farms" },
    ],
    trend: { title: "Water use per feddan", sub: "last 12 months, m³ per feddan per day", unit: "m³", decimals: 1, series: [8.6, 8.5, 8.4, 8.2, 8.1, 8.0, 7.9, 7.8, 7.7, 7.6, 7.5, 7.5], ref: { label: "Target 7.0", value: 7.0 } },
    insights: ["Smart irrigation used 0.4 M m³/day less than last year on the same fields.", "Pivot P4 fault idles 150 feddan until it is repaired."],
    sites: [
      { name: "Minya smart farms", type: "Pivot farm", gov: "Minya", cap: "600 feddan", load: 75, status: "bad", dash: "pivots" },
      { name: "West Minya", type: "Pivot farm", gov: "Minya", cap: "42 K feddan", load: 78, status: "good", dash: "irrigation" },
      { name: "New Delta, El Hammam", type: "Pivot farm", gov: "Beheira", cap: "120 K feddan", load: 82, status: "good", dash: "irrigation" },
      { name: "Toshka", type: "Pivot farm", gov: "Aswan", cap: "90 K feddan", load: 71, status: "watch" },
      { name: "East Owainat", type: "Pivot farm", gov: "New Valley", cap: "60 K feddan", load: 80, status: "good" },
      { name: "Farafra", type: "Drip farm", gov: "New Valley", cap: "30 K feddan", load: 88, status: "good" },
      { name: "Fayoum drip farms", type: "Drip farm", gov: "Fayoum", cap: "45 K feddan", load: 85, status: "good" },
      { name: "Salam Canal farms", type: "Drip farm", gov: "North Sinai", cap: "75 K feddan", load: 76, status: "watch" },
      { name: "Beni Suef reuse station", type: "Reuse", gov: "Beni Suef", cap: "0.30 M m³/day", load: 94, status: "good" },
      { name: "Ismailia reuse station", type: "Reuse", gov: "Ismailia", cap: "0.22 M m³/day", load: 90, status: "good" },
    ],
    dashboards: [
      { id: "irrigation", title: "Smart Irrigation", blurb: "Pivots, pump stations, sensors, weather, irrigation schedule and the live farm map.", url: "https://waterirrigation.vercel.app", icon: Sprout, tags: ["Farms", "Pivots"] },
      { id: "pivots", title: "Pivot Monitoring & Control", blurb: "Four pivots on a tablet: speed, nozzles, moisture, water use, alarms and controls.", url: "https://pivot-monitoring-dashboard.vercel.app", icon: RotateCw, tags: ["Pivots", "Control"] },
    ],
  },
};

/* ================= Water Resources: native boards ================= */
export const DAMS = [
  { name: "Aswan High Dam (Lake Nasser)", level: 82, note: "111 BCM" },
  { name: "Aswan Reservoir", level: 91, note: "5.3 BCM" },
  { name: "Esna Barrage", level: 88, note: "12 gates" },
  { name: "Assiut Barrage", level: 84, note: "9 gates" },
  { name: "Delta Barrage", level: 79, note: "61 gates" },
  { name: "Naga Hammadi Barrage", level: 76, note: "11 gates" },
];
/** Nile release at Aswan, M m3/day, plan against actual */
export const RELEASE = {
  plan: [4.6, 4.4, 4.1, 4.3, 4.8, 5.5, 6.2, 6.5, 6.4, 5.9, 5.2, 4.8],
  actual: [4.5, 4.3, 4.1, 4.2, 4.7, 5.3, 5.9, 6.1, 6.0, 5.6, 5.0, 4.4],
};
export const LAKE = { level: 175.4, min: 147, max: 182, pct: 82 };
export const CANALS: { name: string; flow: string; pct: number; status: Status }[] = [
  { name: "Ismailia Canal", flow: "98 m³/s", pct: 83, status: "good" },
  { name: "Ibrahimiya Canal", flow: "142 m³/s", pct: 79, status: "good" },
  { name: "Bahr Yusuf", flow: "121 m³/s", pct: 91, status: "watch" },
  { name: "Mahmoudiya Canal", flow: "120 m³/s", pct: 88, status: "good" },
  { name: "El-Nasr Canal", flow: "54 m³/s", pct: 72, status: "good" },
  { name: "Salam Canal", flow: "38 m³/s", pct: 64, status: "bad" },
];
export const ALLOCATION = [
  { name: "Beheira", v: 0.62 }, { name: "Sharqia", v: 0.58 }, { name: "Dakahlia", v: 0.55 }, { name: "Minya", v: 0.49 },
  { name: "Kafr El-Sheikh", v: 0.47 }, { name: "Gharbia", v: 0.41 }, { name: "Assiut", v: 0.38 }, { name: "Beni Suef", v: 0.31 },
];
export const PUMPS = { running: 21, standby: 5, fault: 2 };
/** irrigation demand against water delivered to farms, M m3/day */
export const DEMAND = {
  demand: [6.4, 6.3, 6.5, 6.9, 7.3, 7.7, 8.0, 8.1, 7.9, 7.5, 7.0, 6.8],
  delivered: [6.2, 6.1, 6.3, 6.6, 6.9, 7.2, 7.5, 7.6, 7.4, 7.1, 6.6, 6.4],
};

export const statusColor = (s: Status) => (s === "good" ? "#34d399" : s === "watch" ? "#fbbf24" : "#fb7185");
export type { Status };

/* ================= Operations (what is happening now) and the side-by-side comparison ================= */
export interface Ops {
  running: number; standby: number; fault: number; unit: string; faults: { text: string; where: string; status: Status }[];
  flow: { title: string; sub: string; unit: string; decimals: number; series: number[] };
}
export const HOURS = ["00", "02", "04", "06", "08", "10", "12", "14", "16", "18", "20", "22"];
export const OPS: Record<MinistryId, Ops> = {
  mwri: { running: 21, standby: 5, fault: 2, unit: "pumping stations", faults: [], flow: { title: "", sub: "", unit: "", decimals: 1, series: [] } },
  mhuuc: {
    running: 1574, standby: 98, fault: 20, unit: "stations",
    faults: [{ text: "Booster pump, Zone 4", where: "Greater Cairo", status: "bad" }, { text: "Membrane train 3", where: "Hurghada", status: "watch" }, { text: "Lift station LS-214", where: "Giza", status: "watch" }],
    flow: { title: "Drinking water supplied, today", sub: "every 2 hours, M m³/day", unit: "M m³/day", decimals: 1, series: [13.8, 13.4, 13.2, 14.0, 15.2, 15.8, 15.6, 15.4, 15.9, 16.1, 15.2, 14.4] },
  },
  eeaa: {
    running: 1905, standby: 55, fault: 10, unit: "sites",
    faults: [{ text: "Station NS-12 offline", where: "Lake Manzala", status: "bad" }, { text: "Sensor drift at outfall", where: "Alexandria", status: "watch" }],
    flow: { title: "Industrial discharge, today", sub: "every 2 hours, M m³/day", unit: "M m³/day", decimals: 1, series: [3.6, 3.5, 3.5, 3.7, 3.9, 4.0, 4.0, 3.9, 3.9, 3.8, 3.7, 3.6] },
  },
  moalr: {
    running: 9610, standby: 2940, fault: 106, unit: "systems",
    faults: [{ text: "Pivot P4 drive, tower 7", where: "Minya", status: "bad" }, { text: "Farm pump FP-31", where: "Toshka", status: "watch" }],
    flow: { title: "Irrigation flow, today", sub: "every 2 hours, M m³/day", unit: "M m³/day", decimals: 1, series: [4.1, 4.3, 4.4, 4.0, 3.4, 3.0, 3.1, 3.3, 3.9, 4.6, 5.2, 4.8] },
  },
};

export const WATER_HANDLED: Record<MinistryId, number> = { mwri: 7.5, mhuuc: 15.5, eeaa: 3.9, moalr: 6.1 };
export const SCORE_CHANGE: Record<MinistryId, number> = { mwri: 1, mhuuc: -2, eeaa: 1, moalr: 0 };
/** 12 months for each ministry, for the three measures on the Ministries View chart */
export const COMPARE_SERIES: Record<"score" | "water" | "alerts", { label: string; unit: string; decimals: number; data: Record<MinistryId, number[]> }> = {
  score: { label: "Score", unit: "points", decimals: 0, data: {
    mwri: [88, 89, 89, 90, 90, 91, 91, 91, 92, 92, 92, 92], mhuuc: [82, 82, 83, 83, 84, 85, 85, 86, 85, 85, 86, 84],
    eeaa: [90, 91, 91, 92, 92, 93, 93, 93, 94, 94, 94, 94], moalr: [83, 84, 84, 85, 85, 86, 86, 87, 87, 88, 88, 87] } },
  water: { label: "Water handled", unit: "M m³/day", decimals: 1, data: {
    mwri: [6.8, 6.7, 6.9, 7.0, 7.2, 7.4, 7.6, 7.6, 7.5, 7.5, 7.5, 7.5], mhuuc: [14.2, 14.3, 14.4, 14.5, 14.6, 14.8, 14.9, 15.0, 15.1, 15.2, 15.3, 15.5],
    eeaa: [3.6, 3.6, 3.7, 3.7, 3.8, 3.8, 3.8, 3.9, 3.9, 3.9, 3.9, 3.9], moalr: [5.4, 5.5, 5.7, 5.8, 6.0, 6.2, 6.3, 6.2, 6.1, 6.1, 6.1, 6.1] } },
  alerts: { label: "Open alerts", unit: "alerts", decimals: 0, data: {
    mwri: [1, 2, 1, 1, 2, 1, 1, 0, 1, 1, 2, 1], mhuuc: [4, 3, 4, 5, 3, 4, 3, 2, 3, 3, 2, 2],
    eeaa: [2, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1], moalr: [3, 2, 2, 3, 2, 2, 1, 2, 2, 1, 2, 1] } },
};
