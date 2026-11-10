/** angles in degrees, SVG convention (0 = east, 90 = south, clockwise) */
export const rad = (d: number) => (d * Math.PI) / 180;
export const pt = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
const f = (n: number) => Math.round(n * 100) / 100;

/** a ring sector between radii r0 < r1 and angles a0 < a1 */
export function annular(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const [x0, y0] = pt(cx, cy, r1, a0);
  const [x1, y1] = pt(cx, cy, r1, a1);
  const [x2, y2] = pt(cx, cy, r0, a1);
  const [x3, y3] = pt(cx, cy, r0, a0);
  const big = a1 - a0 > 180 ? 1 : 0;
  return `M${f(x0)} ${f(y0)}A${r1} ${r1} 0 ${big} 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${r0} ${r0} 0 ${big} 0 ${f(x3)} ${f(y3)}Z`;
}

/** compass angle (0 = north, clockwise) to the SVG angle */
export const compass = (deg: number) => deg - 90;
