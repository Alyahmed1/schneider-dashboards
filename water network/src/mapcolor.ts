/** One simple colour code for every map: green is fine, amber needs a look, red needs action. Three colours, no gradients. */
export const METRICS = ["Consumption", "Pressure", "Leakage"] as const;
export type Metric = (typeof METRICS)[number];

export const GOOD = "#2fbf6b", MID = "#f0b429", BAD = "#ef5a6a";
const COLORS = [GOOD, MID, BAD];

/** 0 = green, 1 = amber, 2 = red. The value is: pipe load (0 to 1) for Consumption, bar for Pressure, share of water lost (0 to 1) for Leakage */
export function levelOf(m: Metric, v: number): 0 | 1 | 2 {
  if (m === "Consumption") return v < 0.5 ? 0 : v < 0.8 ? 1 : 2;
  if (m === "Pressure") return v >= 3.5 ? 0 : v >= 2.5 ? 1 : 2;
  return v < 0.15 ? 0 : v < 0.2 ? 1 : 2;
}
export const colorOf = (m: Metric, v: number) => COLORS[levelOf(m, v)];

export const LEGEND: Record<Metric, { title: string; items: { c: string; label: string; note: string }[] }> = {
  Consumption: { title: "How much water is flowing", items: [
    { c: GOOD, label: "Low", note: "under 50% of the pipe" }, { c: MID, label: "Medium", note: "50 to 80%" }, { c: BAD, label: "High", note: "over 80%" }] },
  Pressure: { title: "Water pressure", items: [
    { c: GOOD, label: "Good", note: "3.5 bar or more" }, { c: MID, label: "Low", note: "2.5 to 3.5 bar" }, { c: BAD, label: "Too low", note: "under 2.5 bar" }] },
  Leakage: { title: "Water lost on the way", items: [
    { c: GOOD, label: "Low", note: "under 15%" }, { c: MID, label: "Medium", note: "15 to 20%" }, { c: BAD, label: "High", note: "over 20%, or a burst" }] },
};

/** which instruments the map shows in each mode, so only the ones that explain the colours are on screen */
export const SHOWS: Record<Metric, string[]> = {
  Consumption: ["flow"],
  Pressure: ["pressure", "prv", "quality"],
  Leakage: ["leak", "flow"],
};
