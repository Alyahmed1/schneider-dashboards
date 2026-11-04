/* ================= Real-map helpers: the network drawn over New Cairo =================
   The model in network.ts uses a 960 x 650 drawing (1 unit = 4 m). Here it is placed on a real map around New Cairo
   so the zones, pipes, pumps and reservoir sit on streets and buildings. The positions are sample data, not a survey. */
import { useEffect, useState } from "react";
import { BAD, colorOf, type Metric } from "./mapcolor";
import { NODES, PIPES, ZONES, type Pipe, type Snapshot, type ZoneId } from "./network";
import { ZONE_RINGS, type Ring } from "./geoZones";

export type LL = [number, number];
const M_LAT = 111000, M_LNG = 111320 * Math.cos((30.03 * Math.PI) / 180);
const shift = (p: LL, east: number, north: number): LL => [p[0] + north / M_LAT, p[1] + east / M_LNG];

/* ---------- zones: each one sits on a real neighbourhood (see geoZones.ts) ---------- */
const area = (r: Ring) => Math.abs(r.reduce((a, p, i) => { const q = r[(i + 1) % r.length]; return a + (p[1] * q[0] - q[1] * p[0]); }, 0)) / 2;
const centroidOf = (r: Ring): LL => {
  let A = 0, cx = 0, cy = 0;
  r.forEach((p, i) => { const q = r[(i + 1) % r.length], f = p[1] * q[0] - q[1] * p[0]; A += f; cx += (p[1] + q[1]) * f; cy += (p[0] + q[0]) * f; });
  return A ? [cy / (3 * A), cx / (3 * A)] : r[0];
};
const inRing = (pt: LL, r: Ring) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { if ((r[i][0] > pt[0]) !== (r[j][0] > pt[0]) && pt[1] < ((r[j][1] - r[i][1]) * (pt[0] - r[i][0])) / (r[j][0] - r[i][0]) + r[i][1]) c = !c; } return c; };

export const ZONE_AREA: Record<ZoneId, { rings: LL[][]; centre: LL; top: LL; east: LL; west: LL }> = Object.fromEntries(
  ZONES.map((z) => {
    const rings = ZONE_RINGS[z.id] as Ring[];
    const big = rings.reduce((a, r) => (area(r) > area(a) ? r : a), rings[0]);
    const c = centroidOf(big);
    const pts = rings.flat();
    return [z.id, { rings, centre: c, top: [Math.max(...pts.map((p) => p[0])), c[1]] as LL, east: [c[0], Math.max(...pts.map((p) => p[1]))] as LL, west: [c[0], Math.min(...pts.map((p) => p[1]))] as LL }];
  }),
) as Record<ZoneId, { rings: LL[][]; centre: LL; top: LL; east: LL; west: LL }>;

/* ---------- where every node of the network sits on the map ---------- */
const NODE_LL: Record<string, LL> = {};
{
  for (const z of ZONES) {
    const rings = ZONE_AREA[z.id].rings as Ring[], ns = NODES.filter((n) => n.zone === z.id), c = ZONE_AREA[z.id].centre;
    if (rings.length > 1) { ns.forEach((n, i) => { const r = rings[i % rings.length], rc = centroidOf(r); NODE_LL[n.id] = shift(rc, ((i * 37) % 5 - 2) * 25, ((i * 53) % 5 - 2) * 25); }); continue; }
    // one neighbourhood: the zone's drawing is scaled to fill about 60% of it and pulled inside its edge
    const all = rings[0], la = all.map((p) => p[0]), lo = all.map((p) => p[1]);
    const tw = (Math.max(...lo) - Math.min(...lo)) * M_LNG, th = (Math.max(...la) - Math.min(...la)) * M_LAT;
    const xs = ns.map((n) => n.x), ys = ns.map((n) => n.y), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const cw = Math.max(...xs) - Math.min(...xs) || 1, ch = Math.max(...ys) - Math.min(...ys) || 1;
    const k = Math.min((tw * 0.6) / cw, (th * 0.6) / ch);
    for (const n of ns) {
      let p = shift(c, (n.x - cx) * k, -(n.y - cy) * k);
      for (let i = 0; i < 12 && !inRing(p, all); i++) p = [p[0] + (c[0] - p[0]) * 0.25, p[1] + (c[1] - p[1]) * 0.25];
      NODE_LL[n.id] = p;
    }
  }
  // everything on the trunk sits in one short line along the road between the two columns of blocks (the reservoir is the real Banafseg water tower)
  const R = 31.4684;
  NODE_LL.wtp = [30.0288, R];
  NODE_LL.ps1 = [30.0338, R];
  NODE_LL.j0 = [30.0452, R];
  NODE_LL.j1 = [30.0482, R];
  NODE_LL.res = [30.0518, 31.4683];
  NODE_LL.ps2 = [30.0398, 31.4674];
  NODE_LL.s0 = shift(NODE_LL.e1, -250, -120);
}
export const nodeLL = (id: string): LL => NODE_LL[id];
export const pipeLine = (p: Pipe): LL[] => [nodeLL(p.from), nodeLL(p.to)];
export const pipeMid = (p: Pipe, t = 0.5): LL => { const a = nodeLL(p.from), b = nodeLL(p.to); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
export const ALL_LL: LL[] = [...Object.values(NODE_LL), ...ZONES.flatMap((z) => ZONE_AREA[z.id].rings.flat())];

/* ---------- basemaps ---------- */
export type Basemap = "Streets" | "Satellite";
export const BASEMAPS = ["Streets", "Satellite"] as const;
const ESRI = "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, USGS, OpenStreetMap contributors";
/** the street map keeps its own yellow and orange roads in both themes (dark mode recolours the land in geoDark.ts) */
export function tileSpec(base: Basemap, _theme: "light" | "dark") {
  const E = "https://server.arcgisonline.com/ArcGIS/rest/services";
  if (base === "Satellite") return { url: `${E}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, ref: `${E}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, native: 18, attr: "Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics" };
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
