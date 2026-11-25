/* Small geometry helpers shared by the two map tabs (Mobility and Surveillance). No dependencies. */

export interface Pt { x: number; y: number }
export interface PathPt extends Pt { a: number }
export interface MapPath {
  total: number;
  /** SVG path of the whole line */
  d: string;
  /** point and heading (degrees) at s in 0..1 along the line */
  at: (s: number) => PathPt;
  /** SVG path of the part between s0 and s1 */
  slice: (s0: number, s1: number) => string;
  /** s of the sampled point closest to (x, y) */
  nearest: (x: number, y: number) => number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** a smooth line through the control points (Catmull-Rom), sampled finely so buses and cars can ride on it */
export function makePath(ctrl: [number, number][], per = 24): MapPath {
  const P = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const pts: Pt[] = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  const last = ctrl[ctrl.length - 1];
  pts.push({ x: last[0], y: last[1] });
  const len: number[] = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = len[len.length - 1];

  const idx = (dist: number) => {
    let lo = 0, hi = len.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (len[mid] <= dist) lo = mid; else hi = mid; }
    return lo;
  };
  const at = (s: number): PathPt => {
    const dist = Math.max(0, Math.min(1, s)) * total;
    const i = Math.min(idx(dist), pts.length - 2);
    const seg = len[i + 1] - len[i] || 1;
    const u = (dist - len[i]) / seg;
    const a = pts[i], b = pts[i + 1];
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, a: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
  };
  const slice = (s0: number, s1: number) => {
    const a = at(s0), b = at(s1);
    const i0 = idx(s0 * total) + 1, i1 = idx(s1 * total);
    let d = `M${r1(a.x)} ${r1(a.y)}`;
    for (let i = i0; i <= i1; i++) d += `L${r1(pts[i].x)} ${r1(pts[i].y)}`;
    return `${d}L${r1(b.x)} ${r1(b.y)}`;
  };
  const nearest = (x: number, y: number) => {
    let best = 0, bd = Infinity;
    pts.forEach((p, i) => { const dd = (p.x - x) ** 2 + (p.y - y) ** 2; if (dd < bd) { bd = dd; best = i; } });
    return len[best] / total;
  };
  const d = pts.map((p, i) => `${i ? "L" : "M"}${r1(p.x)} ${r1(p.y)}`).join("");
  return { total, d, at, slice, nearest };
}

/** point-in-polygon test (used to find which zone a bus station is in) */
export function inside(x: number, y: number, p: [number, number][]) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** out-and-back position: u grows forever, the result bounces between 0 and 1 */
export const bounce = (u: number) => { const m = ((u % 2) + 2) % 2; return m < 1 ? m : 2 - m; };
