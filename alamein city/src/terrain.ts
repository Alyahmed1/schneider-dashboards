/* Paints a satellite-style picture of the coast (sea depth, surf, beach, desert, scrub, salt lakes) once, in the browser, with plain canvas.
   No image file, no map service, works offline. It is decoration only: the road geometry lives in road.ts. */

const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed + 1, 1103515245);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const vnoise = (x: number, y: number, seed: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number, seed: number, oct = 4) => {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, seed + i * 17); f *= 2; a *= 0.5; }
  return s / 0.9375;
};
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
type C3 = [number, number, number];
const mix = (a: C3, b: C3, t: number): C3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const SHALLOW: C3 = [96, 206, 206], MID: C3 = [30, 128, 176], DEEP: C3 = [6, 36, 86];
const WET: C3 = [186, 168, 128], BEACH: C3 = [238, 226, 192];
const D_LO: C3 = [226, 208, 172], D_MID: C3 = [214, 190, 148], D_HI: C3 = [196, 168, 126];
const SCRUB: C3 = [122, 136, 82], SALT: C3 = [244, 240, 230], LAKE: C3 = [96, 164, 162], LAKE_DEEP: C3 = [56, 120, 132];

export interface Lake { cx: number; cy: number; rx: number; ry: number }

/** W x H are map units; the picture is drawn at `scale` times that and stretched back by the browser */
export function paintTerrain(W: number, H: number, coastY: Float32Array, lakes: Lake[], scale = 0.8): Promise<Blob> {
  const cw = Math.round(W * scale), ch = Math.round(H * scale);
  const cv = document.createElement("canvas");
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(cw, ch);
  const px = img.data;
  const inv = 1 / scale;

  const row = (py: number) => {
    const my = py * inv;
    for (let ix = 0; ix < cw; ix++) {
      const mx = ix * inv;
      const cy = coastY[Math.min(coastY.length - 1, Math.max(0, Math.round(mx)))] + Math.sin(mx * 0.021 + my * 0.03) * 2.2 + (fbm(mx * 0.05, my * 0.05, 5, 2) - 0.5) * 8;
      const d = my - cy;
      let c: C3;
      if (d < 0) {
        const depth = -d;
        const t = clamp01(depth / 190);
        c = t < 0.4 ? mix(SHALLOW, MID, t / 0.4) : mix(MID, DEEP, (t - 0.4) / 0.6);
        // long, soft swell streaks and glints
        const sw = fbm(mx * 0.022, my * 0.11 + mx * 0.01, 3, 3);
        const k = 0.86 + sw * 0.3;
        c = [c[0] * k, c[1] * k, c[2] * k];
        const glint = sstep(0.7, 0.9, fbm(mx * 0.08, my * 0.3, 9, 2)) * (1 - t) * 70;
        c = [c[0] + glint, c[1] + glint, c[2] + glint];
        // shallow banks near the shore turn greener
        c = mix(c, [70, 196, 176], sstep(34, 0, depth) * 0.35);
        // surf foam
        const foam = sstep(15, 1, depth + (fbm(mx * 0.09, my * 0.09, 12, 3) - 0.5) * 22);
        c = mix(c, [250, 252, 252], foam * 0.92);
      } else {
        const bw = 24 + fbm(mx * 0.03, 3, 2, 2) * 12;
        if (d < bw) {
          c = mix(BEACH, D_LO, sstep(bw * 0.55, bw, d));
          c = mix(WET, c, sstep(0, 7, d));
        } else {
          const n = fbm(mx * 0.007, my * 0.012, 31, 4);
          c = n < 0.5 ? mix(D_LO, D_MID, n / 0.5) : mix(D_MID, D_HI, (n - 0.5) / 0.5);
          // soft dune ridges
          const r = Math.abs(vnoise(mx * 0.012 + my * 0.006, my * 0.045 - mx * 0.01, 21) - 0.5) * 2;
          const fine = 0.94 + fbm(mx * 0.06, my * 0.06, 61, 3) * 0.12 + (hash(Math.floor(mx * 0.5), Math.floor(my * 0.5), 3) - 0.5) * 0.04;
          const ridge = (0.95 + r * 0.1) * fine;
          c = [c[0] * ridge, c[1] * ridge, c[2] * ridge];
          // low scrub along the coast
          const veg = fbm(mx * 0.03, my * 0.03, 41, 4);
          const near = clamp01(1 - (d - bw) / 220);
          c = mix(c, SCRUB, clamp01((veg - 0.52) * 3.2) * near * 0.85);
          // salt lakes with a white rim
          for (const L of lakes) {
            const dx = (mx - L.cx) / L.rx, dy = (my - L.cy) / L.ry;
            const e = dx * dx + dy * dy + (fbm(mx * 0.03, my * 0.03, 51, 3) - 0.5) * 0.55;
            if (e < 1.18) {
              const wet = sstep(1.0, 0.7, e);
              c = mix(c, SALT, sstep(1.18, 0.98, e) * 0.9);
              c = mix(c, mix(LAKE, LAKE_DEEP, sstep(0.7, 0.1, e)), wet);
            }
          }
        }
      }
      const g = (hash(ix, py, 77) - 0.5) * 7;
      const o = (py * cw + ix) * 4;
      px[o] = Math.max(0, Math.min(255, c[0] + g));
      px[o + 1] = Math.max(0, Math.min(255, c[1] + g));
      px[o + 2] = Math.max(0, Math.min(255, c[2] + g));
      px[o + 3] = 255;
    }
  };

  return new Promise((resolve, reject) => {
    let y = 0;
    const step = () => {
      const end = Math.min(ch, y + 36);
      for (; y < end; y++) row(y);
      if (y < ch) { window.setTimeout(step, 0); return; }
      ctx.putImageData(img, 0, 0);
      cv.toBlob((b) => (b ? resolve(b) : reject(new Error("terrain not painted"))), "image/jpeg", 0.9);
    };
    step();
  });
}
