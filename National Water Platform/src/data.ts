/**
 * One shared set of simulated national numbers. Every page reads from here, so the totals always agree.
 * All figures are made up for the demo.
 *
 * Reconciled against the reference picture:
 *  - 17.5 M m3/day supply, 23% of it reused = 4.1 M m3/day
 *  - reuse 4.1 = 3.3 to agriculture + 0.8 to industry and landscape
 *  - 9.7 M feddan irrigated nationally (MWRI); 810 K feddan are the smart-managed part (MoALR) = 8,100 pivots and drip farms
 *  - Treatment capacity 19.8 M m3/day = drinking water plants 17.0 + desalination 2.8; supplied drinking water 15.5 = 13.9 + 1.6
 *  - Reuse 0.8 M m3/day to industry = the EEAA reuse schemes
 */
import {
  Waves, Landmark, Waypoints, Sprout, Droplet, Factory, Recycle, FlaskConical, ShieldCheck, Users, Cloud, BarChart3, Lock, Database,
  Building2, Leaf, Droplets, Gauge, RotateCw, Activity, TrendingUp, Info, RefreshCw, Home, Pipette, Coins, BadgePercent, Banknote, Zap, PiggyBank,
  type LucideIcon,
} from "lucide-react";

export type TabId =
  | "home" | "executive" | "cycle" | "balance" | "ministries" | "operations"
  | "performance" | "sustainability" | "alerts" | "reports";
export type MinistryId = "mwri" | "mhuuc" | "eeaa" | "moalr";
export type Go = (tab: TabId | "ministry" | "station", id?: string) => void;
export type Role = "cabinet" | "minister" | "operator";

export const ROLES: { id: Role; label: string; title: string; access: string }[] = [
  { id: "cabinet", label: "Cabinet view", title: "Cabinet analyst", access: "All ministries, read only" },
  { id: "minister", label: "Minister view", title: "Minister's office", access: "One ministry, approve" },
  { id: "operator", label: "Operator view", title: "Control-room operator", access: "Sites, operate and acknowledge" },
];

export interface Kpi {
  id: string; label: string; value: number; decimals: number; prefix?: string; cur?: string; unit: string; sub?: string;
  delta: string; down?: boolean; icon: LucideIcon; tone: string;
}

export const NATIONAL_KPIS: Kpi[] = [
  { id: "supply", label: "Total Water Supply", value: 17.5, decimals: 1, unit: "M m³/day", delta: "3.2%", icon: Droplet, tone: "#38bdf8" },
  { id: "pop", label: "Population Served", value: 115, decimals: 0, prefix: "~", unit: "M", delta: "1.4%", icon: Users, tone: "#a78bfa" },
  { id: "cap", label: "Treatment Capacity", value: 19.8, decimals: 1, unit: "M m³/day", delta: "5.1%", icon: Factory, tone: "#c4b5fd" },
  { id: "reuse", label: "Water Reuse", value: 4.1, decimals: 1, unit: "M m³/day", sub: "(23%)", delta: "2.8 pp", icon: Recycle, tone: "#22d3ee" },
  { id: "irr", label: "Irrigation Efficiency", value: 15, decimals: 0, prefix: "+", unit: "%", delta: "vs last year", icon: Sprout, tone: "#4ade80" },
  { id: "co2", label: "Water Sector Emissions", value: 12, decimals: 0, prefix: "−", unit: "%", delta: "vs last year", down: true, icon: Cloud, tone: "#94a3b8" },
];

/** a headline tile on a ministry card */
export interface Tile { icon: LucideIcon; value: number; decimals?: number; prefix?: string; suffix?: string; unit?: string; label: string }
/** one type of station or site: how many, how big, how much of it is in use */
export interface AssetRow { icon: LucideIcon; label: string; sites: string; cap: string; pct: number }
export interface Ministry {
  id: MinistryId; name: string; short: string; icon: LucideIcon; accent: string; accent2: string; photo: string; emblem?: string;
  tiles: Tile[];
  colHead: string;
  rows: AssetRow[];
  insight: string;
}

export const MINISTRIES: Ministry[] = [
  {
    id: "mwri", name: "Ministry of Water Resources & Irrigation", short: "MWRI", icon: Waves, accent: "#f5b942", accent2: "#f59e0b", emblem: "/img/eagle.png", photo: "/img/mwri.jpg",
    tiles: [
      { icon: Waves, value: 7.5, decimals: 1, unit: "M m³/day", label: "Nile share" },
      { icon: Gauge, value: 28, unit: "stations", label: "Pump stations" },
      { icon: Sprout, value: 9.7, decimals: 1, unit: "M feddan", label: "Irrigated area" },
    ],
    colHead: "In use",
    rows: [
      { icon: Landmark, label: "Dams & barrages", sites: "9", cap: "111 BCM", pct: 82 },
      { icon: Gauge, label: "Pump stations", sites: "28", cap: "9.4 M m³/day", pct: 80 },
      { icon: Waves, label: "Drainage pumps", sites: "140", cap: "2.1 M m³/day", pct: 64 },
      { icon: Waypoints, label: "Canal regulators", sites: "410", cap: "7.5 M m³/day", pct: 91 },
    ],
    insight: "Lake Nasser storage at 82%, release held at 92% of plan",
  },
  {
    id: "mhuuc", name: "Ministry of Housing, Utilities & Urban Communities", short: "MHUUC", icon: Building2, accent: "#38bdf8", accent2: "#6366f1", photo: "/img/mhuuc.jpg",
    tiles: [
      { icon: Droplet, value: 15.5, decimals: 1, unit: "M m³/day", label: "Supplied" },
      { icon: Factory, value: 19.8, decimals: 1, unit: "M m³/day", label: "Capacity" },
      { icon: ShieldCheck, value: 99, prefix: "+", suffix: "%", label: "Coverage" },
    ],
    colHead: "In use",
    rows: [
      { icon: Droplet, label: "Drinking plants", sites: "120", cap: "17.0 M m³/day", pct: 82 },
      { icon: Recycle, label: "Wastewater", sites: "380", cap: "11.2 M m³/day", pct: 71 },
      { icon: Waves, label: "Desalination", sites: "42", cap: "2.8 M m³/day", pct: 57 },
      { icon: Gauge, label: "Lift stations", sites: "1,150", cap: "21 M m³/day", pct: 74 },
    ],
    insight: "Low pressure in Zone 4, Greater Cairo · network losses 24%",
  },
  {
    id: "eeaa", name: "Ministry of Environment (EEAA)", short: "EEAA", icon: Leaf, accent: "#c084fc", accent2: "#ec4899", photo: "/img/eeaa.jpg",
    tiles: [
      { icon: ShieldCheck, value: 98, suffix: "%", label: "Compliance" },
      { icon: Activity, value: 45, unit: "stations", label: "Stations" },
      { icon: Recycle, value: 18, prefix: "+", suffix: "%", label: "Reuse rate" },
    ],
    colHead: "Compliant",
    rows: [
      { icon: Activity, label: "Online stations", sites: "45", cap: "18 parameters", pct: 97 },
      { icon: Factory, label: "Industrial plants", sites: "612", cap: "3.9 M m³/day", pct: 98 },
      { icon: Recycle, label: "Reuse schemes", sites: "73", cap: "0.8 M m³/day", pct: 70 },
      { icon: FlaskConical, label: "Discharge points", sites: "1,240", cap: "COD −22%", pct: 96 },
    ],
    insight: "Industrial discharge (COD) down 22%, 2 points near the limit",
  },
  {
    id: "moalr", name: "Ministry of Agriculture & Land Reclamation", short: "MoALR", icon: Sprout, accent: "#4ade80", accent2: "#16a34a", photo: "/img/moalr.jpg",
    tiles: [
      { icon: Sprout, value: 810, suffix: " K", unit: "feddan", label: "Managed area" },
      { icon: Droplets, value: 6.1, decimals: 1, unit: "M m³/day", label: "Consumption" },
      { icon: TrendingUp, value: 15, prefix: "+", suffix: "%", label: "Efficiency" },
    ],
    colHead: "In use",
    rows: [
      { icon: RotateCw, label: "Center pivots", sites: "8,100", cap: "560 K feddan", pct: 76 },
      { icon: Droplets, label: "Drip & sprinkler", sites: "3,200", cap: "250 K feddan", pct: 88 },
      { icon: Gauge, label: "Farm pumps", sites: "1,260", cap: "5.8 M m³/day", pct: 83 },
      { icon: Recycle, label: "Reuse stations", sites: "96", cap: "3.3 M m³/day", pct: 94 },
    ],
    insight: "7.5 m³ per feddan per day · crop productivity +20%",
  },
];

export const OUTCOMES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "security", label: "Water Security & Availability", icon: Droplet },
  { id: "reliability", label: "Service Reliability", icon: ShieldCheck },
  { id: "circular", label: "Water Reuse & Circularity", icon: Recycle },
  { id: "agri", label: "Sustainable Agriculture", icon: Sprout },
  { id: "efficiency", label: "Operational Efficiency", icon: BarChart3 },
  { id: "cyber", label: "OT/IT Cybersecurity", icon: Lock },
  { id: "data", label: "National Water Data Platform", icon: Database },
];

export type Sev = "critical" | "warning" | "info";
export const ALERTS: { id: string; sev: Sev; ministry: MinistryId; text: string; where: string; ago: string }[] = [
  { id: "a1", sev: "critical", ministry: "moalr", text: "Pivot P4 drive fault, tower 7", where: "Minya smart farms", ago: "6 min ago" },
  { id: "a2", sev: "critical", ministry: "mhuuc", text: "Membrane cleaning overdue", where: "Sharm El Sheikh desalination", ago: "12 min ago" },
  { id: "a3", sev: "critical", ministry: "eeaa", text: "Discharge above the COD limit", where: "Helwan industrial zone", ago: "25 min ago" },
  { id: "a4", sev: "warning", ministry: "mhuuc", text: "Low pressure in Zone 4", where: "Giza water plant", ago: "31 min ago" },
  { id: "a5", sev: "warning", ministry: "eeaa", text: "COD near the limit at a discharge point", where: "Alexandria industrial zone", ago: "1 h ago" },
  { id: "a6", sev: "warning", ministry: "mwri", text: "One gate under repair", where: "Naga Hammadi Barrage", ago: "2 h ago" },
];

export const INSIGHT_ICON = Info;
export const MINISTRY_BY_ID = Object.fromEntries(MINISTRIES.map((m) => [m.id, m])) as Record<MinistryId, Ministry>;

/* ================= Executive View data ================= */
export const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
/** 12 months of history for each national KPI, the target, and how far along it is */
export const KPI_TREND: Record<string, { series: number[]; target: string; progress: number }> = {
  supply: { series: [15.9, 16.0, 16.1, 16.2, 16.4, 16.5, 16.7, 16.8, 17.0, 17.2, 17.3, 17.5], target: "18.0", progress: 97 },
  pop: { series: [112.9, 113.1, 113.2, 113.4, 113.5, 113.7, 113.9, 114.1, 114.3, 114.5, 114.7, 115], target: "118 M", progress: 97 },
  cap: { series: [18.8, 18.8, 18.9, 19.0, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8], target: "21.0", progress: 94 },
  reuse: { series: [3.5, 3.5, 3.6, 3.7, 3.7, 3.8, 3.8, 3.9, 3.9, 4.0, 4.0, 4.1], target: "5.2 (30%)", progress: 79 },
  irr: { series: [9, 10, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15], target: "+20%", progress: 75 },
  co2: { series: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11, 12], target: "−20%", progress: 60 },
};

export type Status = "good" | "watch" | "bad";
export const STATUS_LABEL: Record<Status, string> = { good: "On track", watch: "Watch", bad: "Behind" };
export const MINISTRY_SCORE: Record<MinistryId, { score: number; status: Status; issue: string }> = {
  mwri: { score: 92, status: "good", issue: "Release held at 92% of plan" },
  mhuuc: { score: 84, status: "watch", issue: "Low pressure in Zone 4, Greater Cairo" },
  eeaa: { score: 94, status: "good", issue: "2 discharge points near the limit" },
  moalr: { score: 87, status: "watch", issue: "Pivot P4 drive fault, tower 7" },
};

export const OUTCOME_SCORE: Record<string, { score: number; target: number }> = {
  security: { score: 88, target: 90 }, reliability: { score: 93, target: 92 }, circular: { score: 74, target: 80 },
  agri: { score: 82, target: 85 }, efficiency: { score: 79, target: 85 }, cyber: { score: 90, target: 90 }, data: { score: 95, target: 90 },
};
export const outcomeStatus = (score: number, target: number): Status => (score >= target ? "good" : target - score <= 5 ? "watch" : "bad");

export const ATTENTION: { id: string; sev: Sev; ministry: MinistryId; title: string; detail: string; to: TabId | "ministry" }[] = [
  { id: "n1", sev: "critical", ministry: "moalr", title: "Pivot P4 drive fault, tower 7", detail: "Minya smart farms · 150 feddan not irrigating", to: "ministry" },
  { id: "n2", sev: "critical", ministry: "mhuuc", title: "Membrane cleaning overdue", detail: "Sharm El Sheikh desalination · output down to 60 K m³/day", to: "ministry" },
  { id: "n3", sev: "critical", ministry: "eeaa", title: "Discharge above the COD limit", detail: "Helwan industrial zone · 96 mg/L against 80", to: "ministry" },
  { id: "n4", sev: "warning", ministry: "mhuuc", title: "Low pressure in Zone 4", detail: "Giza water plant · about 38,000 people affected", to: "ministry" },
  { id: "n5", sev: "warning", ministry: "eeaa", title: "Discharge near the COD limit", detail: "Alexandria industrial zone · 2 discharge points", to: "ministry" },
  { id: "n6", sev: "warning", ministry: "mwri", title: "One gate under repair", detail: "Naga Hammadi Barrage · flow 365 m³/s", to: "ministry" },
];

export const INSIGHTS: string[] = [
  "Reuse reached 23% of supply (+2.8 points). At this pace it hits the 30% target by 2028.",
  "Fixing Zone 4 in Greater Cairo would save about 0.3 M m³/day of network losses.",
  "Smart irrigation used 0.4 M m³/day less water than last year on the same fields.",
  "Cutting network losses by 1 point would save about EGP 0.3 bn a year.",
];

/* ================= Executive View: money KPIs (EGP). They tie to the water numbers: 17.5 M m3/day is about 6.4 BCM a year,
   at EGP 4.8 per m3 that is about EGP 30.7 bn of cost; 78% of it is recovered; the 3.7 M m3/day lost (24%) is worth about EGP 6.5 bn;
   the 4.1 M m3/day reused is worth about EGP 3.4 bn. ================= */
export const EXEC_KPIS: Kpi[] = [
  { id: "cost", label: "Operating cost per m³", value: 4.8, decimals: 1, cur: "EGP", unit: "/ m³", delta: "−3.1%", down: true, icon: Coins, tone: "#38bdf8" },
  { id: "recovery", label: "Cost recovery", value: 78, decimals: 0, unit: "%", delta: "+4 pts", icon: BadgePercent, tone: "#a78bfa" },
  { id: "revenue", label: "Revenue this month", value: 2.0, decimals: 1, cur: "EGP", unit: "bn", delta: "+5.2%", icon: Banknote, tone: "#4ade80" },
  { id: "lost", label: "Value of water lost", value: 6.5, decimals: 1, cur: "EGP", unit: "bn / yr", delta: "−6%", down: true, icon: Droplets, tone: "#fb7185" },
  { id: "energy", label: "Energy cost", value: 8.6, decimals: 1, cur: "EGP", unit: "bn / yr", delta: "−2.4%", down: true, icon: Zap, tone: "#fbbf24" },
  { id: "savings", label: "Savings: reuse & smart irrigation", value: 3.4, decimals: 1, cur: "EGP", unit: "bn / yr", delta: "+18%", icon: PiggyBank, tone: "#22d3ee" },
];
export const EXEC_TREND: Record<string, { series: number[]; target: string; progress: number }> = {
  cost: { series: [5.2, 5.2, 5.1, 5.1, 5.0, 5.0, 4.9, 4.9, 4.9, 4.8, 4.8, 4.8], target: "EGP 4.5", progress: 94 },
  recovery: { series: [72, 72, 73, 74, 74, 75, 75, 76, 76, 77, 77, 78], target: "90%", progress: 87 },
  revenue: { series: [1.7, 1.7, 1.8, 1.8, 1.8, 1.9, 1.9, 1.9, 1.9, 2.0, 2.0, 2.0], target: "EGP 2.3 bn", progress: 87 },
  lost: { series: [7.4, 7.3, 7.2, 7.1, 7.0, 7.0, 6.9, 6.8, 6.7, 6.6, 6.6, 6.5], target: "EGP 4.5 bn", progress: 69 },
  energy: { series: [9.3, 9.3, 9.2, 9.1, 9.0, 8.9, 8.9, 8.8, 8.8, 8.7, 8.6, 8.6], target: "EGP 7.5 bn", progress: 87 },
  savings: { series: [2.9, 2.9, 3.0, 3.0, 3.1, 3.1, 3.2, 3.2, 3.3, 3.3, 3.4, 3.4], target: "EGP 4.5 bn", progress: 76 },
};
/** share of each ministry's yearly budget spent so far */
export const BUDGET_USED: Record<MinistryId, number> = { mwri: 71, mhuuc: 66, eeaa: 74, moalr: 63 };

/* ================= Water Cycle data (all numbers tie to the rest of the platform) ================= */
export interface CycleLine { icon: LucideIcon; label: string; value: string; pct: number; warn?: boolean }
export interface CycleStage {
  id: string; n: number; title: string; sub: string; icon: LucideIcon; owners: MinistryId[]; open: MinistryId;
  main: { value: number; decimals?: number; unit: string; label: string }; lines: CycleLine[];
}
export const CYCLE_STAGES: CycleStage[] = [
  { id: "sources", n: 1, title: "Sources", sub: "Where the water comes from", icon: Waves, owners: ["mwri", "mhuuc"], open: "mwri",
    main: { value: 17.5, decimals: 1, unit: "M m³/day", label: "total supply" },
    lines: [{ icon: Waves, label: "Nile", value: "7.5 · 43%", pct: 43 }, { icon: Droplets, label: "Groundwater", value: "8.4 · 48%", pct: 48 }, { icon: Pipette, label: "Desalinated sea water", value: "1.6 · 9%", pct: 9 }] },
  { id: "storage", n: 2, title: "Storage & conveyance", sub: "Dams, barrages and canals", icon: Landmark, owners: ["mwri"], open: "mwri",
    main: { value: 111, unit: "BCM", label: "reservoir storage" },
    lines: [{ icon: Landmark, label: "Dams & barrages", value: "9", pct: 100 }, { icon: Waypoints, label: "Canal regulators", value: "410", pct: 91 }, { icon: Gauge, label: "Reservoir level", value: "82%", pct: 82 }] },
  { id: "treatment", n: 3, title: "Treatment", sub: "Drinking water and desalination", icon: FlaskConical, owners: ["mhuuc"], open: "mhuuc",
    main: { value: 15.5, decimals: 1, unit: "M m³/day", label: "drinking water supplied" },
    lines: [{ icon: Droplet, label: "120 drinking plants", value: "13.9", pct: 82 }, { icon: Waves, label: "42 desalination plants", value: "1.6", pct: 57 }, { icon: Gauge, label: "Treatment capacity used", value: "78%", pct: 78 }] },
  { id: "distribution", n: 4, title: "Distribution", sub: "Pipes, pumps and reservoirs", icon: Waypoints, owners: ["mhuuc"], open: "mhuuc",
    main: { value: 11.8, decimals: 1, unit: "M m³/day", label: "delivered after losses" },
    lines: [{ icon: Gauge, label: "Lift stations", value: "1,150", pct: 74 }, { icon: Droplets, label: "Network losses", value: "24% · 3.7", pct: 24, warn: true }, { icon: ShieldCheck, label: "Service coverage", value: "+99%", pct: 99 }] },
  { id: "users", n: 5, title: "Users", sub: "Homes, industry and farms", icon: Users, owners: ["mhuuc", "eeaa", "moalr"], open: "mhuuc",
    main: { value: 115, unit: "M", label: "people served" },
    lines: [{ icon: Home, label: "Homes & services", value: "11.8", pct: 67 }, { icon: Factory, label: "Industry", value: "2.0", pct: 11 }, { icon: Sprout, label: "Smart farms (810 K feddan)", value: "6.1", pct: 35 }] },
  { id: "collection", n: 6, title: "Wastewater collection", sub: "Sewers and pumping", icon: Droplet, owners: ["mhuuc"], open: "mhuuc",
    main: { value: 9.4, decimals: 1, unit: "M m³/day", label: "wastewater collected" },
    lines: [{ icon: Waypoints, label: "Sewer coverage", value: "78%", pct: 78 }, { icon: Gauge, label: "Sewage pump stations", value: "520", pct: 83 }, { icon: Activity, label: "Reaching a plant", value: "8.0 · 85%", pct: 85 }] },
  { id: "wwtp", n: 7, title: "Wastewater treatment", sub: "Cleaning it to standard", icon: Recycle, owners: ["mhuuc", "eeaa"], open: "mhuuc",
    main: { value: 8.0, decimals: 1, unit: "M m³/day", label: "treated" },
    lines: [{ icon: Factory, label: "380 plants, 11.2 capacity", value: "71% used", pct: 71 }, { icon: ShieldCheck, label: "Compliance", value: "98%", pct: 98 }, { icon: FlaskConical, label: "Industrial discharge (COD)", value: "−22%", pct: 22 }] },
  { id: "reuse", n: 8, title: "Reuse", sub: "Back to farms and factories", icon: RefreshCw, owners: ["eeaa", "moalr"], open: "eeaa",
    main: { value: 4.1, decimals: 1, unit: "M m³/day", label: "reused" },
    lines: [{ icon: Sprout, label: "To farms (96 stations)", value: "3.3", pct: 80 }, { icon: Factory, label: "To industry & landscape", value: "0.8", pct: 20 }, { icon: Recycle, label: "Share of treated water", value: "51%", pct: 51 }] },
];
/** water moving from stage n to the next, in M m3/day (the last one is the loop from Reuse back into the cycle) */
export const CYCLE_FLOWS = ["15.9", "15.9", "15.5", "11.8", "9.4", "8.0", "4.1", "4.1"];
export const CYCLE_SUMMARY: { icon: LucideIcon; value: string; label: string }[] = [
  { icon: Droplet, value: "17.5", label: "supplied" },
  { icon: Droplets, value: "3.7", label: "lost in networks" },
  { icon: Recycle, value: "8.0", label: "treated" },
  { icon: RefreshCw, value: "4.1 · 23%", label: "reused" },
];
