// Road network, gates and parking lots laid on the traced master plan (same coordinate space as planGeometry.ts). All of it is sample data.
import { ZONES, type Pt, type Zone, type ZoneId } from "./data";

export type RoadKind = "commute" | "leisure" | "mixed";
export interface Road { id: string; name: string; kind: RoadKind; pts: Pt[]; /** how busy the road is compared with the others */ k: number }

export const ROADS: Road[] = [
  { id: "west", name: "West Avenue", kind: "commute", k: 1, pts: [[300, 610], [345, 640], [405, 695], [455, 745], [500, 766]] },
  { id: "south", name: "South Link", kind: "mixed", k: 0.85, pts: [[500, 766], [555, 758], [612, 772], [690, 742], [775, 708]] },
  { id: "east", name: "East Avenue", kind: "commute", k: 0.95, pts: [[470, 252], [462, 300], [470, 350], [490, 430], [512, 520], [528, 590], [570, 606]] },
  { id: "north", name: "North Gate Road", kind: "commute", k: 0.9, pts: [[470, 203], [470, 252], [440, 288], [380, 294], [326, 297]] },
  { id: "hospital", name: "Hospital Link", kind: "mixed", k: 0.7, pts: [[470, 252], [520, 268], [570, 285], [610, 290], [660, 285]] },
  { id: "innov", name: "Innovation Boulevard", kind: "mixed", k: 0.6, pts: [[570, 606], [650, 575], [760, 545], [880, 540], [1000, 552], [1090, 590], [1098, 668]] },
  { id: "ring", name: "South Road", kind: "leisure", k: 0.55, pts: [[775, 708], [880, 693], [1000, 684], [1098, 668]] },
  { id: "villa", name: "Villa Loop", kind: "leisure", k: 0.5, pts: [[345, 640], [360, 590], [380, 540], [420, 505], [470, 500]] },
  { id: "club", name: "Clubhouse Road", kind: "leisure", k: 0.65, pts: [[500, 766], [520, 700], [545, 650], [560, 620], [570, 606]] },
];

export interface Gate { id: string; name: string; at: Pt; road: string }
export const GATES: Gate[] = [
  { id: "A", name: "West gate", at: [300, 610], road: "west" },
  { id: "B", name: "South-east gate", at: [775, 708], road: "south" },
  { id: "C", name: "North gate", at: [470, 203], road: "north" },
  { id: "D", name: "East gate", at: [1098, 668], road: "ring" },
];

export type LotKind = "retail" | "school" | "care" | "home" | "hotel" | "leisure" | "work";
export interface Lot { id: string; name: string; kind: LotKind; at: Pt; cap: number; gate: string; route: Pt[]; zone: ZoneId }
export const LOTS: Lot[] = [
  { id: "p1", name: "Commercial Plaza", kind: "retail", at: [420, 790], cap: 480, gate: "A", zone: "commercial", route: [[300, 610], [345, 640], [405, 695], [430, 740], [420, 790]] },
  { id: "p2", name: "Hotel Forecourt", kind: "hotel", at: [446, 498], cap: 90, gate: "A", zone: "hotel", route: [[300, 610], [345, 640], [360, 590], [380, 540], [420, 505], [446, 498]] },
  { id: "p3", name: "Hospital", kind: "care", at: [655, 272], cap: 120, gate: "C", zone: "hospital", route: [[470, 203], [470, 252], [520, 268], [570, 285], [655, 272]] },
  { id: "p4", name: "School", kind: "school", at: [372, 304], cap: 140, gate: "C", zone: "school", route: [[470, 203], [470, 252], [440, 288], [380, 294], [372, 304]] },
  { id: "p5", name: "Golf Clubhouse", kind: "leisure", at: [548, 648], cap: 150, gate: "B", zone: "golf", route: [[775, 708], [690, 742], [612, 772], [555, 758], [500, 766], [520, 700], [548, 648]] },
  { id: "p6", name: "Innovation Hub", kind: "work", at: [640, 588], cap: 200, gate: "D", zone: "future", route: [[1098, 668], [1090, 590], [1000, 552], [880, 540], [760, 545], [650, 575], [640, 588]] },
  { id: "p7", name: "East Residences", kind: "home", at: [505, 470], cap: 220, gate: "C", zone: "apartments", route: [[470, 203], [470, 252], [462, 300], [470, 350], [490, 430], [505, 470]] },
  { id: "p8", name: "Villa Gate West", kind: "home", at: [330, 590], cap: 60, gate: "A", zone: "villas", route: [[300, 610], [330, 590]] },
];

/** length of a polyline in map units */
export const lengthOf = (pts: Pt[]) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

/** the point a given fraction (0 to 1) along a polyline, with the heading there */
export function pointAt(pts: Pt[], f: number, len = lengthOf(pts)): { x: number; y: number; a: number } {
  let d = Math.max(0, Math.min(1, f)) * len;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= seg || i === pts.length - 1) {
      const t = seg ? Math.min(1, d / seg) : 0;
      return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, a: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]) };
    }
    d -= seg;
  }
  return { x: pts[0][0], y: pts[0][1], a: 0 };
}

export const asPath = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

/** the box around a zone, as a viewBox [x, y, w, h] with room around it and the map's 1.34 shape */
export function zoneBox(z: Zone, pad = 70): [number, number, number, number] {
  const xs = z.polys.flat().map((p) => p[0]), ys = z.polys.flat().map((p) => p[1]);
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const ar = 1100 / 820;
  let w = x1 - x0, h = y1 - y0;
  if (w / h < ar) w = h * ar; else h = w / ar;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return [cx - w / 2, cy - h / 2, w, h];
}
export const FULL_BOX: [number, number, number, number] = [150, 140, 1100, 820];
export const zoneById = (id: ZoneId) => ZONES.find((z) => z.id === id) as Zone;
