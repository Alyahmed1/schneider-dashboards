import type { ComponentType } from "react";
import type { FlowCfg } from "./FlowDiagram";

/** Shared types for the three diagram pages (Process, MMM, CPG) */
export type Tone = "good" | "warn" | "bad";
export type Metric = { k: string; label: string; unit: string; v: number; dec: number; amp: number; tone: Tone };
export type Equip = { id: string; n: number; name: string; what: string; why: string };
export type ScenarioDef = { id: string; label: string; story: string };

export const M = (k: string, label: string, unit: string, v: number, dec: number, amp = 0.01, tone: Tone = "good"): Metric => ({ k, label, unit, v, dec, amp, tone });
export const toneOf = (ms: Metric[]): Tone => (ms.some((m) => m.tone === "bad") ? "bad" : ms.some((m) => m.tone === "warn") ? "warn" : "good");

export type DiagramProps = {
  sel: string;
  onSelect: (id: string) => void;
  scn: string;
  tones: Record<string, Tone>;
  val: (id: string, k: string) => string;
  num: (id: string, k: string) => number;
};

export type Kpi = { label: string; v: number; dec: number; unit: string; tone: Tone };
export type KpiCtx = { num: (id: string, k: string) => number; tone: (id: string, k: string) => Tone; alerts: number; total: number };

export type PageCfg = {
  key: string;
  flow: FlowCfg;
  title: string;
  sub: string;
  bg: string;
  scenarios: ScenarioDef[];
  equip: Equip[];
  metrics: (id: string, scn: string) => Metric[];
  kpis: (c: KpiCtx) => Kpi[];
  Diagram: ComponentType<DiagramProps>;
  legend: { cls: string; label: string }[];
  start: string;
};
