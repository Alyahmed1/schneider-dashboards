/* ================= Real-map helpers: the network drawn over New Cairo =================
   The model in network.ts uses a 960 x 650 drawing (1 unit = 4 m). Here it is placed on a real map around New Cairo
   so the zones, pipes, pumps and reservoir sit on streets and buildings. The positions are sample data, not a survey. */
import { useEffect, useState } from "react";
import { BAD, colorOf, type Metric } from "./mapcolor";
import { NODES, PIPES, ZONES, type Pipe, type Snapshot, type ZoneId } from "./network";

export type LL = [number, number];

const CENTER = { lat: 30.0300, lng: 31.4700, x: 480, y: 325 };
const D_LAT = 4 / 111000, D_LNG = 4 / (111320 * Math.cos((CENTER.lat * Math.PI) / 180));
export const toLL = (x: number, y: number): LL => [CENTER.lat - (y - CENTER.y) * D_LAT, CENTER.lng + (x - CENTER.x) * D_LNG];

/** convex hull (monotone chain) of [x, y] points */
function hull(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: [number, number][] = [], up: [number, number][] = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of [...p].reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

/** where a zone label sits when the middle of the zone is taken by a pipe or a leak (drawing units) */
const LABEL_AT: Partial<Record<ZoneId, [number, number]>> = { Z3: [752, 368], Z5: [384, 588] };

/** the area of a zone: its nodes, padded by 28 units (about 110 m) and rounded */
export const ZONE_AREA: Record<ZoneId, { poly: LL[]; centre: LL }> = Object.fromEntries(
  ZONES.map((z) => {
    const ns = NODES.filter((n) => n.zone === z.id);
    const pts: [number, number][] = [];
    for (const n of ns) for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; pts.push([n.x + Math.cos(a) * 28, n.y + Math.sin(a) * 28]); }
    const cx = ns.reduce((a, n) => a + n.x, 0) / ns.length, cy = ns.reduce((a, n) => a + n.y, 0) / ns.length;
    const at = LABEL_AT[z.id] ?? [cx, cy];
    return [z.id, { poly: hull(pts).map(([x, y]) => toLL(x, y)), centre: toLL(at[0], at[1]) }];
  }),
) as Record<ZoneId, { poly: LL[]; centre: LL }>;

export const nodeLL = (id: string): LL => { const n = NODES.find((q) => q.id === id)!; return toLL(n.x, n.y); };
export const pipeLine = (p: Pipe): LL[] => [nodeLL(p.from), nodeLL(p.to)];
export const pipeMid = (p: Pipe, t = 0.5): LL => { const a = nodeLL(p.from), b = nodeLL(p.to); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
export const ALL_LL: LL[] = NODES.map((n) => toLL(n.x, n.y));

/* ---------- basemaps ---------- */
export type Basemap = "Streets" | "Satellite";
export const BASEMAPS = ["Streets", "Satellite"] as const;
const ESRI = "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, USGS, OpenStreetMap contributors";
export function tileSpec(base: Basemap, theme: "light" | "dark") {
  const E = "https://server.arcgisonline.com/ArcGIS/rest/services";
  if (base === "Satellite") return { url: `${E}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, ref: `${E}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, native: 18, attr: "Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics" };
  if (theme === "dark") return { url: `${E}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, ref: `${E}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, native: 16, attr: ESRI };
  return { url: `${E}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`, ref: null, native: 18, attr: ESRI };
}

/** the page theme ("light" | "dark"), kept live */
export function useTheme(): "light" | "dark" {
  const read = () => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
  const [t, setT] = useState<"light" | "dark">(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setT(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return t;
}

/* ---------- colours and numbers shared by Home and the Network Map ---------- */
const WIRE = "#8796a8";
export function pipeColor(metric: Metric, s: Snapshot, p: Pipe) {
  if (p.kind === "tie") return WIRE;
  const st = s.pipes[p.id];
  switch (metric) {
    case "Consumption": return colorOf(metric, st.load);
    case "Pressure": return colorOf(metric, st.pressure);
    case "Leakage": return st.leak > 0 ? BAD : p.zone === "trunk" ? WIRE : colorOf(metric, s.zones[p.zone].nrw);
  }
}
/** mean pipe load of a zone, the same number its pipes are coloured with */
export function zoneLoad(s: Snapshot, id: ZoneId) {
  const ps = PIPES.filter((p) => p.zone === id && p.kind === "tree");
  return ps.reduce((a, p) => a + s.pipes[p.id].load, 0) / ps.length;
}
export function zoneInfo(metric: Metric, s: Snapshot, id: ZoneId) {
  const z = ZONES.find((q) => q.id === id)!, q = s.zones[id];
  if (metric === "Consumption") return { z, c: colorOf(metric, zoneLoad(s, id)), big: q.supplied.toFixed(0), unit: "L/s", sub: `${q.pressure.toFixed(1)} bar · ${(q.nrw * 100).toFixed(0)}% lost` };
  if (metric === "Pressure") return { z, c: colorOf(metric, q.pressure), big: q.pressure.toFixed(1), unit: "bar", sub: `lowest ${q.minPressure.toFixed(1)} bar · ${q.supplied.toFixed(0)} L/s` };
  return { z, c: colorOf(metric, q.nrw), big: (q.nrw * 100).toFixed(0), unit: "% lost", sub: `${q.leaks} known leak${q.leaks === 1 ? "" : "s"} · ${(q.loss * 86.4).toFixed(0)} m³/day` };
}
