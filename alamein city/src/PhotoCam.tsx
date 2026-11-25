import { useEffect, useRef } from "react";
import type { Cam, Scenario } from "./cams";
import { PHOTOS, type Lane, type PhotoCfg } from "./photos";
import { makePath, type MapPath } from "./geo";
import { rng } from "./live";

/* A real photo that behaves like a live camera: the picture breathes a little, cloud shadows pass over it,
   cars and people are placed on it in perspective (they follow its lanes and paths), rain falls on the plaza,
   and the AI layer boxes what moves. Vehicles and people are drawn by code, the picture is yours. */
const imgs = new Map<string, HTMLImageElement>();
function photo(src: string) {
  let i = imgs.get(src);
  if (!i) { i = new Image(); i.src = src; imgs.set(src, i); }
  return i;
}
const DEBUG = typeof location !== "undefined" && location.search.includes("cambug");

interface V { id: number; g: number; lane: number; lanePos: number; z: number; v: number; vFree: number; kind: "car" | "truck" | "bus"; color: string; stat: boolean; wrong?: boolean; tag?: { text: string; color: string }; hazard?: boolean }
interface Walker { path: [number, number][]; u: number; speed: number; umbrella: boolean; coat: string; hiVis: boolean }
interface Drop { x: number; y: number; l: number; s: number }
interface Ripple { x: number; y: number; r: number }
export interface PhotoProps { cam: Cam; sc: Scenario; night: boolean; overlay: boolean; compact: boolean; faultMins: number }

const COLORS = ["#f2f3f5", "#dfe3e8", "#2c3640", "#b8b9bd", "#c0392b", "#e8b923", "#2d6aa3", "#8a95a1", "#1d242c", "#e9e6dc"];
const ZMAX = 260;

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (h: string, k: number) => { const [r, g, b] = hex(h); const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * k))); return `rgb(${f(r)},${f(g)},${f(b)})`; };

/* ---------- lane geometry ---------- */
const pathCache = new Map<Lane, MapPath>();
function groupLanes(cfg: PhotoCfg, g: number) { return cfg.lanes!.filter((l) => l.g === g); }
/** point and car width of a lane at t (t = z0 / z: 0 at the horizon, 1 at the front of the picture, more than 1 is outside the picture) */
function lanePoint(cfg: PhotoCfg, L: Lane, t: number) {
  if (L.pts) {
    let p = pathCache.get(L); if (!p) { p = makePath(L.pts, 12); pathCache.set(L, p); }
    if (t <= 1) { const q = p.at(t); return { x: q.x, y: q.y }; }
    const a = p.at(1), b = p.at(0.97);
    return { x: a.x + ((a.x - b.x) / 0.03) * (t - 1), y: a.y + ((a.y - b.y) / 0.03) * (t - 1) };
  }
  const [vx, vy] = cfg.vp!;
  return { x: vx + t * (L.near[0] - vx), y: vy + t * (L.near[1] - vy) };
}
/** a position between lanes of the same carriageway (lanePos 1.5 is half way between lane 1 and lane 2), may go beyond the first and last lane */
function atLane(cfg: PhotoCfg, g: number, lanePos: number, z: number) {
  const L = groupLanes(cfg, g), t = cfg.z0! / z;
  if (L.length === 1 || L[0].pts) { const p = lanePoint(cfg, L[0], t); return { ...p, t, wPx: L[0].w * t }; }
  const i = Math.max(0, Math.min(L.length - 2, Math.floor(lanePos))), f = lanePos - i;
  const near: [number, number] = [L[i].near[0] + (L[i + 1].near[0] - L[i].near[0]) * f, L[i].near[1] + (L[i + 1].near[1] - L[i].near[1]) * f];
  const p = lanePoint(cfg, { ...L[i], near }, t);
  return { ...p, t, wPx: (L[i].w + (L[i + 1].w - L[i].w) * f) * t };
}

/* ---------- sprites ---------- */
function drawVehicle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, v: V, away: boolean, night: boolean, time: number) {
  const kind = v.kind, ww = kind === "car" ? w : w * 1.28;
  const h = kind === "car" ? ww * 0.66 : kind === "truck" ? ww * 1.5 : ww * 1.18;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,.34)"; ctx.beginPath(); ctx.ellipse(0, 0, ww * 0.62, ww * 0.1, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#101214"; ctx.fillRect(-ww * 0.47, -h * 0.2, ww * 0.15, h * 0.2); ctx.fillRect(ww * 0.32, -h * 0.2, ww * 0.15, h * 0.2);
  const bodyH = kind === "car" ? h * 0.56 : h * 0.86, top = -h * 0.12 - bodyH;
  const g = ctx.createLinearGradient(0, top, 0, -h * 0.12); g.addColorStop(0, shade(v.color, 1.18)); g.addColorStop(0.55, v.color); g.addColorStop(1, shade(v.color, 0.62));
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-ww / 2, top, ww, bodyH, ww * 0.07); ctx.fill();
  if (kind === "car") {
    const cabTop = top - h * 0.42;
    ctx.fillStyle = shade(v.color, 0.9); ctx.beginPath(); ctx.moveTo(-ww * 0.36, top + 1); ctx.lineTo(-ww * 0.28, cabTop); ctx.lineTo(ww * 0.28, cabTop); ctx.lineTo(ww * 0.36, top + 1); ctx.closePath(); ctx.fill();
    const gl = ctx.createLinearGradient(0, cabTop, 0, top); gl.addColorStop(0, "#2a3a4a"); gl.addColorStop(1, "#0f1822");
    ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(-ww * 0.31, top - 1); ctx.lineTo(-ww * 0.245, cabTop + h * 0.05); ctx.lineTo(ww * 0.245, cabTop + h * 0.05); ctx.lineTo(ww * 0.31, top - 1); ctx.closePath(); ctx.fill();
  } else if (kind === "bus") {
    ctx.fillStyle = "#14202c"; ctx.fillRect(-ww * 0.42, top + bodyH * 0.12, ww * 0.84, bodyH * 0.3);
  } else { ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(-ww / 2, top + bodyH * 0.55, ww, bodyH * 0.08); }
  const ly = -h * 0.12 - bodyH * 0.22, lw = ww * 0.17, lh = Math.max(1.2, h * 0.07);
  if (away) {
    const braking = v.v < 4 || v.stat;
    ctx.fillStyle = braking ? "#ff3b30" : "#a8231b"; ctx.fillRect(-ww * 0.45, ly, lw, lh); ctx.fillRect(ww * 0.45 - lw, ly, lw, lh);
    if (night || braking) { ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,40,30,.35)"; ctx.beginPath(); ctx.arc(-ww * 0.38, ly, ww * 0.2, 0, 7); ctx.arc(ww * 0.38, ly, ww * 0.2, 0, 7); ctx.fill(); ctx.globalCompositeOperation = "source-over"; }
  } else {
    ctx.fillStyle = "#fff6cf"; ctx.fillRect(-ww * 0.45, ly, lw, lh); ctx.fillRect(ww * 0.45 - lw, ly, lw, lh);
    if (night) { ctx.globalCompositeOperation = "lighter"; const gg = ctx.createRadialGradient(0, ly, 0, 0, ly, ww * 0.9); gg.addColorStop(0, "rgba(255,244,200,.55)"); gg.addColorStop(1, "rgba(255,244,200,0)"); ctx.fillStyle = gg; ctx.fillRect(-ww, ly - ww * 0.6, ww * 2, ww * 1.2); ctx.globalCompositeOperation = "source-over"; }
  }
  if (v.hazard && Math.floor(time * 1.7) % 2 === 0) {
    ctx.fillStyle = "#ffa21a"; ctx.fillRect(-ww * 0.5, ly - lh, lw * 0.8, lh * 1.6); ctx.fillRect(ww * 0.5 - lw * 0.8, ly - lh, lw * 0.8, lh * 1.6);
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,160,20,.45)"; ctx.beginPath(); ctx.arc(-ww * 0.46, ly, ww * 0.22, 0, 7); ctx.arc(ww * 0.46, ly, ww * 0.22, 0, 7); ctx.fill(); ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
  return { w: ww, h: h * (kind === "car" ? 1.55 : 1) };
}

function drawPerson(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, coat: string, umbrella: boolean, time: number, phase: number, hiVis = false) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(0, 0, h * 0.22, h * 0.05, 0, 0, 7); ctx.fill();
  const sw = Math.sin(time * 6 + phase) * h * 0.09;
  ctx.strokeStyle = "#1c2230"; ctx.lineWidth = Math.max(1, h * 0.07); ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-h * 0.04, -h * 0.42); ctx.lineTo(-h * 0.04 + sw, 0); ctx.moveTo(h * 0.04, -h * 0.42); ctx.lineTo(h * 0.04 - sw, 0); ctx.stroke();
  ctx.fillStyle = coat; ctx.beginPath(); ctx.roundRect(-h * 0.13, -h * 0.82, h * 0.26, h * 0.42, h * 0.07); ctx.fill();
  if (hiVis) { ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(-h * 0.13, -h * 0.66, h * 0.26, h * 0.04); }
  ctx.fillStyle = hiVis ? "#f5d90a" : "#d9b08c"; ctx.beginPath(); ctx.arc(0, -h * 0.9, h * 0.075, 0, 7); ctx.fill();
  if (umbrella) { ctx.fillStyle = "#10141c"; ctx.beginPath(); ctx.ellipse(0, -h * 0.98, h * 0.28, h * 0.1, 0, Math.PI, 0); ctx.fill(); }
  ctx.restore();
}

export default function PhotoCam({ cam, sc, night, overlay, compact, faultMins }: PhotoProps) {
  const host = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const props = useRef({ cam, sc, night, overlay, compact, faultMins });
  props.current = { cam, sc, night, overlay, compact, faultMins };
  const world = useRef<{ key: string; vs: V[]; walkers: Walker[]; drops: Drop[]; ripples: Ripple[]; ped: number } | null>(null);

  const build = (cfg: PhotoCfg, cam: Cam, sc: Scenario) => {
    const key = `${cam.id}|${JSON.stringify(sc)}`;
    const r = rng(cam.n * 71 + 5), vs: V[] = []; let id = 1;
    if (cfg.kind === "road") {
      const groups = [...new Set(cfg.lanes!.map((l) => l.g))];
      for (const g of groups) {
        const L = groupLanes(cfg, g), dir = L[0].dir;
        if (L[0].pts) {
          // a single curved lane
          const n = 5; for (let i = 0; i < n; i++) vs.push({ id: id++, g, lane: 0, lanePos: 0, z: 14 + ((i + r() * 0.6) * (ZMAX - 20)) / n, v: 20, vFree: 19 + r() * 5, kind: r() < 0.15 ? "truck" : "car", color: COLORS[Math.floor(r() * COLORS.length)], stat: false });
          continue;
        }
        L.forEach((_, lane) => {
          const closed = sc.wrongWay && dir === 1 && lane === 0;
          let n = lane === L.length - 1 ? 4 : 3; if (sc.queue && dir === 1) n = 6; if (closed) n = 0;
          const base = (dir === 1 ? 1 : 0.95) * (lane === 0 ? 28 : lane === 1 ? 25 : 22) * (sc.queue && dir === 1 ? 0.45 : 1);
          for (let i = 0; i < n; i++) {
            const roll = r(), kind: V["kind"] = lane === L.length - 1 && roll < 0.28 ? "truck" : lane === L.length - 1 && roll < 0.34 ? "bus" : "car";
            vs.push({ id: id++, g, lane, lanePos: lane, z: 14 + ((i + r() * 0.6) * (ZMAX - 20)) / n, v: base, vFree: kind === "car" ? base : base * 0.8, kind, color: kind === "truck" ? "#e8e6df" : kind === "bus" ? "#2a64a8" : COLORS[Math.floor(r() * COLORS.length)], stat: false });
          }
        });
      }
      const g1 = cfg.lanes!.find((l) => l.dir === 1)?.g ?? 0;
      if (sc.laneStop) {
        for (const v of vs) if (v.g === g1 && v.lane === 1 && v.z > 20 && v.z < 70) v.z += 90;
        vs.push({ id: id++, g: g1, lane: 1, lanePos: 1, z: 34, v: 0, vFree: 0, kind: "car", color: "#e8b923", stat: true, hazard: true, tag: { text: "STOPPED VEHICLE", color: "#ffb020" } });
      }
      if (sc.debris) vs.push({ id: id++, g: 0, lane: 2, lanePos: 2, z: 46, v: 0, vFree: 0, kind: "car", color: "#6b6f75", stat: true, tag: { text: "DEBRIS", color: "#ffb020" } });
      if (sc.wrongWay) vs.push({ id: id++, g: g1, lane: 0, lanePos: 0, z: 200, v: 21, vFree: 21, kind: "car", color: "#f2f3f5", stat: false, wrong: true, tag: { text: "WRONG WAY · 98%", color: "#ff3b3b" } });
    }
    const walkers: Walker[] = (cfg.walkers ?? []).map((path, i) => ({ path, u: r(), speed: 0.022 + r() * 0.01, umbrella: !!cfg.rain && i % 2 === 0, coat: cfg.rain ? (i % 2 ? "#2b4a6e" : "#3b3f48") : "#ff7a00", hiVis: !cfg.rain }));
    const drops: Drop[] = Array.from({ length: cfg.rain ? 420 : 0 }, () => ({ x: r() * cfg.w, y: r() * cfg.h, l: 7 + r() * 9, s: 380 + r() * 260 }));
    world.current = { key, vs, walkers, drops, ripples: [], ped: 1 };
  };

  useEffect(() => {
    const canvas = cv.current!, hostEl = host.current!, ctx = canvas.getContext("2d")!;
    let raf = 0, alive = true, last = performance.now(), time = 0, W = 0, H = 0;
    const resize = () => { const p = props.current.compact ? 1 : Math.min(devicePixelRatio || 1, 1.5); W = Math.round((hostEl.clientWidth || 300) * p); H = Math.round((hostEl.clientHeight || 200) * p); canvas.width = W; canvas.height = H; };
    const ro = new ResizeObserver(resize); ro.observe(hostEl); resize();

    const loop = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (now - last < 1000 / 24) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now; time += dt;
      const { cam: c, sc: s, night: nt, overlay: ov, compact: cp } = props.current;
      const cfg = PHOTOS[c.photo!]; if (!cfg) return;
      if (!world.current || world.current.key !== `${c.id}|${JSON.stringify(s)}`) build(cfg, c, s);
      const wd = world.current!;
      const img = photo(cfg.src);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#05080b"; ctx.fillRect(0, 0, W, H);
      if (!img.complete || !img.naturalWidth) return;

      // cover-fit with a slow handheld drift
      const base = Math.max(W / cfg.w, H / cfg.h), breathe = 1 + Math.sin(time * 0.35) * 0.004 + 0.012;
      const sc2 = base * breathe;
      const ox = (W - cfg.w * sc2) * cfg.fx + Math.sin(time * 0.9) * 0.7 + Math.sin(time * 2.3) * 0.25;
      const oy = (H - cfg.h * sc2) * cfg.fy + Math.cos(time * 0.7) * 0.6;
      ctx.setTransform(sc2, 0, 0, sc2, ox, oy);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, cfg.w, cfg.h);

      // a cloud shadow drifting across the scene (day)
      if (!nt) {
        const gx = ((time * 16) % (cfg.w + 260)) - 200, g = ctx.createLinearGradient(gx, 0, gx + 200, 0);
        g.addColorStop(0, "rgba(10,20,40,0)"); g.addColorStop(0.5, `rgba(10,20,40,${cfg.kind === "plaza" ? 0.1 : 0.15})`); g.addColorStop(1, "rgba(10,20,40,0)");
        ctx.fillStyle = g; ctx.fillRect(0, cfg.kind === "road" ? cfg.vp![1] : 150, cfg.w, cfg.h);
      } else { ctx.fillStyle = "rgba(5,10,32,.66)"; ctx.fillRect(0, 0, cfg.w, cfg.h); }

      // blinking amber beacons on cones and barriers
      if (cfg.beacons) {
        ctx.globalCompositeOperation = "lighter";
        cfg.beacons.forEach(([bx, by], i) => { if (Math.floor(time * 1.8 + i * 0.5) % 2 === 0) { const g = ctx.createRadialGradient(bx, by, 0, bx, by, 9); g.addColorStop(0, "rgba(255,170,30,.95)"); g.addColorStop(1, "rgba(255,150,20,0)"); ctx.fillStyle = g; ctx.fillRect(bx - 9, by - 9, 18, 18); } });
        ctx.globalCompositeOperation = "source-over";
      }

      const boxes: { x0: number; y0: number; x1: number; y1: number; text: string; color: string; flag: boolean }[] = [];

      if (cfg.kind === "road") {
        const vs = wd.vs, groups = [...new Set(cfg.lanes!.map((l) => l.g))];
        for (const g of groups) {
          const L = groupLanes(cfg, g), dir = L[0].dir;
          for (let lane = 0; lane < L.length; lane++) {
            const arr = vs.filter((v) => v.g === g && v.lane === lane && !v.wrong).sort((a, b) => (b.z - a.z) * dir);
            for (let i = 0; i < arr.length; i++) {
              const v = arr[i]; if (v.stat) continue;
              const lead = arr[i - 1];
              let vt = v.vFree; if (s.pedestrian && dir === 1 && v.z < 100) vt = Math.min(vt, 6);
              if (lead) {
                const gap = (lead.z - v.z) * dir - (v.kind === "car" ? 5 : 11);
                if ((lead.stat || lead.v < v.vFree * 0.5) && gap < 40 && L.length > 1) {
                  for (const q of [lane + 1, lane - 1].filter((n) => n >= 0 && n < L.length && !(s.wrongWay && dir === 1 && n === 0))) if (!vs.some((o) => o !== v && o.g === g && o.lane === q && Math.abs(o.z - v.z) < 22)) { v.lane = q; break; }
                }
                vt = Math.min(vt, Math.max(0, gap - 3) * 0.8 + lead.v * 0.5);
              }
              v.v += Math.max(-9 * dt, Math.min(3 * dt, vt - v.v)); if (v.v < 0) v.v = 0;
              v.z += v.v * dt * dir;
            }
          }
        }
        for (const v of vs) {
          const dir = cfg.lanes!.find((l) => l.g === v.g)!.dir;
          if (v.wrong) { v.z -= v.v * dt * dir; if (v.z < 5) v.z = ZMAX - 30; continue; }
          if (v.stat) continue;
          v.lanePos += Math.sign(v.lane - v.lanePos) * Math.min(Math.abs(v.lane - v.lanePos), 1.6 * dt);
          if (dir === 1 && v.z > ZMAX) { if (!vs.some((o) => o !== v && o.g === v.g && o.lane === v.lane && o.z < 40)) { v.z = 6; v.v = v.vFree; } else v.z = ZMAX; }
          if (dir === -1 && v.z < 5) { if (!vs.some((o) => o !== v && o.g === v.g && o.lane === v.lane && o.z > ZMAX - 40)) { v.z = ZMAX; v.v = v.vFree; } else v.z = 5; }
        }
        // draw far to near, clipped to its carriageway
        for (const g of groups) {
          ctx.save(); ctx.beginPath(); cfg.clip![g].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
          const dir = cfg.lanes!.find((l) => l.g === g)!.dir;
          for (const v of vs.filter((q) => q.g === g).sort((a, b) => b.z - a.z)) {
            const p = atLane(cfg, g, v.lanePos, v.z); if (p.t > 1.6 || p.wPx < 1.4) continue;
            const away = v.wrong ? dir !== 1 : dir === 1;
            const sz = drawVehicle(ctx, p.x, p.y, p.wPx, v, away, nt, time);
            boxes.push({ x0: p.x - sz.w / 2, y0: p.y - sz.h, x1: p.x + sz.w / 2, y1: p.y, text: v.tag ? v.tag.text : `${v.kind === "car" ? "CAR" : v.kind === "truck" ? "TRUCK" : "BUS"} ${Math.round(v.v * 3.6)}`, color: v.tag ? v.tag.color : "#3ddc97", flag: !!v.tag });
          }
          ctx.restore();
        }
        // a pedestrian crossing the carriageway (palm avenue)
        const gp = cfg.lanes!.find((l) => l.dir === 1)!.g;
        if (s.pedestrian) {
          wd.ped += dt * 0.11; if (wd.ped > 1.2) wd.ped = -0.15; const u = Math.max(0, Math.min(1, wd.ped));
          const a = atLane(cfg, gp, 2.6 - u * 3.2, 40), h = a.wPx * 1.9 * 0.95;
          drawPerson(ctx, a.x, a.y, h, "#d4202a", false, time, 1);
          boxes.push({ x0: a.x - h * 0.3, y0: a.y - h * 1.02, x1: a.x + h * 0.3, y1: a.y, text: "PEDESTRIAN ON ROAD", color: "#ff4d4d", flag: true });
        }
      }

      // plaza traffic far away, walkers (people on the plaza, workers at the roadworks), rain
      if (cfg.far) {
        const far = cfg.far;
        for (let i = 0; i < 5; i++) {
          const u = (((time * 0.05 + i / 5) % 1) + 1) % 1, idx = Math.min(far.length - 2, Math.floor(u * (far.length - 1))), f = u * (far.length - 1) - idx;
          const x = far[idx][0] + (far[idx + 1][0] - far[idx][0]) * f, y = far[idx][1] + (far[idx + 1][1] - far[idx][1]) * f;
          ctx.fillStyle = i % 2 ? "#e9ecef" : "#c0392b"; ctx.fillRect(x - 1.6, y - 1.4, 3.2, 1.8);
        }
      }
      for (const [k, w] of wd.walkers.entries()) {
        w.u += w.speed * dt; if (w.u > 1) w.u = 0;
        const n = w.path.length - 1, f = w.u * n, i = Math.min(n - 1, Math.floor(f)), q = f - i;
        const x = w.path[i][0] + (w.path[i + 1][0] - w.path[i][0]) * q, y = w.path[i][1] + (w.path[i + 1][1] - w.path[i][1]) * q, h = Math.max(9, (y - (cfg.walkY0 ?? 170)) * (cfg.walkK ?? 0.21));
        drawPerson(ctx, x, y, h, w.coat, w.umbrella, time, k * 2, w.hiVis);
        boxes.push({ x0: x - h * 0.3, y0: y - h * 1.02, x1: x + h * 0.3, y1: y, text: w.hiVis ? "WORKER NEAR ROAD" : `PERSON ${90 + k * 4}%`, color: w.hiVis ? "#ffb020" : "#3ddc97", flag: w.hiVis });
      }
      if (cfg.rain) {
        if (Math.random() < 0.5 && wd.ripples.length < 26) wd.ripples.push({ x: 20 + Math.random() * 300, y: 260 + Math.random() * 180, r: 0 });
        ctx.lineWidth = 0.8;
        wd.ripples = wd.ripples.filter((r) => { r.r += dt * 9; if (r.r > 9) return false; ctx.strokeStyle = `rgba(220,235,245,${0.5 * (1 - r.r / 9)})`; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.35, 0, 0, 7); ctx.stroke(); return true; });
        ctx.strokeStyle = "rgba(215,232,245,.55)"; ctx.lineWidth = 1; ctx.beginPath();
        for (const d of wd.drops) { d.y += d.s * dt; d.x -= d.s * dt * 0.12; if (d.y > cfg.h) { d.y = -10; d.x = Math.random() * (cfg.w + 40); } ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.12, d.y - d.l); }
        ctx.stroke();
        ctx.fillStyle = "rgba(120,145,165,.1)"; ctx.fillRect(0, 0, cfg.w, cfg.h);
      }

      // developer helper: lanes and clip shapes on top of the picture (?cambug)
      if (DEBUG && cfg.lanes) {
        ctx.lineWidth = 0.7;
        cfg.lanes.forEach((L, i) => { ctx.strokeStyle = i % 2 ? "#0ff" : "#f0f"; ctx.beginPath(); for (let t = 0.02; t <= 1.3; t += 0.05) { const p = lanePoint(cfg, L, t); t < 0.03 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); } ctx.stroke(); });
        ctx.strokeStyle = "#ff0"; cfg.clip?.forEach((poly) => { ctx.beginPath(); poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke(); });
      }

      // AI layer in screen space
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (ov) {
        const k = W / (hostEl.clientWidth || W);
        boxes.sort((a, b) => Number(b.flag) - Number(a.flag) || (b.y1 - b.y0) - (a.y1 - a.y0));
        let shown = 0;
        for (const b of boxes) {
          const x0 = b.x0 * sc2 + ox, y0 = b.y0 * sc2 + oy, x1 = b.x1 * sc2 + ox, y1 = b.y1 * sc2 + oy, bw = x1 - x0;
          if (x1 < 0 || x0 > W || y1 < 0 || y0 > H) continue;
          if (!b.flag && (bw < (cp ? 20 : 20) * k || shown >= (cp ? 5 : 9))) continue;
          shown += b.flag ? 0 : 1;
          ctx.lineWidth = (b.flag ? 2.2 : 1.2) * k; ctx.strokeStyle = b.color; ctx.strokeRect(x0, y0, bw, y1 - y0);
          if (b.flag || (!cp && bw > 40 * k)) {
            ctx.font = `600 ${(b.flag ? 11.5 : 10.5) * k}px "Segoe UI", Arial, sans-serif`;
            const label = b.flag && /STOPPED/.test(b.text) ? `${b.text} · ${String(Math.floor(props.current.faultMins / 60)).padStart(2, "0")}:${String(props.current.faultMins % 60).padStart(2, "0")}` : b.text;
            const tw = ctx.measureText(label).width + 8 * k, th = 15 * k;
            ctx.fillStyle = b.color; ctx.fillRect(x0, y0 - th, tw, th); ctx.fillStyle = "#0a0f14"; ctx.fillText(label, x0 + 4 * k, y0 - 4 * k);
          }
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={host} className="cam3d compact"><canvas ref={cv} className="cam3d-gl" aria-label={`Camera view: ${cam.name}`} /></div>;
}
