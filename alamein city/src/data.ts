/* =====================================================================
   Data model for the New Alamein City COC dashboard.
   REAL (from COC.xlsx): the BoQ lines and every quantity in CITY below.
   SAMPLE (invented, always labelled "sample" on screen): zone shares, live readings, alerts, roadmap dates.
   ===================================================================== */

export type TabId = "overview" | "plan" | "utilities" | "mobility" | "environment" | "citizens" | "security" | "scope" | "assistant";

/** sizing numbers printed in row 4 of the Excel */
export const CITY = {
  meters: 156360,
  operators: 30,
  poles: 1600,
  waterSensors: 5000,
  bins: 1000,
  busStations: 50,
  signage: 1690,
  parking: 1000,
  ibmsPoints: 14000,
  citizenUnits: 50000,
  workstations: 31,
  years: 5,
} as const;

export const FIELD_DEVICES = CITY.poles + CITY.waterSensors + CITY.bins + CITY.busStations + CITY.signage + CITY.parking; // 10,340
export const CONNECTED_POINTS = CITY.meters + CITY.ibmsPoints + FIELD_DEVICES; // 180,700

/* ---------------- BoQ ---------------- */
export type Domain = "Core platform" | "Utilities & energy" | "Mobility" | "Environment" | "Citizens & commerce" | "Buildings" | "Cybersecurity" | "Infrastructure" | "Services";
export type Layer = "Platform" | "Application" | "Security" | "Infrastructure" | "Service";
export type Delivery = "5-year licence" | "One-time supply" | "Service";
export type Unit = "Lump sum" | "Count" | "Years";

export interface BoqItem {
  id: number;
  name: string;
  ar?: string;
  domain: Domain;
  layer: Layer;
  delivery: Delivery;
  unit: Unit;
  qty: string;
  /** what drives the size of this item, from the sizing line */
  driver?: string;
  fit?: "Schneider / AVEVA likely fit";
  flag?: string;
}

const FIT = "Schneider / AVEVA likely fit" as const;
export const BOQ: BoqItem[] = [
  { id: 1, name: "City Operations Center (COC) Platform", domain: "Core platform", layer: "Platform", delivery: "5-year licence", unit: "Years", qty: "5 years", driver: "30 operators", fit: FIT },
  { id: 2, name: "Citizen Engagement, City Portal & City App", domain: "Citizens & commerce", layer: "Application", delivery: "5-year licence", unit: "Years", qty: "50,000 units / 5 years", driver: "50,000 citizen units" },
  { id: 3, name: "GIS Platform", domain: "Core platform", layer: "Platform", delivery: "One-time supply", unit: "Lump sum", qty: "1" },
  { id: 4, name: "Smart Grid (Electricity, Water & Gas) - Unified SCADA", domain: "Utilities & energy", layer: "Platform", delivery: "One-time supply", unit: "Lump sum", qty: "1", fit: FIT },
  { id: 5, name: "Smart Grid (Electricity) - ADMS [Option 01]", domain: "Utilities & energy", layer: "Platform", delivery: "One-time supply", unit: "Lump sum", qty: "1", fit: FIT, flag: "ADMS appears twice in the Excel (Option 01 and the base line). Confirm with the client." },
  { id: 6, name: "Smart Grid (Electricity) - ADMS", domain: "Utilities & energy", layer: "Platform", delivery: "One-time supply", unit: "Lump sum", qty: "1", fit: FIT, flag: "Duplicate of line 5 in the Excel." },
  { id: 7, name: "Smart Metering AMI Platform", domain: "Utilities & energy", layer: "Application", delivery: "One-time supply", unit: "Lump sum", qty: "1", driver: "156,360 meters" },
  { id: 8, name: "Smart Street Lighting Management Application", domain: "Utilities & energy", layer: "Application", delivery: "One-time supply", unit: "Lump sum", qty: "1", driver: "1,600 smart poles" },
  { id: 9, name: "Smart Parking Management Application", domain: "Mobility", layer: "Application", delivery: "One-time supply", unit: "Lump sum", qty: "1", driver: "1,000 parking lots" },
  { id: 10, name: "Smart Waste Management Application", domain: "Environment", layer: "Application", delivery: "One-time supply", unit: "Lump sum", qty: "1", driver: "1,000 smart waste bins" },
  { id: 11, name: "Smart Transportation Management Application", domain: "Mobility", layer: "Application", delivery: "One-time supply", unit: "Lump sum", qty: "1", driver: "50 bus stations" },
  { id: 12, name: "Digital Signage Management Application", domain: "Citizens & commerce", layer: "Application", delivery: "One-time supply", unit: "Lump sum", qty: "1", driver: "1,690 signage screens" },
  { id: 13, name: "Integrated Building Management System (IBMS)", domain: "Buildings", layer: "Application", delivery: "One-time supply", unit: "Lump sum", qty: "1", driver: "14,000 IBMS points", fit: FIT },
  { id: 14, name: "Workforce Management (AVEVA Workstack)", domain: "Core platform", layer: "Platform", delivery: "5-year licence", unit: "Years", qty: "5 years", fit: FIT, flag: "Spelled \"Workstaks\" in the Excel." },
  { id: 15, name: "Unified Billing", domain: "Citizens & commerce", layer: "Application", delivery: "One-time supply", unit: "Lump sum", qty: "1" },
  { id: 16, name: "Smart Cards & E-Wallet", domain: "Citizens & commerce", layer: "Application", delivery: "One-time supply", unit: "Lump sum", qty: "1" },
  { id: 17, name: "Security Threat and Risk Assessment (STRA) Report", ar: "تقرير نظم تحليل المخاطر", domain: "Cybersecurity", layer: "Security", delivery: "One-time supply", unit: "Lump sum", qty: "1", driver: "Drives the cyber security plan" },
  { id: 18, name: "NG Firewall (internet FW, OT FW & IoT FW)", domain: "Cybersecurity", layer: "Security", delivery: "One-time supply", unit: "Lump sum", qty: "1", flag: "Lines 18 to 20 share one merged quantity cell in the Excel." },
  { id: 19, name: "Web Application Firewall (WAF)", domain: "Cybersecurity", layer: "Security", delivery: "One-time supply", unit: "Lump sum", qty: "1" },
  { id: 20, name: "Mail Security, EDR, SIEM, SOAR, IAM", domain: "Cybersecurity", layer: "Security", delivery: "One-time supply", unit: "Lump sum", qty: "1" },
  { id: 21, name: "Networking active equipment (EOR switches), integrated with the existing core switches", domain: "Infrastructure", layer: "Infrastructure", delivery: "One-time supply", unit: "Lump sum", qty: "1" },
  { id: 22, name: "Application servers and storage (not less than 5 years)", domain: "Infrastructure", layer: "Infrastructure", delivery: "One-time supply", unit: "Lump sum", qty: "1" },
  { id: 23, name: "COC operator workstations", domain: "Infrastructure", layer: "Infrastructure", delivery: "One-time supply", unit: "Count", qty: "31", driver: "30 operators + 1", flag: "31 workstations for 30 operators (probably one supervisor)." },
  { id: 24, name: "5 years software maintenance, upgrade and support", domain: "Services", layer: "Service", delivery: "Service", unit: "Lump sum", qty: "1" },
  { id: 25, name: "Service desk to handle incidents during business hours", domain: "Services", layer: "Service", delivery: "Service", unit: "Lump sum", qty: "1" },
];

export const DOMAINS: Domain[] = ["Core platform", "Utilities & energy", "Mobility", "Environment", "Citizens & commerce", "Buildings", "Cybersecurity", "Infrastructure", "Services"];
export const DOMAIN_COLOR: Record<Domain, string> = {
  "Core platform": "#2f7fc1", "Utilities & energy": "#e0a526", "Mobility": "#0d8a8f", "Environment": "#3f9d5a", "Citizens & commerce": "#8a63c8",
  "Buildings": "#d9733d", "Cybersecurity": "#d4463f", "Infrastructure": "#64808f", "Services": "#b08a5a",
};

/* ---------------- zones (traced by eye on the master plan image, 1327 x 682) ---------------- */
export const MAP_W = 1327;
export const MAP_H = 682;
export type ZoneId = "NG" | "CC" | "WN" | "DT" | "BT" | "LV" | "MR" | "SR";
export interface Zone { id: ZoneId; name: string; kind: string; poly: [number, number][]; label: [number, number] }
export const ZONES: Zone[] = [
  { id: "NG", name: "North Gardens", kind: "Residential", poly: [[175, 0], [300, 0], [335, 70], [290, 135], [215, 175], [160, 125], [150, 50]], label: [235, 80] },
  { id: "CC", name: "Central Circle", kind: "Civic & residential", poly: [[300, 150], [365, 140], [475, 170], [505, 250], [480, 315], [400, 335], [310, 305], [280, 230]], label: [395, 240] },
  { id: "WN", name: "West Neighborhoods", kind: "Residential", poly: [[0, 335], [120, 300], [300, 365], [335, 445], [285, 545], [180, 565], [80, 525], [15, 465]], label: [165, 440] },
  { id: "DT", name: "Downtown Core", kind: "Mixed use", poly: [[335, 345], [485, 335], [640, 385], [790, 500], [760, 545], [560, 545], [430, 525], [345, 450]], label: [560, 450] },
  { id: "BT", name: "Beachfront Towers", kind: "Hospitality & towers", poly: [[450, 160], [660, 195], [960, 248], [1110, 330], [1085, 385], [950, 335], [700, 238], [560, 240], [450, 205]], label: [760, 215] },
  { id: "LV", name: "Lagoon Villas", kind: "Villas & canals", poly: [[640, 270], [760, 312], [850, 392], [835, 478], [760, 505], [650, 405]], label: [740, 385] },
  { id: "MR", name: "Marina District", kind: "Marina & leisure", poly: [[950, 405], [1100, 385], [1222, 435], [1232, 522], [1100, 545], [960, 522]], label: [1085, 470] },
  { id: "SR", name: "South Residential", kind: "Residential", poly: [[795, 525], [1210, 548], [1180, 655], [900, 665], [795, 625]], label: [1000, 600] },
];
export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<ZoneId, Zone>;

export type LayerId = "poles" | "water" | "waste" | "bus" | "parking" | "signage";
/** share of each device type in each zone (sample, each row sums to 1) in ZONES order: NG CC WN DT BT LV MR SR */
export const SHARE: Record<LayerId | "meters" | "ibms", number[]> = {
  meters: [0.12, 0.11, 0.17, 0.12, 0.12, 0.1, 0.08, 0.18],
  poles: [0.12, 0.11, 0.17, 0.12, 0.12, 0.1, 0.08, 0.18],
  water: [0.12, 0.11, 0.17, 0.12, 0.12, 0.1, 0.08, 0.18],
  waste: [0.12, 0.11, 0.17, 0.12, 0.12, 0.1, 0.08, 0.18],
  bus: [0.1, 0.12, 0.16, 0.16, 0.12, 0.08, 0.1, 0.16],
  parking: [0.05, 0.08, 0.1, 0.22, 0.2, 0.08, 0.15, 0.12],
  signage: [0.05, 0.1, 0.1, 0.2, 0.22, 0.08, 0.15, 0.1],
  ibms: [0.06, 0.12, 0.1, 0.2, 0.25, 0.07, 0.1, 0.1],
};
export const LAYERS: { id: LayerId; label: string; total: number; color: string }[] = [
  { id: "poles", label: "Smart poles", total: CITY.poles, color: "#e0a526" },
  { id: "water", label: "Water sensors", total: CITY.waterSensors, color: "#2f9bd6" },
  { id: "waste", label: "Smart waste bins", total: CITY.bins, color: "#3f9d5a" },
  { id: "bus", label: "Bus stations", total: CITY.busStations, color: "#d9733d" },
  { id: "parking", label: "Parking", total: CITY.parking, color: "#8a63c8" },
  { id: "signage", label: "Signage", total: CITY.signage, color: "#d4463f" },
];

/* ---------------- roadmap (sample timeline, labelled illustrative) ---------------- */
export const ROADMAP: { name: string; from: number; to: number; domain: Domain; progress: number }[] = [
  { name: "Design, STRA & procurement", from: 0, to: 0.7, domain: "Cybersecurity", progress: 100 },
  { name: "COC, GIS & network core", from: 0.4, to: 1.4, domain: "Core platform", progress: 78 },
  { name: "Utilities: SCADA, ADMS, AMI", from: 0.8, to: 2.4, domain: "Utilities & energy", progress: 52 },
  { name: "Mobility, waste & signage", from: 1.2, to: 2.8, domain: "Mobility", progress: 34 },
  { name: "IBMS & citizen services", from: 1.6, to: 3.2, domain: "Citizens & commerce", progress: 18 },
  { name: "Acceptance & training", from: 2.8, to: 3.4, domain: "Services", progress: 5 },
  { name: "Operate, support & upgrade", from: 3.0, to: 5, domain: "Services", progress: 0 },
];

export const TAB_LABEL: Record<TabId, string> = {
  overview: "Overview", plan: "Master Plan", utilities: "Utilities", mobility: "Mobility", environment: "Environment",
  citizens: "Citizens", security: "Security", scope: "Scope", assistant: "Assistant",
};
