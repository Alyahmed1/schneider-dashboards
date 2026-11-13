/**
 * Water Cycle numbers (simulated). They tie to src/data.ts:
 *  supply 17.5 M m3/day = sea 1.6 + river 7.5 + wells 8.4; 15.5 goes into the drinking-water network, 2.0 is used raw by farms and industry.
 *  network losses 24% of 15.5 = 3.7, delivered 11.8. Wastewater collected 9.4 (domestic 6.0 + industrial 1.4 + agricultural 2.0),
 *  reused 4.1 (domestic 2.0 + industrial 0.6 + agricultural 1.5). Weighted water cost EGP 4.8 per m3 (matches the Executive View).
 * Every group of percentages is made by `split()`, which always adds up to exactly 100.
 */
import type { MinistryId } from "./data";

/** turn amounts into whole percentages that add up to exactly 100 (largest remainder) */
export function split(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  const raw = values.map((v) => (v / total) * 100);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f).forEach(({ i }) => { if (left > 0) { out[i] += 1; left -= 1; } });
  return out;
}
/** fail loudly in development if a group of shares does not add up to 100 */
export function check100(name: string, pcts: number[]) {
  const sum = pcts.reduce((a, b) => a + b, 0);
  if (sum !== 100) console.error(`[water cycle] "${name}" adds up to ${sum}, not 100`);
  return pcts;
}

export type Sym =
  | "sea" | "pretreat" | "ro" | "wells" | "river" | "filter" | "uv" | "network"
  | "houses" | "factory" | "field" | "collect" | "wwtp" | "tertiary"
  | "compost" | "pivot" | "digester" | "gas" | "sludge" | "drip";

export interface Step { sym: Sym; name: string; tile: [string, string] }
export interface Kpi { label: string; value: string; unit?: string }
export interface Lane {
  id: string; kicker: string; title: string; tone: string; owner: MinistryId; ownerShort: string;
  steps: Step[];
  gauge: { label: string; pct: number };
  kpis: Kpi[];
}

/* ---------------- 1. Cycle: where the water comes from ---------------- */
const SRC_FLOW = [1.6, 7.5, 8.4];
const SRC_PCT = check100("sources", split(SRC_FLOW));
export const SOURCES: Lane[] = [
  {
    id: "sea", kicker: "SEA", title: "Desalination", tone: "#22d3ee", owner: "mhuuc", ownerShort: "MHUUC",
    steps: [
      { sym: "sea", name: "Sea intake", tile: ["Intake", "1.9 M m³/day"] },
      { sym: "pretreat", name: "Pre-treatment", tile: ["Recovery", "92 %"] },
      { sym: "ro", name: "Reverse osmosis", tile: ["Energy", "3.4 kWh/m³"] },
    ],
    gauge: { label: "of supply", pct: SRC_PCT[0] },
    kpis: [{ label: "Produced", value: "1.6", unit: "M m³/day" }, { label: "Cost", value: "EGP 14", unit: "/ m³" }, { label: "Plants", value: "76" }, { label: "Salt removed", value: "99.7", unit: "%" }],
  },
  {
    id: "river", kicker: "RIVER", title: "Water treatment", tone: "#38bdf8", owner: "mhuuc", ownerShort: "MHUUC",
    steps: [
      { sym: "river", name: "Nile intake", tile: ["Intake", "7.9 M m³/day"] },
      { sym: "filter", name: "Settling and filters", tile: ["Turbidity", "0.4 NTU"] },
      { sym: "uv", name: "Disinfection", tile: ["Chlorine", "0.8 mg/L"] },
    ],
    gauge: { label: "of supply", pct: SRC_PCT[1] },
    kpis: [{ label: "Produced", value: "7.5", unit: "M m³/day" }, { label: "Cost", value: "EGP 4.2", unit: "/ m³" }, { label: "Plants", value: "44" }, { label: "Quality pass", value: "99.1", unit: "%" }],
  },
  {
    id: "wells", kicker: "WELLS", title: "Water treatment", tone: "#a78bfa", owner: "mhuuc", ownerShort: "MHUUC",
    steps: [
      { sym: "wells", name: "Well pumps", tile: ["Pumped", "8.6 M m³/day"] },
      { sym: "filter", name: "Aeration and filters", tile: ["Iron removed", "96 %"] },
      { sym: "uv", name: "Disinfection", tile: ["Chlorine", "0.7 mg/L"] },
    ],
    gauge: { label: "of supply", pct: SRC_PCT[2] },
    kpis: [{ label: "Produced", value: "8.4", unit: "M m³/day" }, { label: "Cost", value: "EGP 3.6", unit: "/ m³" }, { label: "Wells", value: "1,150" }, { label: "Quality pass", value: "98.6", unit: "%" }],
  },
];
export const SUPPLY_TOTAL = "17.5";
export const NETWORK_SPLIT = check100("network", [76, 24]); // delivered, lost
export const NETWORK = { inflow: "15.5", raw: "2.0", delivered: "11.8", lost: "3.7", cost: "4.8", people: "~115 M", pressure: "94 %" };

/* ---------------- 2. Reuse: wastewater back into use ---------------- */
const GEN = [6.0, 1.4, 2.0];
const REUSED = [2.0, 0.6, 1.5];
export const GEN_PCT = check100("wastewater collected", split(GEN));
export const REUSED_PCT = check100("reused water", split(REUSED));
export const REUSE_RATE = REUSED.map((r, i) => Math.round((r / GEN[i]) * 100)); // 33, 43, 75
export const REUSE: Lane[] = [
  {
    id: "domestic", kicker: "DOMESTIC", title: "Homes and cities", tone: "#f472b6", owner: "mhuuc", ownerShort: "MHUUC",
    steps: [
      { sym: "houses", name: "Sewer network", tile: ["Collected", "6.0 M m³/day"] },
      { sym: "wwtp", name: "Treatment plant", tile: ["Treated", "5.2 M m³/day"] },
      { sym: "tertiary", name: "Polishing", tile: ["Quality pass", "97 %"] },
    ],
    gauge: { label: "reused", pct: REUSE_RATE[0] },
    kpis: [{ label: "Of wastewater", value: `${GEN_PCT[0]}`, unit: "%" }, { label: "Reused", value: "2.0", unit: "M m³/day" }, { label: "Plants", value: "380" }, { label: "Reuse cost", value: "EGP 1.9", unit: "/ m³" }],
  },
  {
    id: "industrial", kicker: "INDUSTRIAL", title: "Factories", tone: "#fbbf24", owner: "eeaa", ownerShort: "EEAA",
    steps: [
      { sym: "factory", name: "Factory discharge", tile: ["Collected", "1.4 M m³/day"] },
      { sym: "pretreat", name: "On-site treatment", tile: ["COD removed", "93 %"] },
      { sym: "tertiary", name: "Polishing", tile: ["Within limits", "98 %"] },
    ],
    gauge: { label: "reused", pct: REUSE_RATE[1] },
    kpis: [{ label: "Of wastewater", value: `${GEN_PCT[1]}`, unit: "%" }, { label: "Reused", value: "0.6", unit: "M m³/day" }, { label: "Plants", value: "612" }, { label: "Reuse cost", value: "EGP 3.1", unit: "/ m³" }],
  },
  {
    id: "agri", kicker: "AGRICULTURAL", title: "Farms and drains", tone: "#4ade80", owner: "moalr", ownerShort: "MoALR",
    steps: [
      { sym: "field", name: "Farm drains", tile: ["Collected", "2.0 M m³/day"] },
      { sym: "collect", name: "Mixing and settling", tile: ["Salinity", "1.1 dS/m"] },
      { sym: "tertiary", name: "Safe-use check", tile: ["Safe for crops", "96 %"] },
    ],
    gauge: { label: "reused", pct: REUSE_RATE[2] },
    kpis: [{ label: "Of wastewater", value: `${GEN_PCT[2]}`, unit: "%" }, { label: "Reused", value: "1.5", unit: "M m³/day" }, { label: "Pumping sites", value: "410" }, { label: "Reuse cost", value: "EGP 0.9", unit: "/ m³" }],
  },
];
export const REUSE_TOTAL = { collected: "9.4", reused: "4.1", pct: Math.round((4.1 / 9.4) * 100), ofSupply: 23 };

/* ---------------- 3. Outputs: where it ends up ---------------- */
export const WATER_SPLIT = check100("reused water use", split([3.3, 0.8])); // irrigation, industry and landscape
export const SLUDGE_SPLIT = check100("sludge use", [55, 45]); // biogas, fertilizer
export interface Output { id: string; title: string; tone: string; owner: MinistryId; ownerShort: string; steps: Step[]; gauges: { label: string; pct: number }[]; kpis: Kpi[] }
export const OUTPUTS: Output[] = [
  {
    id: "fert", title: "Fertilization", tone: "#fbbf24", owner: "moalr", ownerShort: "MoALR",
    steps: [
      { sym: "sludge", name: "Dried sludge", tile: ["Input", "1,890 t/day"] },
      { sym: "compost", name: "Composting", tile: ["Compost", "640 t/day"] },
    ],
    gauges: [{ label: "of sludge", pct: SLUDGE_SPLIT[1] }, { label: "Nutrient target", pct: 91 }],
    kpis: [{ label: "Farms supplied", value: "190", unit: "K feddan" }, { label: "Fertilizer saved", value: "EGP 0.3", unit: "bn/yr" }, { label: "Heavy metals", value: "Within limits" }, { label: "Plants", value: "58" }],
  },
  {
    id: "irr", title: "Irrigation", tone: "#4ade80", owner: "moalr", ownerShort: "MoALR",
    steps: [
      { sym: "tertiary", name: "Treated water", tile: ["Input", "3.3 M m³/day"] },
      { sym: "pivot", name: "Pivots and drip", tile: ["Area", "440 K feddan"] },
    ],
    gauges: [{ label: "of reused water", pct: WATER_SPLIT[0] }, { label: "Irrigation efficiency", pct: 82 }],
    kpis: [{ label: "Per feddan", value: "7.5", unit: "m³/day" }, { label: "Yield gain", value: "+20", unit: "%" }, { label: "Fresh water saved", value: "3.3", unit: "M m³/day" }, { label: "Smart farms", value: "8,100" }],
  },
  {
    id: "gas", title: "Biogas", tone: "#22d3ee", owner: "mhuuc", ownerShort: "MHUUC",
    steps: [
      { sym: "sludge", name: "Wet sludge", tile: ["Input", "2,310 t/day"] },
      { sym: "digester", name: "Digesters", tile: ["Gas made", "410 K m³/day"] },
      { sym: "gas", name: "Power units", tile: ["Power", "0.85 GWh/day"] },
    ],
    gauges: [{ label: "of sludge", pct: SLUDGE_SPLIT[0] }, { label: "Plant power", pct: 38 }],
    kpis: [{ label: "CO₂ avoided", value: "310", unit: "t/day" }, { label: "Energy value", value: "EGP 0.9", unit: "bn/yr" }, { label: "Digesters", value: "112" }, { label: "Methane", value: "63", unit: "%" }],
  },
];
export const OUTPUT_INPUTS = { water: "4.1", sludge: "4,200" };
