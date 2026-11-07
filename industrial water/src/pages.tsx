import { makeDiagram, type FlowCfg } from "./FlowDiagram";
import { Bell, Droplet, Droplets, FlaskConical, Gem, GlassWater, PackageCheck, Recycle, RefreshCw, Repeat, Scale, ShieldCheck, Waves, Zap } from "lucide-react";
import type { PageCfg } from "./diagram";
import { EQUIP, metrics, SCENARIOS } from "./processData";
import { MMM_EQUIP, mmmMetrics, MMM_SCENARIOS } from "./mmmData";
import { CPG_EQUIP, cpgMetrics, CPG_SCENARIOS } from "./cpgData";
import { Symbol as ProcessSymbol } from "./Symbols";
import { MmmSymbol } from "./SymbolsMmm";
import { CpgSymbol } from "./SymbolsCpg";

const processFlow: FlowCfg = {
  equip: EQUIP,
  symbol: (id, num) => <ProcessSymbol id={id} level={num("tank", "level")} />,
  row1: ["raw", "clar", "treated", "treated", "treated"],
  header: "treated",
  collector: "reject",
  stubs: [{ i: 1, label: "Sludge", kind: "sludge" }, { i: 4, label: "Reject to ETP", kind: "reject" }],
  tags: [
    { code: "FT", id: "intake", k: "flow", unit: "m³/h" },
    { code: "AT", id: "clarifier", k: "turb", unit: "NTU" },
    { code: "AT", id: "filter", k: "turb", unit: "NTU" },
    { code: "PT", id: "ro", k: "press", unit: "bar" },
    { code: "CT", id: "ro", k: "cond", unit: "µS" },
  ],
  caps: { header: "Treated water to users", collector: "Used water to wastewater treatment", reuse: "Reuse loop" },
  reuseVal: { id: "etp", k: "reuse" },
};
const ProcessDiagram = makeDiagram(processFlow);

const mmmFlow: FlowCfg = {
  equip: MMM_EQUIP,
  symbol: (id) => <MmmSymbol id={id} />,
  row1: ["raw", "slurry", "slurry", "sludge", "clar"],
  header: "treated",
  collector: "reject",
  stubs: [{ i: 2, label: "Concentrate", kind: "conc" }, { i: 3, label: "Overflow water", kind: "treated" }],
  tags: [
    { code: "FT", id: "pit", k: "make", unit: "m³/h" },
    { code: "DT", id: "mill", k: "dens", unit: "% solids" },
    { code: "AT", id: "flot", k: "ph", unit: "pH" },
    { code: "DT", id: "thick", k: "under", unit: "% solids" },
    { code: "LT", id: "tail", k: "fb", unit: "m" },
  ],
  caps: { header: "Return water to the plant", collector: "Runoff and used water to treatment", reuse: "Water recycled" },
  reuseVal: { id: "pond", k: "recy" },
};
const MmmDiagram = makeDiagram(mmmFlow);

const cpgFlow: FlowCfg = {
  equip: CPG_EQUIP,
  symbol: (id, num) => <CpgSymbol id={id} level={num(id, "level")} />,
  row1: ["raw", "clar", "treated", "treated", "treated"],
  header: "treated",
  collector: "reject",
  stubs: [{ i: 1, label: "Backwash", kind: "sludge" }, { i: 2, label: "Brine", kind: "reject" }, { i: 3, label: "Reject", kind: "reject" }],
  tags: [
    { code: "FT", id: "rawt", k: "flow", unit: "m³/h" },
    { code: "AT", id: "pre", k: "cl", unit: "mg/L" },
    { code: "AT", id: "soft", k: "out", unit: "mg/L" },
    { code: "CT", id: "ro", k: "cond", unit: "µS" },
    { code: "IT", id: "uv", k: "dose", unit: "mJ" },
  ],
  caps: { header: "Treated water to users", collector: "Used water and rinse to ETP", reuse: "Water recovered" },
  reuseVal: { id: "etp", k: "reuse" },
};
const CpgDiagram = makeDiagram(cpgFlow);

export const PAGES: Record<"process" | "mmm" | "cpg", PageCfg> = {
  process: {
    key: "process",
    flow: processFlow,
    title: "Industrial water process",
    sub: "Follow the water from the river to the factory and back again.",
    bg: "/process.jpg",
    scenarios: SCENARIOS,
    equip: EQUIP,
    metrics,
    Diagram: ProcessDiagram,
    legend: [{ cls: "k-raw", label: "Raw water" }, { cls: "k-treated", label: "Treated water" }, { cls: "k-reject", label: "Used water" }, { cls: "k-reuse", label: "Reuse loop" }],
    start: "ro",
    kpis: (c) => [
      { label: "Raw water in", icon: Droplets, v: c.num("intake", "flow"), dec: 0, unit: "m³/h", tone: c.tone("intake", "flow") },
      { label: "Treated water", icon: ShieldCheck, v: c.num("tank", "flow"), dec: 0, unit: "m³/h", tone: c.tone("tank", "flow") },
      { label: "RO recovery", icon: Recycle, v: c.num("ro", "rec"), dec: 1, unit: "%", tone: c.tone("ro", "rec") },
      { label: "Reuse rate", icon: Repeat, v: c.num("etp", "reuse"), dec: 1, unit: "%", tone: c.tone("etp", "reuse") },
      { label: "Energy per m³", icon: Zap, v: c.num("ro", "sec"), dec: 2, unit: "kWh", tone: c.tone("ro", "sec") },
      { label: "Equipment in alert", icon: Bell, v: c.alerts, dec: 0, unit: `of ${c.total}`, tone: c.alerts === 0 ? "good" : c.alerts > 2 ? "bad" : "warn" },
    ],
  },
  mmm: {
    key: "mmm",
    flow: mmmFlow,
    title: "Mining, Minerals & Metals",
    sub: "The mine water cycle: pit, mill, flotation, thickener, tailings and back again.",
    bg: "/mmm.jpg",
    scenarios: MMM_SCENARIOS,
    equip: MMM_EQUIP,
    metrics: mmmMetrics,
    Diagram: MmmDiagram,
    legend: [{ cls: "k-raw", label: "Fresh water" }, { cls: "k-slurry", label: "Slurry" }, { cls: "k-sludge", label: "Tailings" }, { cls: "k-conc", label: "Concentrate" }, { cls: "k-treated", label: "Return water" }, { cls: "k-reject", label: "Used water" }, { cls: "k-reuse", label: "Reuse" }],
    start: "tail",
    kpis: (c) => [
      { label: "Fresh water make-up", icon: Droplet, v: c.num("pit", "make"), dec: 0, unit: "m³/h", tone: c.tone("pit", "make") },
      { label: "Water recycled", icon: Recycle, v: c.num("pond", "recy"), dec: 1, unit: "%", tone: c.tone("pond", "recy") },
      { label: "Water per tonne", icon: Scale, v: c.num("mill", "wpt"), dec: 2, unit: "m³/t", tone: c.tone("mill", "wpt") },
      { label: "Tailings freeboard", icon: Waves, v: c.num("tail", "fb"), dec: 1, unit: "m", tone: c.tone("tail", "fb") },
      { label: "Copper recovery", icon: Gem, v: c.num("flot", "rec"), dec: 1, unit: "%", tone: c.tone("flot", "rec") },
      { label: "Equipment in alert", icon: Bell, v: c.alerts, dec: 0, unit: `of ${c.total}`, tone: c.alerts === 0 ? "good" : c.alerts > 2 ? "bad" : "warn" },
    ],
  },
  cpg: {
    key: "cpg",
    flow: cpgFlow,
    title: "Consumer Packaged Goods",
    sub: "The plant water cycle: treatment, filling lines, CIP cleaning and recovery.",
    bg: "/cpg.jpg",
    scenarios: CPG_SCENARIOS,
    equip: CPG_EQUIP,
    metrics: cpgMetrics,
    Diagram: CpgDiagram,
    legend: [{ cls: "k-raw", label: "Raw water" }, { cls: "k-treated", label: "Treated water" }, { cls: "k-sludge", label: "Backwash" }, { cls: "k-reject", label: "Used water" }, { cls: "k-reuse", label: "Recovered" }],
    start: "cip",
    kpis: (c) => [
      { label: "Water per litre", icon: GlassWater, v: c.num("fill", "wpl"), dec: 1, unit: "L/L", tone: c.tone("fill", "wpl") },
      { label: "Line output", icon: PackageCheck, v: c.num("fill", "speed"), dec: 0, unit: "k bottles/h", tone: c.tone("fill", "speed") },
      { label: "Water recovered", icon: Recycle, v: c.num("etp", "reuse"), dec: 1, unit: "%", tone: c.tone("etp", "reuse") },
      { label: "RO permeate", icon: FlaskConical, v: c.num("ro", "cond"), dec: 0, unit: "µS/cm", tone: c.tone("ro", "cond") },
      { label: "CIP cycles today", icon: RefreshCw, v: c.num("cip", "cyc"), dec: 0, unit: "cycles", tone: c.tone("cip", "cyc") },
      { label: "Equipment in alert", icon: Bell, v: c.alerts, dec: 0, unit: `of ${c.total}`, tone: c.alerts === 0 ? "good" : c.alerts > 2 ? "bad" : "warn" },
    ],
  },
};
