import { useMemo } from "react";
import { makePath } from "./geo";
import { useTick, wobble } from "./live";

/* North Coast road (Alexandria to Marsa Matrouh) as a schematic corridor past New Alamein City.
   The drawing is not to scale. Every reading, incident and sign here is SAMPLE data (the Excel has no road items). */
export const ROAD_W = 1327;
export const ROAD_H = 682;
/** s = 0 is the west end (towards Marsa Matrouh), s = 1 the east end (towards Alexandria) */
export const ROAD = makePath([[-30, 436], [140, 408], [320, 440], [500, 396], [690, 352], [880, 378], [1060, 326], [1240, 348], [1360, 314]], 30);
export const COAST: [number, number][] = [[0, 170], [160, 150], [330, 182], [500, 150], [660, 112], [840, 146], [1010, 108], [1180, 128], [1327, 96]];

export const SEGMENTS = 12;
export const NEW_ALAMEIN_S = 0.52;
export const NODES: { name: string; s: number; major?: boolean }[] = [
  { name: "Fouka", s: 0.14 }, { name: "Ras El Hekma", s: 0.27 }, { name: "Sidi Abdel Rahman", s: 0.4 },
  { name: "New Alamein City", s: NEW_ALAMEIN_S, major: true }, { name: "El Alamein", s: 0.65 }, { name: "Hammam", s: 0.77 }, { name: "Borg El Arab", s: 0.89 },
];
export const nearNode = (s: number) => NODES.reduce((a, b) => (Math.abs(b.s - s) < Math.abs(a.s - s) ? b : a));

export type IncidentKind = "Accident" | "Breakdown" | "Fog" | "Sandstorm" | "Roadworks" | "Slow traffic";
export type RoadSev = "critical" | "warning" | "info";
export interface Incident { id: number; kind: IncidentKind; sev: RoadSev; s: number; dir: string; note: string; mins: number; status: string; team: string; clearAt: number }

const INCIDENTS: Incident[] = [
  { id: 1, kind: "Accident", sev: "critical", s: 0.33, dir: "Alexandria-bound", note: "Two-vehicle collision, right lane blocked", mins: 14, status: "Ambulance on scene", team: "Highway patrol, ambulance", clearAt: 34 },
  { id: 2, kind: "Breakdown", sev: "warning", s: 0.585, dir: "Matrouh-bound", note: "Truck stopped on the hard shoulder", mins: 22, status: "Tow truck requested", team: "Tow service", clearAt: 999 },
  { id: 3, kind: "Fog", sev: "warning", s: 0.2, dir: "Both directions", note: "Visibility under 300 m, speed limit lowered to 60 km/h", mins: 47, status: "Monitoring", team: "Road operations", clearAt: 999 },
  { id: 4, kind: "Sandstorm", sev: "warning", s: 0.8, dir: "Both directions", note: "Blowing sand reduces visibility near Hammam", mins: 9, status: "Warning signs on", team: "Road operations", clearAt: 999 },
  { id: 5, kind: "Roadworks", sev: "info", s: 0.695, dir: "Alexandria-bound", note: "Left lane closed for resurfacing", mins: 190, status: "Planned until 18:00", team: "Maintenance crew", clearAt: 999 },
  { id: 6, kind: "Slow traffic", sev: "info", s: 0.9, dir: "Alexandria-bound", note: "Heavy holiday traffic towards Borg El Arab", mins: 35, status: "Monitoring", team: "Highway patrol", clearAt: 999 },
  { id: 7, kind: "Breakdown", sev: "warning", s: 0.47, dir: "Alexandria-bound", note: "Car stopped on the New Alamein exit ramp", mins: 6, status: "Patrol on the way", team: "Highway patrol", clearAt: 14 },
];

export const WEATHER_AT = [0.08, 0.22, 0.38, 0.55, 0.72, 0.9];
export const SIGNS_AT = [0.06, 0.18, 0.3, 0.44, 0.6, 0.74, 0.86];
const SIGN_TEXT: Record<IncidentKind, string> = { Accident: "ACCIDENT AHEAD · 40", Breakdown: "STOPPED VEHICLE", Fog: "FOG · MAX 60", Sandstorm: "SAND · MAX 50", Roadworks: "LEFT LANE CLOSED", "Slow traffic": "SLOW TRAFFIC" };

export type Flow = "good" | "warn" | "bad";
export const flowOf = (speed: number): Flow => (speed >= 75 ? "good" : speed >= 50 ? "warn" : "bad");

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function build(tick: number) {
  const active = INCIDENTS.filter((i) => tick < i.clearAt).map((i) => ({ ...i, mins: i.mins + Math.floor((tick * 8) / 60) }));
  const segIdx = (s: number) => Math.min(SEGMENTS - 1, Math.floor(s * SEGMENTS));

  const segs = Array.from({ length: SEGMENTS }, (_, i) => {
    let speed = wobble(100 - (i % 3) * 2, 100 + i, tick, 0.012);
    for (const inc of active) {
      const hit = segIdx(inc.s) === i, near = Math.abs(segIdx(inc.s) - i) === 1;
      const cut = inc.sev === "critical" ? 0.4 : inc.kind === "Slow traffic" ? 0.62 : inc.sev === "warning" ? 0.86 : 0.97;
      if (hit) speed *= cut; else if (near && inc.sev === "critical") speed *= 0.78;
    }
    speed = clamp(speed, 18, 112);
    return { i, s0: i / SEGMENTS, s1: (i + 1) / SEGMENTS, speed, flow: flowOf(speed) };
  });

  const stations = WEATHER_AT.map((s, k) => {
    let vis = 10;
    for (const inc of active) {
      const d = Math.abs(inc.s - s);
      if (inc.kind === "Fog" && d < 0.1) vis = Math.min(vis, 0.3 + d * 6);
      if (inc.kind === "Sandstorm" && d < 0.1) vis = Math.min(vis, 1.6 + d * 14);
    }
    vis = clamp(wobble(vis, 200 + k, tick, 0.03), 0.2, 10);
    const sandy = active.some((inc) => inc.kind === "Sandstorm" && Math.abs(inc.s - s) < 0.1);
    return { s, vis, wind: Math.round(clamp(wobble(sandy ? 46 : 19 + k * 2, 210 + k, tick, 0.05), 6, 70)), temp: Math.round(wobble(27 - k * 0.2, 220 + k, tick, 0.015)), flow: (vis < 1 ? "bad" : vis < 5 ? "warn" : "good") as Flow };
  });

  const signs = SIGNS_AT.map((s) => {
    const hit = active.filter((inc) => inc.sev !== "info" || Math.abs(inc.s - s) < 0.05).filter((inc) => inc.s - s > -0.02 && inc.s - s < 0.16).sort((a, b) => a.s - b.s)[0];
    return { s, text: hit ? SIGN_TEXT[hit.kind] : "DRIVE SAFELY", alert: Boolean(hit) };
  });

  const avgSpeed = segs.reduce((a, b) => a + b.speed, 0) / segs.length;
  const kpi = {
    vph: Math.round(wobble(2840 * (1 - 0.018 * active.length), 300, tick, 0.02)),
    avgSpeed,
    active: active.length,
    critical: active.filter((i) => i.sev === "critical").length,
    visMin: Math.min(...stations.map((s) => s.vis)),
    flowingPct: (segs.filter((s) => s.flow === "good").length / segs.length) * 100,
    clearMin: clamp(wobble(19, 310, tick, 0.05), 8, 40),
  };
  return { segs, incidents: active, stations, signs, kpi };
}
export type RoadModel = ReturnType<typeof build>;

export function useRoad(): RoadModel {
  const tick = useTick();
  return useMemo(() => build(tick), [tick]);
}
