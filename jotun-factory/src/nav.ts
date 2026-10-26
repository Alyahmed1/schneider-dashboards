export type TabId = "overview" | "process" | "quality" | "equipment" | "maintenance" | "utilities" | "logistics" | "alerts";
export interface NavOpts { stage?: string; util?: string; sev?: string }
export type Go = (id: TabId, opts?: NavOpts) => void;
