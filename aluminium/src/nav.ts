import type { Group } from "./Alerts";

export type TabId = "overview" | "process" | "factory" | "alerts" | "quality" | "equipment" | "logistics" | "utilities";
export interface NavOpts { stage?: string; group?: Group; sub?: "All utilities" | "Power" | "Water"; util?: "Power" | "Water" }
export type Go = (tab: TabId, opts?: NavOpts) => void;
