/**
 * The 7 stages of the El Hamam walkthrough (simulated numbers). `at` is the stage centre in the 3D scene, `pinY` the height of its number pin,
 * `zoom` how far the camera stands back. Each card mixes: a gauge, 2 text tiles, 2 progress bars and a 12-hour bar chart.
 * Flow numbers match the page: 1.04 in, 1.00 out (M m3/day).
 */
export interface PlantStage {
  id: string; short: string; title: string; line: string; flow: string;
  gauge: { pct: number; label: string };
  kpis: [string, string][];                    // text tiles (first two are shown)
  bars: [string, number, string][];            // progress bars: label, 0-100, text
  trend: { label: string; values: number[] };  // 12 hourly values, drawn as a small bar chart
  at: [number, number]; pinY: number; zoom: number;
}
export const STAGES: PlantStage[] = [
  { id: "intake", short: "Intake", title: "Intake canal", flow: "1.04", at: [-15, 0], pinY: 3.2, zoom: 1,
    line: "Drain water from the farm canals enters the plant and is lifted by the intake pumps.",
    gauge: { pct: 83, label: "pumps running" },
    kpis: [["Inflow", "1.04 M m³/day"], ["Intake pumps", "5 of 6"]],
    bars: [["Pump load", 78, "78 %"], ["Canal level", 72, "2.4 of 3.3 m"]],
    trend: { label: "Inflow, last 12 hours", values: [1.0, 1.02, 1.03, 1.05, 1.06, 1.05, 1.04, 1.03, 1.04, 1.05, 1.04, 1.04] } },
  { id: "screen", short: "Screening", title: "Screening house", flow: "1.04", at: [-9.5, 0], pinY: 5.6, zoom: 1,
    line: "Screens catch sticks, plastic and weeds so they never reach the tanks.",
    gauge: { pct: 100, label: "screens running" },
    kpis: [["Waste removed", "6.2 t/day"], ["Screens", "4 of 4"]],
    bars: [["Screen blockage", 14, "14 %"], ["Head loss", 30, "0.3 of 1.0 m"]],
    trend: { label: "Waste removed, last 12 hours", values: [0.2, 0.3, 0.3, 0.2, 0.3, 0.4, 0.3, 0.2, 0.3, 0.3, 0.2, 0.3] } },
  { id: "clarifier", short: "Clarifiers", title: "Clarifiers", flow: "1.03", at: [-4, 0], pinY: 3.6, zoom: 1.35,
    line: "Slow settling: fine solids sink and a slow bridge scrapes the sludge to the centre.",
    gauge: { pct: 96, label: "solids removed" },
    kpis: [["Settling time", "2.4 h"], ["Sludge", "38 m³/day"]],
    bars: [["Sludge blanket", 42, "1.1 m"], ["Overflow rate", 68, "68 % of limit"]],
    trend: { label: "Solids removed, last 12 hours", values: [95, 96, 96, 97, 96, 95, 96, 96, 97, 96, 96, 96] } },
  { id: "filter", short: "Filters", title: "Sand filters", flow: "1.01", at: [-5.35, 14], pinY: 3.2, zoom: 1.15,
    line: "Water trickles down through sand beds that trap the tiniest particles.",
    gauge: { pct: 88, label: "capacity used" },
    kpis: [["Turbidity out", "1.8 NTU"], ["Filter run", "38 h"]],
    bars: [["Bed clogging", 54, "54 %"], ["Time to backwash", 38, "in 24 h"]],
    trend: { label: "Turbidity out, last 12 hours", values: [1.9, 1.8, 1.8, 1.7, 1.8, 1.9, 1.8, 1.8, 1.7, 1.8, 1.8, 1.8] } },
  { id: "chlorine", short: "Chlorine", title: "Chlorine contact", flow: "1.00", at: [-13.1, 14], pinY: 4.4, zoom: 1.15,
    line: "Chlorine kills germs. The water winds through long lanes so it has time to work.",
    gauge: { pct: 98, label: "dose on target" },
    kpis: [["Dose", "2.1 mg/L"], ["Contact time", "32 min"]],
    bars: [["Chlorine left", 60, "0.6 of 1.0 mg/L"], ["Tank level", 76, "76 %"]],
    trend: { label: "Chlorine left, last 12 hours", values: [0.6, 0.6, 0.5, 0.6, 0.7, 0.6, 0.6, 0.6, 0.5, 0.6, 0.6, 0.6] } },
  { id: "outlet", short: "Outlet", title: "Outlet canal", flow: "1.00", at: [-18.9, 14], pinY: 2.8, zoom: 1,
    line: "Clean water leaves the plant towards the fields.",
    gauge: { pct: 99, label: "quality pass" },
    kpis: [["Flow", "1.00 M m³/day"], ["Salinity", "1.1 dS/m"]],
    bars: [["Salinity vs limit", 37, "1.1 of 3.0 dS/m"], ["Canal level", 63, "1.9 m"]],
    trend: { label: "Flow out, last 12 hours", values: [0.98, 1.0, 1.01, 1.0, 1.02, 1.0, 1.0, 0.99, 1.0, 1.01, 1.0, 1.0] } },
  { id: "field", short: "Fields", title: "Pivot fields", flow: "1.00", at: [-26.3, 14], pinY: 3.8, zoom: 1.6,
    line: "Centre-pivot irrigation spreads the water over the farms.",
    gauge: { pct: 91, label: "pivots on" },
    kpis: [["Area served", "135 K feddan"], ["Pivots on", "31 of 34"]],
    bars: [["Soil moisture", 33, "33 %"], ["Water used today", 71, "71 % of plan"]],
    trend: { label: "Water used, last 12 hours", values: [38, 40, 42, 44, 45, 44, 43, 42, 41, 40, 41, 42] } },
];
