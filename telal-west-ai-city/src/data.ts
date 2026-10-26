// Telal West AI City: facts printed in the brief are used as printed. Everything marked "sample" is made up for the demo.
import { AREAS, GEO, LAND } from "./planGeometry";

export type TabId = "home" | "plan" | "mobility" | "utilities" | "assets" | "safety" | "assistant" | "platform";
export type Pt = [number, number];

/** the numbers printed in the brief (slide 2 and the boundary dimensions on slides 8 and 11) */
export const BRIEF = {
  feddan: 380, residentialPct: 80, mixedPct: 20, residentialFeddan: 304, commercialFeddan: 76,
  futurePlan: "120-150 feddan",
  edges: { top: 839, west1: 248, west2: 193, west3: 270, west4: 775, southwest: 731, south: 1358, southEast: 359, east: 320, futureTop: 742 },
};

export type ZoneId = "apartments" | "school" | "villas" | "golf" | "hotel" | "commercial" | "hospital" | "future";

export interface Zone {
  id: ZoneId; name: string; color: string; blurb: string;
  /** feddan measured from the drawing: commercial is the printed 76 and the other seven share the printed 304, so all eight add up to 380 (the future plan is inside the 380) */
  feddan: number;
  polys: Pt[][]; labels: { at: Pt; lines: string[] }[]; note?: string;
  /** sample live numbers at the base level: power MW, water m³/h, occupancy % (null = not built yet) */
  mw: number; water: number; occ: number | null;
}

export const ZONES: Zone[] = [
  {
    id: "apartments", name: "Apartments", color: "--z-apartments", feddan: AREAS.apartments, mw: 3.4, water: 410, occ: 91,
    blurb: "Well-connected residential communities with modern living standards.",
    polys: GEO.apartments,
    labels: [{ at: [540, 247], lines: ["Apartment"] }, { at: [404, 366], lines: ["Apartment"] }],
  },
  {
    id: "school", name: "School", color: "--z-school", feddan: AREAS.school, mw: 0.6, water: 40, occ: 78,
    blurb: "International standard educational environment serving the community.",
    polys: GEO.school,
    labels: [{ at: [370, 250], lines: ["School"] }],
  },
  {
    id: "hospital", name: "Hospital", color: "--z-hospital", feddan: AREAS.hospital, mw: 1.2, water: 90, occ: 64,
    blurb: "Healthcare facility providing comprehensive medical services for the community.",
    polys: GEO.hospital,
    labels: [{ at: [650, 240], lines: ["Hospital"] }],
  },
  {
    id: "hotel", name: "Hotel", color: "--z-hotel", feddan: AREAS.hotel, mw: 1.1, water: 110, occ: 72,
    blurb: "Hospitality destination supporting tourism, business visitors and community amenities.",
    polys: GEO.hotel,
    labels: [{ at: [443, 440], lines: ["Hotel"] }],
  },
  {
    id: "villas", name: "Villas", color: "--z-villas", feddan: AREAS.villas, mw: 4.6, water: 520, occ: 86,
    blurb: "Low-density villa neighborhoods offering privacy, greenery and a premium lifestyle.",
    polys: GEO.villas,
    labels: [{ at: [580, 455], lines: ["Villas"] }, { at: [437, 568], lines: ["Villas"] }, { at: [487, 670], lines: ["Villas"] }, { at: [690, 697], lines: ["Villas"] }],
  },
  {
    id: "golf", name: "Golf course", color: "--z-golf", feddan: AREAS.golf, mw: 0.8, water: 780, occ: null,
    blurb: "Landscaped green corridors and golf course for recreation and wellbeing.",
    polys: GEO.golf,
    labels: [{ at: [606, 645], lines: ["Golf", "Course"] }],
  },
  {
    id: "commercial", name: "Commercial", color: "--z-commercial", feddan: AREAS.commercial, mw: 5.2, water: 250, occ: 88,
    blurb: "Active commercial edges along main roads to ensure visibility, accessibility and urban street life.",
    polys: GEO.commercial,
    labels: [{ at: [385, 793], lines: ["Commercial"] }],
  },
  {
    id: "future", name: "Future plan innovation", color: "--z-future", feddan: AREAS.future, mw: 0.5, water: 20, occ: null,
    blurb: "Reserved area for future innovation, technology and sustainable development.",
    polys: GEO.future,
    labels: [{ at: [925, 580], lines: ["Future plan Innovation", "(120-150 feddan)"] }],
    note: "The brief labels this block 120-150 feddan; drawn to scale inside the 380 it measures about 78.",
  },
];

/** the outer land boundary of the brief's zoning map */
export const BOUNDARY: Pt[] = LAND;

/** boundary lengths, printed on the brief's map (no unit is printed there) */
export const DIMS: { at: Pt; text: string; rot?: number }[] = [
  { at: [503, 186], text: "839" }, { at: [292, 250], text: "248", rot: -90 }, { at: [286, 358], text: "193", rot: -78 }, { at: [326, 462], text: "270", rot: -62 },
  { at: [262, 585], text: "775", rot: -54 }, { at: [290, 838], text: "731", rot: 40 }, { at: [685, 790], text: "1358", rot: -33 },
  { at: [1030, 718], text: "359" }, { at: [1090, 520], text: "320", rot: 20 }, { at: [845, 482], text: "742" },
];

/** neighbouring developments named in the brief */
export const NEIGHBORS: { at: Pt; text: string; rot?: number }[] = [
  { at: [505, 158], text: "TATWEER MISR" }, { at: [900, 232], text: "ALMARASEM DEVELOPMENT", rot: -14 },
  { at: [1085, 400], text: "DE JOYA", rot: -48 }, { at: [1222, 700], text: "SODIC", rot: 82 },
];

/** the eight AI City offers on slide 12, and where each one lives in the dashboard */
export const OFFERS: { tab: TabId; name: string; text: string }[] = [
  { tab: "mobility", name: "AI Traffic Management", text: "Predict traffic flow and optimize mobility across the community." },
  { tab: "mobility", name: "Smart Parking Management", text: "Real-time parking availability and guidance for residents and visitors." },
  { tab: "assets", name: "Predictive Maintenance", text: "AI detects issues before failures occur, reducing downtime and maintenance costs." },
  { tab: "safety", name: "AI Video Analytics", text: "Intelligent monitoring and analysis to enhance safety and security." },
  { tab: "utilities", name: "Energy Optimization", text: "Optimize energy usage for higher efficiency and lower costs." },
  { tab: "utilities", name: "Water Monitoring", text: "Smart monitoring and optimization of water consumption." },
  { tab: "assistant", name: "AI Resident Assistant", text: "Chatbot & self-service portal for quick access to services." },
  { tab: "platform", name: "Digital Data Platform", text: "Connected AI platform that integrates data and enables future city services." },
];

/** sample alerts shown on Home */
export const ALERTS: { sev: "bad" | "warn" | "info"; text: string; where: string; ago: string; tab: TabId; target?: string }[] = [
  { sev: "bad", text: "Lagoon pump station 2: vibration rising", where: "Assets", ago: "9 min ago", tab: "assets" },
  { sev: "warn", text: "Parking lot near the Hotel is 92% full", where: "Mobility", ago: "24 min ago", tab: "mobility", target: "p2" },
  { sev: "warn", text: "Golf irrigation 14% above plan today", where: "Utilities", ago: "1 h ago", tab: "utilities" },
  { sev: "info", text: "Gate camera 7 reconnected", where: "Safety", ago: "2 h ago", tab: "safety", target: "C7" },
];
