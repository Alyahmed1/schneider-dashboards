/** the four pivots, taken from Smart Irrigation (same ids, crops, stages and size; P4 keeps its Tower 7 fault) */
export type PivotId = "P1" | "P2" | "P3" | "P4";
export interface Pivot { id: PivotId; crop: "Wheat" | "Maize"; stage: string; feddan: number; fault?: string }

export const PIVOTS: Pivot[] = [
  { id: "P1", crop: "Wheat", stage: "Emergence", feddan: 150 },
  { id: "P2", crop: "Wheat", stage: "Emergence", feddan: 150 },
  { id: "P3", crop: "Maize", stage: "Maturity", feddan: 150 },
  { id: "P4", crop: "Maize", stage: "Maturity", feddan: 150, fault: "Tower 7 drive tripped" },
];
