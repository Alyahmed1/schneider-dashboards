import { fmt, moistClass, type PivotNow, type PivotStatus } from "./farm";

export type Metric = "Soil moisture" | "Irrigation status" | "Water applied" | "Crop stress";
export const METRICS: Metric[] = ["Soil moisture", "Irrigation status", "Water applied", "Crop stress"];

const DRY = "#ef5a6a", LOW = "#f0b429", OK = "#3ecf5a", WET = "#3db8ff", GREY = "#7d8fa3";
const STATUS_C: Record<PivotStatus, string> = { Irrigating: WET, Scheduled: LOW, Idle: GREY, Fault: DRY };
const MOIST_C = { dry: DRY, low: LOW, ok: OK, wet: WET };
const APPLIED_C = ["#2a6f9c", "#3a93cc", "#3db8ff", "#9fdcff"];
const appliedBin = (mm: number) => (mm < 2 ? 0 : mm < 4.5 ? 1 : mm < 6.5 ? 2 : 3);

export const moistColor = (m: number) => MOIST_C[moistClass(m)];
export const STATUS_COLOR = STATUS_C;

export function pivotColor(m: Metric, n: PivotNow): string {
  if (m === "Soil moisture") return MOIST_C[moistClass(n.moist)];
  if (m === "Irrigation status") return STATUS_C[n.status];
  if (m === "Water applied") return APPLIED_C[appliedBin(n.applied)];
  return n.stress < 0.1 ? OK : n.stress < 0.3 ? LOW : DRY;
}

/** the big figure written inside each circle */
export function pivotValue(m: Metric, n: PivotNow): string {
  if (m === "Soil moisture") return `${fmt(n.moist, 0)}%`;
  if (m === "Irrigation status") return n.status;
  if (m === "Water applied") return `${fmt(n.applied, 1)} mm`;
  return fmt(n.stress, 2);
}

export const LEGEND: Record<Metric, { title: string; items: { label: string; note: string; c: string }[] }> = {
  "Soil moisture": { title: "Soil moisture", items: [
    { label: "Dry", note: "under 28%", c: DRY }, { label: "Low", note: "28 to 33%", c: LOW },
    { label: "Optimal", note: "33 to 45%", c: OK }, { label: "Wet", note: "over 45%", c: WET },
  ] },
  "Irrigation status": { title: "Irrigation status", items: [
    { label: "Irrigating", note: "", c: WET }, { label: "Scheduled", note: "starts within 8 h", c: LOW },
    { label: "Idle", note: "", c: GREY }, { label: "Fault", note: "", c: DRY },
  ] },
  "Water applied": { title: "Water applied today", items: [
    { label: "Under 2 mm", note: "", c: APPLIED_C[0] }, { label: "2 to 4.5 mm", note: "", c: APPLIED_C[1] },
    { label: "4.5 to 6.5 mm", note: "", c: APPLIED_C[2] }, { label: "Over 6.5 mm", note: "", c: APPLIED_C[3] },
  ] },
  "Crop stress": { title: "Crop water stress", items: [
    { label: "Low", note: "under 0.1", c: OK }, { label: "Moderate", note: "0.1 to 0.3", c: LOW }, { label: "High", note: "over 0.3", c: DRY },
  ] },
};
