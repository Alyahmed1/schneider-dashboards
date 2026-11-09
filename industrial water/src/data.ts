export type Segment = "process" | "mmm" | "cpg";

/** small seeded random, so the demo looks the same on every load */
export const rng = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};


export type Kpi = { id: string; label: string; value: number; unit: string; decimals: number; delta: number; good: boolean; note: string; seed: number; wobble: number };

export const KPIS: Kpi[] = [
  { id: "intake", label: "Water intake", value: 18420, unit: "m³/day", decimals: 0, delta: -4.2, good: true, note: "vs last week", seed: 3, wobble: 0.002 },
  { id: "recycle", label: "Water recycled", value: 79.4, unit: "%", decimals: 1, delta: 3.1, good: true, note: "reused on site", seed: 5, wobble: 0.001 },
  { id: "quality", label: "Discharge compliance", value: 99.2, unit: "%", decimals: 1, delta: 0.4, good: true, note: "within permit limits", seed: 7, wobble: 0.0005 },
  { id: "energy", label: "Energy per m³", value: 1.42, unit: "kWh", decimals: 2, delta: -2.8, good: true, note: "pumping and treatment", seed: 11, wobble: 0.004 },
  { id: "saved", label: "Cost saved", value: 128.6, unit: "k USD / month", decimals: 1, delta: 6.5, good: true, note: "from reuse", seed: 13, wobble: 0.001 },
  { id: "alarms", label: "Active alarms", value: 3, unit: "open", decimals: 0, delta: 1, good: false, note: "1 needs attention", seed: 17, wobble: 0 },
];

export const SEGMENTS: { id: Segment; title: string; tag: string; img: string; stat: { v: string; u: string }[]; blurb: string }[] = [
  { id: "process", title: "Industrial water process", tag: "Treatment train", img: "/process.jpg", blurb: "From intake to reuse: clarify, filter, RO, cooling and boiler water.", stat: [{ v: "94%", u: "availability" }, { v: "6", u: "treatment stages" }] },
  { id: "mmm", title: "Mining, Minerals & Metals", tag: "MMM", img: "/mmm.jpg", blurb: "Mine water cycle: mill, flotation, thickener, tailings and water return.", stat: [{ v: "82%", u: "water recycled" }, { v: "1.1", u: "m³ per tonne of ore" }] },
  { id: "cpg", title: "Consumer Packaged Goods", tag: "CPG", img: "/cpg.jpg", blurb: "Plant water cycle: process water, CIP cleaning, filling lines and wastewater.", stat: [{ v: "1.9", u: "L water per L product" }, { v: "12", u: "CIP cycles today" }] },
];

export type Alarm = { id: number; sev: "bad" | "warn" | "info"; title: string; where: string; ago: string };
export const ALARMS: Alarm[] = [
  { id: 1, sev: "bad", title: "Tailings pond level high", where: "MMM · Tailings dam", ago: "6 min ago" },
  { id: 2, sev: "warn", title: "RO membrane differential pressure rising", where: "Process · RO train B", ago: "41 min ago" },
  { id: 3, sev: "warn", title: "CIP rinse conductivity above target", where: "CPG · Line 2", ago: "1 h ago" },
];

/** 24 hourly points: water taken in and water reused, for the Home chart */
export function dayFlow() {
  const r = rng(42);
  return Array.from({ length: 24 }, (_, h) => {
    const shape = 0.85 + 0.15 * Math.sin(((h - 5) / 24) * Math.PI * 2);
    const intake = Math.round(770 * shape + r() * 40);
    const reused = Math.round(intake * (0.74 + r() * 0.1));
    return { h: `${String(h).padStart(2, "0")}:00`, intake, reused };
  });
}

export const spark = (seed: number, n = 16) => {
  const r = rng(seed * 97);
  let v = 50;
  return Array.from({ length: n }, (_, i) => ({ i, v: (v += (r() - 0.45) * 8) }));
};
