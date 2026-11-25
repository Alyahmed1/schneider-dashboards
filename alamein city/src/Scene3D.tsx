import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Cam, Scenario, Weather } from "./cams";
import { rng } from "./live";

/* A simulated highway camera. 1 unit = 1 metre.
   Dual carriageway: 4 m median, then per side a 1 m inner shoulder, three 3.65 m lanes and a 2.5 m hard shoulder.
   Camera on the median pole looking down the road; traffic on the right side drives away, traffic on the left drives towards the camera. */
const LANE_W = 3.65, MED = 2.0, SH_IN = 1.0, SH_OUT = 2.5;
const LANE_X = [MED + SH_IN + LANE_W * 0.5, MED + SH_IN + LANE_W * 1.5, MED + SH_IN + LANE_W * 2.5];
const SHOULDER_X = MED + SH_IN + LANE_W * 3 + SH_OUT / 2;
const CW_OUT = MED + SH_IN + LANE_W * 3 + SH_OUT;
const ROAD_LEN = 760;
const KMH = 1 / 3.6;
const LAMP_OUT = 2; // the dark pole when a lamp fault is active

export interface PTZ { yaw: number; zoom: number }
export interface Vms { lines: string[]; offline: boolean }
export interface SceneProps { cam: Cam; sc: Scenario; night: boolean; overlay: boolean; ptz: PTZ; onPtz: (p: PTZ) => void; faultMins: number; vms: Vms; compact?: boolean }

/* ---------- small texture painters ---------- */
function canvasTex(w: number, h: number, paint: (c: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  paint(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const speckle = (c: CanvasRenderingContext2D, w: number, h: number, n: number, seed: number, light = 0.07, dark = 0.1) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const v = r() > 0.5;
    c.fillStyle = v ? `rgba(255,255,255,${(r() * light).toFixed(3)})` : `rgba(0,0,0,${(r() * dark).toFixed(3)})`;
    const s = 1 + Math.floor(r() * 2.4);
    c.fillRect(r() * w, r() * h, s, s);
  }
};
const radialTex = (inner: string, outer: string) => canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, inner); g.addColorStop(1, outer); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });

function roadTexture(aniso: number) {
  // x = 0 at the median side, 14.45 m wide; the picture repeats every 12 m along the road
  const W = 512, H = 512, ppm = W / (SH_IN + LANE_W * 3 + SH_OUT);
  const t = canvasTex(W, H, (c) => {
    c.fillStyle = "#3b3d41"; c.fillRect(0, 0, W, H);
    c.fillStyle = "#47494d"; c.fillRect(0, 0, SH_IN * ppm, H); c.fillRect((SH_IN + LANE_W * 3) * ppm, 0, SH_OUT * ppm, H);
    for (let l = 0; l < 3; l++) for (const o of [-0.85, 0.85]) {
      const cx = (SH_IN + LANE_W * (l + 0.5) + o) * ppm;
      const g = c.createLinearGradient(cx - 14, 0, cx + 14, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, "rgba(0,0,0,.2)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(cx - 14, 0, 28, H);
    }
    speckle(c, W, H, 14000, 5);
    c.fillStyle = "rgba(235,235,230,.92)";
    c.fillRect(SH_IN * ppm - 3.5, 0, 7, H); c.fillRect((SH_IN + LANE_W * 3) * ppm - 3.5, 0, 7, H);
    for (const k of [1, 2]) c.fillRect((SH_IN + LANE_W * k) * ppm - 2.5, 0, 5, 3 * (H / 12)); // 3 m dash, 9 m gap
  });
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, ROAD_LEN / 12); t.anisotropy = aniso;
  return t;
}
function sandTexture(aniso: number) {
  const t = canvasTex(512, 512, (c) => {
    c.fillStyle = "#cdb88f"; c.fillRect(0, 0, 512, 512);
    const r = rng(9);
    for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(${r() > 0.5 ? "150,120,80" : "235,215,170"},${(0.05 + r() * 0.08).toFixed(3)})`; c.beginPath(); c.ellipse(r() * 512, r() * 512, 20 + r() * 60, 8 + r() * 24, r() * 3, 0, 7); c.fill(); }
    speckle(c, 512, 512, 9000, 11, 0.09, 0.09);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(120, 90); t.anisotropy = aniso;
  return t;
}
const signTex = (ar: string, en: string, arrow: boolean) => canvasTex(512, 160, (c) => {
  c.fillStyle = "#0e6b3b"; c.fillRect(0, 0, 512, 160);
  c.strokeStyle = "#fff"; c.lineWidth = 6; c.strokeRect(6, 6, 500, 148);
  c.fillStyle = "#fff"; c.textAlign = "center"; c.font = "700 50px 'Segoe UI', Arial, sans-serif"; c.fillText(ar, 256, 66);
  c.font = "700 44px 'Segoe UI', Arial, sans-serif"; c.fillText(en, 256, 124);
  if (arrow) { c.beginPath(); c.moveTo(60, 120); c.lineTo(60, 36); c.moveTo(40, 56); c.lineTo(60, 32); c.lineTo(80, 56); c.lineWidth = 8; c.stroke(); }
});
const limitTex = () => canvasTex(128, 128, (c) => {
  c.fillStyle = "#fff"; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill();
  c.strokeStyle = "#d4202a"; c.lineWidth = 12; c.beginPath(); c.arc(64, 64, 54, 0, 7); c.stroke();
  c.fillStyle = "#111"; c.font = "800 50px Arial"; c.textAlign = "center"; c.fillText("100", 64, 80);
});
const arrowBoardTex = () => canvasTex(256, 128, (c) => {
  c.fillStyle = "#101214"; c.fillRect(0, 0, 256, 128); c.fillStyle = "#ffb020";
  for (const x of [48, 104, 160]) { c.beginPath(); c.moveTo(x + 40, 64); c.lineTo(x, 22); c.lineTo(x, 106); c.closePath(); c.fill(); }
});
const potholeTex = () => canvasTex(256, 256, (c) => {
  c.clearRect(0, 0, 256, 256);
  const r = rng(21); c.beginPath();
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, rad = 78 + r() * 30; const x = 128 + Math.cos(a) * rad, y = 128 + Math.sin(a) * rad * 0.8; i ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.closePath(); const g = c.createRadialGradient(128, 128, 10, 128, 128, 110); g.addColorStop(0, "#0d0e10"); g.addColorStop(0.7, "#1d1f22"); g.addColorStop(1, "rgba(40,42,46,.0)"); c.fillStyle = g; c.fill();
  c.strokeStyle = "rgba(20,20,22,.7)"; c.lineWidth = 3;
  for (let i = 0; i < 7; i++) { const a = r() * 6.28; c.beginPath(); c.moveTo(128 + Math.cos(a) * 90, 128 + Math.sin(a) * 70); c.lineTo(128 + Math.cos(a) * (130 + r() * 20), 128 + Math.sin(a) * (110 + r() * 20)); c.stroke(); }
});

/* ---------- shared vehicle parts ---------- */
const paintCache = new Map<string, THREE.MeshStandardMaterial>();
const paint = (hex: string) => { let m = paintCache.get(hex); if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.38, metalness: 0.35 }); paintCache.set(hex, m); } return m; };
const glassMat = new THREE.MeshStandardMaterial({ color: "#16202b", roughness: 0.12, metalness: 0.7 });
const tireMat = new THREE.MeshStandardMaterial({ color: "#111214", roughness: 0.9 });
const tailMat = new THREE.MeshStandardMaterial({ color: "#7a0c08", emissive: "#ff2a1a", emissiveIntensity: 0.9 });
const headMat = new THREE.MeshStandardMaterial({ color: "#f4f1e4", emissive: "#fff3c4", emissiveIntensity: 0.4 });
const G = {
  body: new THREE.BoxGeometry(1.8, 0.62, 4.4), cab: new THREE.BoxGeometry(1.62, 0.44, 2.1), roof: new THREE.BoxGeometry(1.5, 0.06, 1.7),
  wheel: new THREE.CylinderGeometry(0.34, 0.34, 0.26, 14).rotateZ(Math.PI / 2), lamp: new THREE.BoxGeometry(0.42, 0.14, 0.06),
  cone: new THREE.ConeGeometry(0.17, 0.7, 10), coneBase: new THREE.BoxGeometry(0.42, 0.04, 0.42),
};
const COLORS = ["#f2f3f5", "#dfe3e8", "#2c3640", "#b8b9bd", "#c0392b", "#e8b923", "#2d6aa3", "#f2f3f5", "#8a95a1", "#1d242c", "#e9e6dc"];
const TRUCK_COLORS = ["#f4f5f7", "#2a64a8", "#c0392b", "#e0a21a", "#3d9a5b", "#cfd4da"];

type Kind = "car" | "truck" | "bus" | "van" | "police" | "ambulance" | "cone" | "debris" | "board" | "worker" | "rig" | "pothole";
interface Ent {
  id: number; kind: Kind; dir: 1 | -1; lane: number; x: number; z: number; len: number; w: number; h: number;
  v: number; vBase: number; stat: boolean; yaw: number; g: THREE.Group;
  head?: THREE.Sprite; tail?: THREE.Sprite; flash?: "police" | "amb" | "hazard"; flashMats?: THREE.MeshStandardMaterial[];
  tag?: { text: string; color: string }; wrong?: boolean; track?: boolean;
}

function addWheels(g: THREE.Group, pts: [number, number][], r = 1) {
  for (const [x, z] of pts) { const w = new THREE.Mesh(G.wheel, tireMat); w.position.set(x, 0.34 * r, z); if (r !== 1) w.scale.set(1, r, r); g.add(w); }
}
function lights(g: THREE.Group, zFront: number, zBack: number, x: number, y: number) {
  for (const s of [-1, 1]) {
    const t = new THREE.Mesh(G.lamp, tailMat); t.position.set(s * x, y, zBack); g.add(t);
    const h = new THREE.Mesh(G.lamp, headMat); h.position.set(s * x, y, zFront); g.add(h);
  }
}
function makeVehicle(kind: Kind, color: string): { g: THREE.Group; len: number; w: number; h: number } {
  const g = new THREE.Group();
  if (kind === "car" || kind === "police" || kind === "van") {
    const van = kind === "van";
    const body = new THREE.Mesh(G.body, paint(color)); body.position.y = 0.55; g.add(body);
    const cab = new THREE.Mesh(G.cab, glassMat); cab.position.set(0, van ? 1.2 : 1.1, van ? 0.1 : -0.25); if (van) cab.scale.set(1.04, 1.5, 1.9); g.add(cab);
    const roof = new THREE.Mesh(G.roof, paint(color)); roof.position.set(0, van ? 1.62 : 1.34, van ? 0.1 : -0.25); if (van) roof.scale.set(1.04, 1, 2.2); g.add(roof);
    addWheels(g, [[-0.86, 1.4], [0.86, 1.4], [-0.86, -1.4], [0.86, -1.4]]);
    lights(g, 2.2, -2.2, 0.62, 0.72);
    return { g, len: 4.5, w: 1.85, h: van ? 1.7 : 1.45 };
  }
  if (kind === "ambulance") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.1, 5.4), paint("#f6f7f8")); body.position.y = 1.4; g.add(body);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.34, 5.44), paint("#d4202a")); stripe.position.y = 1.35; g.add(stripe);
    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 0.06), glassMat); wind.position.set(0, 1.9, 2.72); g.add(wind);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.34), new THREE.MeshStandardMaterial({ color: "#222" })); bar.position.set(0, 2.55, 1.6); g.add(bar);
    addWheels(g, [[-0.95, 1.8], [0.95, 1.8], [-0.95, -1.6], [0.95, -1.6]], 1.1);
    return { g, len: 5.5, w: 2.1, h: 2.6 };
  }
  if (kind === "truck") {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.3, 2.2), paint(color)); cab.position.set(0, 1.55, 4.3); g.add(cab);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 0.06), glassMat); gl.position.set(0, 2.1, 5.42); g.add(gl);
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.55, 3.1, 8.9), paint(TRUCK_COLORS[(color.length + color.charCodeAt(1)) % TRUCK_COLORS.length])); trailer.position.set(0, 2.45, -1.0); g.add(trailer);
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 11), tireMat); chassis.position.set(0, 0.7, 0); g.add(chassis);
    addWheels(g, [[-1.05, 4.2], [1.05, 4.2], [-1.05, -2.4], [1.05, -2.4], [-1.05, -3.8], [1.05, -3.8]], 1.35);
    for (const s of [-1, 1]) { const t = new THREE.Mesh(G.lamp, tailMat); t.position.set(s * 0.9, 0.9, -5.5); g.add(t); }
    return { g, len: 12, w: 2.6, h: 4 };
  }
  if (kind === "bus") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.9, 11.5), paint("#f1f3f5")); body.position.y = 2.0; g.add(body);
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.95, 10.4), glassMat); win.position.set(0, 2.45, 0); g.add(win);
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.35, 11.52), paint(color)); band.position.set(0, 1.25, 0); g.add(band);
    addWheels(g, [[-1.1, 3.6], [1.1, 3.6], [-1.1, -3.5], [1.1, -3.5]], 1.4);
    lights(g, 5.76, -5.76, 0.9, 0.9);
    return { g, len: 11.6, w: 2.5, h: 3.5 };
  }
  // fall back: a box
  const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), paint(color)); b.position.y = 0.5; g.add(b);
  return { g, len: 1, w: 1, h: 1 };
}

interface Api { setVms: (v: Vms) => void; configure: (cam: Cam, sc: Scenario, night: boolean) => void; setPTZ: (p: PTZ) => void; setOverlay: (o: boolean) => void; setFaultMins: (m: number) => void; dispose: () => void }

const SKY: Record<Weather, { day: [string, string, number]; night: [string, string, number] }> = {
  clear: { day: ["#e5dcc8", "#6fa6dd", 0.0021], night: ["#0f1b2c", "#02060d", 0.0021] },
  fog: { day: ["#ccd2d6", "#b8c2c8", 0.0155], night: ["#242d35", "#10161b", 0.0155] },
  sand: { day: ["#cc9d63", "#b88a52", 0.0068], night: ["#38291a", "#17110a", 0.0068] },
};

function build(host: HTMLDivElement, canvas: HTMLCanvasElement, hud: HTMLCanvasElement, compact: boolean): Api {
  const PR = compact ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(PR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2("#e5dcc8", 0.002);
  const camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.5, 1400);

  /* sky dome that always matches the fog colour at the horizon */
  const skyU = { horizon: { value: new THREE.Color("#e5dcc8") }, zenith: { value: new THREE.Color("#6fa6dd") } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1200, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 horizon; uniform vec3 zenith; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(horizon, zenith, pow(clamp(h*1.6,0.0,1.0), 0.5)); gl_FragColor = vec4(c,1.0); }",
  }));
  scene.add(dome);

  /* lights */
  const hemi = new THREE.HemisphereLight("#cfe3ff", "#cdb68c", 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff0d6", 2.1); sun.position.set(-60, 90, -80); scene.add(sun);

  /* ground, road, median */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1200).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: sandTexture(aniso), roughness: 1 }));
  ground.position.set(0, -0.03, ROAD_LEN / 2 - 60); scene.add(ground);
  const rt = roadTexture(aniso);
  const roadMat = new THREE.MeshStandardMaterial({ map: rt, roughness: 0.92, side: THREE.DoubleSide });
  const roadGeo = new THREE.PlaneGeometry(CW_OUT - MED, ROAD_LEN + 80).rotateX(-Math.PI / 2);
  const right = new THREE.Mesh(roadGeo, roadMat); right.position.set(MED + (CW_OUT - MED) / 2, 0, ROAD_LEN / 2 - 40); scene.add(right);
  const left = new THREE.Mesh(roadGeo, roadMat); left.scale.x = -1; left.position.set(-(MED + (CW_OUT - MED) / 2), 0, ROAD_LEN / 2 - 40); scene.add(left);
  const median = new THREE.Mesh(new THREE.BoxGeometry(MED * 2, 0.16, ROAD_LEN + 80), new THREE.MeshStandardMaterial({ color: "#8c897f", roughness: 1 })); median.position.set(0, 0.08, ROAD_LEN / 2 - 40); scene.add(median);
  const rail = new THREE.MeshStandardMaterial({ color: "#aab3ba", metalness: 0.7, roughness: 0.45 });
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, ROAD_LEN + 80), rail); r.position.set(s * (MED - 0.12), 0.62, ROAD_LEN / 2 - 40); scene.add(r); }
  const shrubs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshStandardMaterial({ color: "#4f6b3d", roughness: 1 }), 130);
  { const r = rng(3), m = new THREE.Matrix4(); for (let i = 0; i < 130; i++) { const s = 0.7 + r() * 0.6; m.compose(new THREE.Vector3((r() - 0.5) * 0.6, 0.4, 4 + i * 5.9), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.8, s)); shrubs.setMatrixAt(i, m); } scene.add(shrubs); }
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), new THREE.MeshStandardMaterial({ color: "#f2f2f2", emissive: "#555", roughness: 0.6 }), 30);
  { const m = new THREE.Matrix4(); for (let i = 0; i < 15; i++) for (const [k, s] of [[0, 1], [1, -1]]) { m.setPosition(s * (CW_OUT + 0.3), 0.45, 15 + i * 50); posts.setMatrixAt(i * 2 + k, m); } scene.add(posts); }

  /* lamp poles on the median */
  const lampGroup = new THREE.Group(); scene.add(lampGroup);
  const poleMat = new THREE.MeshStandardMaterial({ color: "#7f8890", metalness: 0.6, roughness: 0.5 });
  const lampOn = new THREE.MeshStandardMaterial({ color: "#fff3d6", emissive: "#ffd899", emissiveIntensity: 0.1 });
  const lampOff = new THREE.MeshStandardMaterial({ color: "#3a3d40", roughness: 0.6 });
  const glowTex = radialTex("rgba(255,214,150,1)", "rgba(255,200,120,0)");
  const poolTex = radialTex("rgba(255,205,130,.38)", "rgba(255,200,120,0)");
  const poles: { z: number; heads: THREE.Mesh[]; glow: THREE.Sprite[]; pool: THREE.Mesh[] }[] = [];
  for (let i = 0; i < 19; i++) {
    const z = 22 + i * 40, p = { z, heads: [] as THREE.Mesh[], glow: [] as THREE.Sprite[], pool: [] as THREE.Mesh[] };
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 11, 8), poleMat); pole.position.set(0, 5.5, z); lampGroup.add(pole);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.12), poleMat); arm.position.set(s * 2.1, 10.9, z); lampGroup.add(arm);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.42), lampOn); head.position.set(s * 4.3, 10.8, z); lampGroup.add(head); p.heads.push(head);
      const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7, fog: false })); gs.scale.set(3.4, 3.4, 1); gs.position.set(s * 4.3, 10.6, z); lampGroup.add(gs); p.glow.push(gs);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(22, 22).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); pl.position.set(s * 6.5, 0.04, z); lampGroup.add(pl); p.pool.push(pl);
    }
    poles.push(p);
  }

  /* gantry sign and speed limits */
  const gantry = new THREE.Group(); scene.add(gantry);
  for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.2, 0.4), poleMat); post.position.set(s * (CW_OUT + 1.2), 3.6, 250); gantry.add(post); }
  const truss = new THREE.Mesh(new THREE.BoxGeometry((CW_OUT + 1.2) * 2, 0.55, 0.45), poleMat); truss.position.set(0, 6.9, 250); gantry.add(truss);
  for (const [s, ar, en, arrow] of [[1, "الإسكندرية", "ALEXANDRIA", true], [-1, "مرسى مطروح", "MARSA MATROUH", true]] as const) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.6), new THREE.MeshBasicMaterial({ map: signTex(ar, en, arrow), fog: true })); b.rotation.y = Math.PI; b.position.set(s * 9.2, 5.2, 249.7); gantry.add(b);
  }
  const limit = limitTex();
  for (const s of [-1, 1]) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), poleMat); stem.position.set(s * (CW_OUT + 0.9), 1.2, 75); gantry.add(stem);
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ map: limit })); d.rotation.y = Math.PI; d.position.set(s * (CW_OUT + 0.9), 2.7, 74.9); gantry.add(d);
  }

  /* the variable message sign over the oncoming carriageway: it faces the camera and shows the live message */
  const vmsCv = document.createElement("canvas"); vmsCv.width = 512; vmsCv.height = 192;
  const vmsTex = new THREE.CanvasTexture(vmsCv); vmsTex.colorSpace = THREE.SRGBColorSpace; vmsTex.anisotropy = aniso;
  const drawVms = (lines: string[], offline: boolean) => {
    const c = vmsCv.getContext("2d")!;
    c.fillStyle = "#05070a"; c.fillRect(0, 0, 512, 192); c.strokeStyle = "#2b333b"; c.lineWidth = 6; c.strokeRect(3, 3, 506, 186);
    c.textAlign = "center"; c.textBaseline = "middle";
    if (offline) { c.fillStyle = "#3a4048"; c.font = "700 40px Consolas, monospace"; c.fillText("- - -", 256, 96); }
    else {
      c.fillStyle = "#ffb020";
      lines.forEach((ln, i) => { const fs = Math.max(18, Math.min(46, Math.floor(700 / Math.max(8, ln.length)))); c.font = `700 ${fs}px Consolas, "Courier New", monospace`; c.fillText(ln, 256, (192 * (i + 1)) / (lines.length + 1)); });
      c.fillStyle = "rgba(0,0,0,.4)"; for (let y = 0; y < 192; y += 4) c.fillRect(0, y, 512, 1); for (let x = 0; x < 512; x += 4) c.fillRect(x, 0, 1, 192);
    }
    vmsTex.needsUpdate = true;
  };
  drawVms(["DRIVE SAFELY"], false);
  { const frame = new THREE.Mesh(new THREE.BoxGeometry(8.0, 3.15, 0.35), new THREE.MeshStandardMaterial({ color: "#1b2026", roughness: 0.7 })); frame.position.set(-9.2, 5.8, 112.3); gantry.add(frame);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 2.85), new THREE.MeshBasicMaterial({ map: vmsTex })); board.rotation.y = Math.PI; board.position.set(-9.2, 5.8, 112.1); gantry.add(board);
    const truss2 = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.4, 0.4), poleMat); truss2.position.set(-9.45, 7.9, 112.4); gantry.add(truss2);
    for (const x of [-17.65, -1.2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8, 0.4), poleMat); p.position.set(x, 4, 112.4); gantry.add(p); } }

  /* environments: coast (sea on the left), city (blocks), desert (dunes) */
  const envCoast = new THREE.Group(), envCity = new THREE.Group(), envDesert = new THREE.Group();
  { const sea = new THREE.Mesh(new THREE.PlaneGeometry(2000, 1500).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#2f93a8", roughness: 0.25, metalness: 0.2 })); sea.position.set(-1150, -0.5, 400); envCoast.add(sea);
    const beach = new THREE.Mesh(new THREE.PlaneGeometry(40, 1500).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#eadfc2", roughness: 1 })); beach.position.set(-150, -0.2, 400); envCoast.add(beach);
    const sh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: "#7c8a55", roughness: 1 }), 120); const r = rng(14), m = new THREE.Matrix4();
    for (let i = 0; i < 120; i++) { const s = 0.5 + r() * 1.1; m.compose(new THREE.Vector3(-(24 + r() * 90), s * 0.35, 10 + r() * 700), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.6, s)); sh.setMatrixAt(i, m); } envCoast.add(sh); }
  { const r = rng(31); for (let i = 0; i < 70; i++) { const w = 12 + r() * 30, h = 8 + r() * 30, d = 12 + r() * 26; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: ["#e9e1d0", "#d8cdb6", "#f0ece2", "#c9bea6"][i % 4], roughness: 0.9, emissive: "#ffcf80", emissiveIntensity: 0 })); b.position.set(-(40 + r() * 190), h / 2, 70 + r() * 600); b.userData.win = true; envCity.add(b); }
    const sh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: "#6f8650", roughness: 1 }), 60); const m = new THREE.Matrix4(); for (let i = 0; i < 60; i++) { const s = 0.6 + r(); m.compose(new THREE.Vector3((r() > 0.5 ? 1 : -1) * (22 + r() * 18), s * 0.5, 10 + r() * 650), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.7, s)); sh.setMatrixAt(i, m); } envCity.add(sh); }
  { const r = rng(52), mat = new THREE.MeshStandardMaterial({ color: "#c9b184", roughness: 1 });
    for (let i = 0; i < 28; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), mat); d.scale.set(50 + r() * 90, 4 + r() * 12, 30 + r() * 60); d.position.set((r() > 0.5 ? 1 : -1) * (90 + r() * 360), 0, 80 + r() * 640); envDesert.add(d); }
    const sc = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: "#8f8a5a", roughness: 1 }), 90); const m = new THREE.Matrix4();
    for (let i = 0; i < 90; i++) { const s = 0.3 + r() * 0.7; m.compose(new THREE.Vector3((r() > 0.5 ? 1 : -1) * (20 + r() * 120), s * 0.3, 8 + r() * 700), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.6, s)); sc.setMatrixAt(i, m); } envDesert.add(sc); }
  scene.add(envCoast, envCity, envDesert);

  /* dust in the air for sandstorms */
  const dustN = 700, dustPos = new Float32Array(dustN * 3), dr = rng(8);
  for (let i = 0; i < dustN; i++) { dustPos[i * 3] = (dr() - 0.5) * 90; dustPos[i * 3 + 1] = dr() * 14; dustPos[i * 3 + 2] = 3 + dr() * 130; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: "#d9b27a", size: 0.45, transparent: true, opacity: 0.5, depthWrite: false })); dust.visible = false; scene.add(dust);

  /* sprites and shadows shared by all vehicles */
  const headTex = radialTex("rgba(255,248,220,1)", "rgba(255,240,200,0)"), tailTex = radialTex("rgba(255,60,40,1)", "rgba(255,40,20,0)");
  const shadowTex = canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }, false);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  const arrowTex = arrowBoardTex(), pothTex = potholeTex();

  /* ---------- the dynamic world: rebuilt whenever the camera or scenario changes ---------- */
  const world = new THREE.Group(); scene.add(world);
  let ents: Ent[] = [], tags: { obj: THREE.Object3D; w: number; h: number; text: string; color: string }[] = [];
  let curCam: Cam | null = null, curSc: Scenario | null = null, night = false, uid = 1;
  let wxTarget: Weather = "clear";
  let faultMins = 0;
  const flashers: { m: THREE.MeshStandardMaterial; kind: "police" | "amb" | "hazard"; phase: number }[] = [];

  const spawn = (kind: Kind, dir: 1 | -1, lane: number, z: number, o: { color?: string; stat?: boolean; vBase?: number; x?: number; yaw?: number; len?: number; w?: number; h?: number; tag?: Ent["tag"]; wrong?: boolean } = {}) => {
    const color = o.color ?? COLORS[Math.floor(Math.random() * COLORS.length)];
    let model: { g: THREE.Group; len: number; w: number; h: number };
    if (kind === "cone") {
      const g = new THREE.Group(); const c = new THREE.Mesh(G.cone, paint("#ff7a1a")); c.position.y = 0.39; g.add(c); const b = new THREE.Mesh(G.coneBase, paint("#222")); b.position.y = 0.02; g.add(b);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 10), paint("#fff")); band.position.y = 0.42; g.add(band); model = { g, len: 0.5, w: 0.45, h: 0.75 };
    } else if (kind === "board") {
      const g = new THREE.Group(); const f = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 0.12), new THREE.MeshBasicMaterial({ map: arrowTex })); f.position.y = 1.9; g.add(f); const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.12), poleMat); s.position.y = 0.65; g.add(s);
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 1.0), paint("#e0a21a")); base.position.y = 0.2; g.add(base); model = { g, len: 1.2, w: 2.4, h: 2.6 };
    } else if (kind === "worker") {
      const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 1.0, 8), paint("#ff8a00")); b.position.y = 0.95; g.add(b); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8), paint("#2b3a55")); l.position.y = 0.25; g.add(l);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), paint("#f5d90a")); h.position.y = 1.62; g.add(h); model = { g, len: 0.5, w: 0.5, h: 1.8 };
    } else if (kind === "rig") {
      const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 5.2), paint("#f2b01e")); b.position.y = 1.1; g.add(b); const c = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 2.0), glassMat); c.position.set(0, 2.2, 0.9); g.add(c);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 5), paint("#f2b01e")); arm.position.set(0, 2.5, -3.4); arm.rotation.x = 0.4; g.add(arm); addWheels(g, [[-1.2, 1.7], [1.2, 1.7], [-1.2, -1.7], [1.2, -1.7]], 1.5); model = { g, len: 5.4, w: 2.6, h: 3.2 };
    } else if (kind === "debris") {
      const g = new THREE.Group(); const r = rng(uid * 7 + 1);
      for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2 + r() * 0.7, 0.06 + r() * 0.1, 0.2 + r() * 0.6), paint(["#2c3640", "#c0392b", "#9aa5b1", "#1d242c"][i % 4])); p.position.set((r() - 0.5) * 1.6, 0.05, (r() - 0.5) * 1.6); p.rotation.y = r() * 6; g.add(p); }
      model = { g, len: 1.8, w: 1.8, h: 0.4 };
    } else if (kind === "pothole") {
      const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: pothTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); p.position.y = 0.012; g.add(p); model = { g, len: 2, w: 2, h: 0.3 };
    } else if (kind === "ambulance") model = makeVehicle("ambulance", "#fff");
    else model = makeVehicle(kind, color);
    const g = model.g;
    const e: Ent = { id: uid++, kind, dir, lane, x: o.x ?? (lane >= 0 ? dir * LANE_X[lane] : dir * SHOULDER_X), z, len: o.len ?? model.len, w: o.w ?? model.w, h: o.h ?? model.h, v: 0, vBase: o.vBase ?? 25, stat: !!o.stat, yaw: o.yaw ?? 0, g, tag: o.tag, wrong: o.wrong };
    e.v = e.stat ? 0 : e.vBase;
    if (kind === "car" || kind === "van" || kind === "truck" || kind === "bus" || kind === "police" || kind === "ambulance") {
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(model.w + 1.3, model.len + 1.8).rotateX(-Math.PI / 2), shadowMat); sh.position.y = 0.015; g.add(sh);
      const front = model.len / 2 + 0.3;
      e.head = new THREE.Sprite(new THREE.SpriteMaterial({ map: headTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); e.head.scale.set(5.5, 3.2, 1); e.head.position.set(0, 0.8, front); e.head.visible = false; g.add(e.head);
      e.tail = new THREE.Sprite(new THREE.SpriteMaterial({ map: tailTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); e.tail.scale.set(3.4, 1.8, 1); e.tail.position.set(0, 0.8, -front); e.tail.visible = false; g.add(e.tail);
    }
    g.rotation.y = (dir < 0 ? Math.PI : 0) + e.yaw;
    g.position.set(e.x, 0, e.z);
    world.add(g); ents.push(e);
    return e;
  };
  const flasher = (e: Ent, kind: "police" | "amb" | "hazard") => {
    const y = e.kind === "ambulance" ? 2.62 : e.kind === "truck" ? 3.0 : 1.5;
    const mk = (hex: string, x: number, z: number) => { const m = new THREE.MeshStandardMaterial({ color: "#222", emissive: hex, emissiveIntensity: 0 }); const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.3), m); b.position.set(x, y, z); e.g.add(b); return m; };
    if (kind === "hazard") {
      const hz = e.len / 2;
      for (const [x, z] of [[-0.8, hz], [0.8, hz], [-0.8, -hz], [0.8, -hz]]) { const m = mk("#ff9a1a", x, z); flashers.push({ m, kind, phase: 0 }); }
    } else {
      const a = mk("#ff2a2a", -0.4, 1.2), b = mk("#2a6bff", 0.4, 1.2);
      flashers.push({ m: a, kind, phase: 0 }, { m: b, kind, phase: 1 });
    }
  };
  const tag = (obj: THREE.Object3D, w: number, h: number, text: string, color: string) => tags.push({ obj, w, h, text, color });

  const clearWorld = () => { for (const e of ents) world.remove(e.g); ents = []; tags = []; flashers.length = 0; for (const c of [...world.children]) world.remove(c); };

  const closedLane = (dir: 1 | -1, lane: number, sc: Scenario) => dir === 1 && lane === 0 && (sc.roadworks || sc.wrongWay);

  const configure = (cam: Cam, sc: Scenario, nightOn: boolean) => {
    curCam = cam; curSc = sc; night = nightOn; wxTarget = sc.weather;
    clearWorld();
    envCoast.visible = cam.env === "coast"; envCity.visible = cam.env === "city"; envDesert.visible = cam.env !== "coast";
    envCity.children.forEach((c) => { const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (c.userData.win && m) m.emissiveIntensity = nightOn ? 0.35 : 0; });
    lampOn.emissiveIntensity = nightOn ? 2.4 : 0.1;
    poles.forEach((p, i) => { const out = sc.lampOut && i === LAMP_OUT; p.heads.forEach((h, k) => { h.material = out ? lampOff : lampOn; p.glow[k].visible = nightOn && !out; p.pool[k].visible = nightOn && !out; }); });
    if (sc.lampOut) { const lp = poles[LAMP_OUT]; const anchor = new THREE.Object3D(); anchor.position.set(-4.3, 10.8, lp.z); world.add(anchor); tag(anchor, 90, 26, "LAMP FAULT", "#ffb020"); }
    hemi.intensity = nightOn ? 0.32 : 0.9; sun.intensity = nightOn ? 0.18 : 2.1; sun.color.set(nightOn ? "#6f8fc4" : "#fff0d6");
    shrubs.visible = true;

    // scenario objects
    if (sc.pothole) { const p = spawn("pothole", 1, 2, 30, { stat: true, tag: { text: "POTHOLE 40 CM", color: "#ffb020" } }); p.lane = -1; }
    if (sc.accident) {
      const a = spawn("car", 1, 1, 50, { stat: true, yaw: 0.55, x: LANE_X[1] + 0.3, color: "#2c3640", tag: { text: "ACCIDENT · LANE 2 BLOCKED", color: "#ff4d4d" } });
      spawn("car", 1, 1, 54.5, { stat: true, yaw: -1.25, x: LANE_X[1] - 0.6, color: "#c0392b" });
      a.lane = 1;
      const amb = spawn("ambulance", 1, 2, 40, { stat: true, x: LANE_X[2] + 1.3, yaw: 0.08 }); amb.lane = 2; flasher(amb, "amb");
      const pol = spawn("police", 1, 2, 31, { stat: true, x: SHOULDER_X - 0.4, color: "#f4f5f7", yaw: -0.15 }); pol.lane = -1; flasher(pol, "police");
      for (let i = 0; i < 7; i++) spawn("cone", 1, 1, 12 + i * 5, { stat: true, x: LANE_X[1] + 1.7 - i * 0.14 });
      spawn("worker", 1, -1, 43, { stat: true, x: LANE_X[2] - 1.2 });
      spawn("worker", 1, -1, 45.5, { stat: true, x: LANE_X[2] - 1.6 });
      if (sc.debris) for (const [x, z] of [[LANE_X[1] + 1.1, 60], [LANE_X[2] - 0.3, 64], [LANE_X[2] + 0.9, 71]]) { const d = spawn("debris", 1, -1, z, { stat: true, x }); if (z === 64) d.tag = { text: "DEBRIS", color: "#ffb020" }; }
    }
    if (sc.shoulder !== "none") {
      const dir: 1 | -1 = sc.shoulder === "right" ? 1 : -1;
      const e = spawn(sc.shoulderTruck ? "truck" : "car", dir, -1, 44, { stat: true, color: sc.shoulderTruck ? "#c0392b" : "#e8b923", x: dir * (SHOULDER_X + 0.1), tag: { text: sc.shoulderTruck ? "BROKEN-DOWN TRUCK" : "STOPPED VEHICLE", color: "#ffb020" } });
      flasher(e, "hazard");
      const tri = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.55, 3), new THREE.MeshStandardMaterial({ color: "#d4202a", emissive: "#d4202a", emissiveIntensity: 0.4 })); tri.position.set(dir * (SHOULDER_X - 0.2), 0.3, 44 - dir * 22); world.add(tri);
    }
    if (sc.roadworks) {
      spawn("board", 1, 0, 58, { stat: true, x: LANE_X[0] + 0.4, tag: { text: "LANE 1 CLOSED", color: "#ffb020" } });
      for (let i = 0; i < 16; i++) spawn("cone", 1, 0, 68 + i * 6, { stat: true, x: LANE_X[0] + (i < 5 ? -1.6 + i * 0.4 : 0.4) + (i < 5 ? 0 : 0) });
      spawn("rig", 1, -1, 108, { stat: true, x: LANE_X[0] - 0.2, yaw: 0.05, tag: { text: "ROAD WORKS", color: "#ffb020" } });
      for (const [x, z] of [[LANE_X[0] + 0.5, 92], [LANE_X[0] - 0.8, 100], [LANE_X[0] + 0.8, 128], [LANE_X[0] - 0.4, 136]]) spawn("worker", 1, -1, z, { stat: true, x });
    }

    // traffic
    const r = rng(cam.n * 101 + (sc.queue ? 7 : 3));
    const accidentZ = sc.accident ? 50 : -1;
    for (const dir of [1, -1] as const) for (let lane = 0; lane < 3; lane++) {
      if (dir === 1 && closedLane(dir, lane, sc)) continue;
      let n = lane === 0 ? 6 : lane === 1 ? 6 : 5;
      if (sc.queue && dir === 1) n = lane === 0 ? 17 : 18;
      if (sc.weather === "fog") n = Math.max(3, n - 2);
      if (compact) n = Math.max(2, Math.round(n * 0.62));
      if (dir === 1 && sc.accident && lane === 1) n = 3;
      const span = sc.queue && dir === 1 ? 420 : 640, z0 = dir === 1 ? 6 : 40;
      for (let i = 0; i < n; i++) {
        const z = z0 + (i + 0.2 + r() * 0.6) * (span / n);
        if (dir === 1 && sc.accident && lane === 1 && z > accidentZ - 45 && z < accidentZ + 30) continue;
        if (dir === 1 && sc.roadworks && lane === 0) continue;
        const roll = r();
        const kind: Kind = lane === 2 ? (roll < 0.26 ? "truck" : roll < 0.32 ? "bus" : roll < 0.4 ? "van" : "car") : lane === 1 ? (roll < 0.07 ? "truck" : roll < 0.1 ? "bus" : roll < 0.2 ? "van" : "car") : roll < 0.05 ? "van" : "car";
        const base = kind === "truck" ? 19.5 + r() * 2.5 : kind === "bus" ? 22.5 + r() * 2 : (lane === 0 ? 27 + r() * 3.5 : lane === 1 ? 24 + r() * 3.5 : 21 + r() * 3.5);
        spawn(kind, dir, lane, z, { vBase: base, color: kind === "truck" ? TRUCK_COLORS[Math.floor(r() * TRUCK_COLORS.length)] : kind === "bus" ? "#2a64a8" : COLORS[Math.floor(r() * COLORS.length)] });
      }
    }
    if (sc.wrongWay) spawn("car", -1, 3, 380, { x: LANE_X[0], vBase: 22, wrong: true, color: "#f2f3f5", tag: { text: "WRONG WAY · 98%", color: "#ff3b3b" } });
    // flare the lamps of every vehicle at night
    for (const e of ents) { if (e.head && e.tail) { e.head.visible = night && e.dir < 0; e.tail.visible = night && e.dir > 0; } }
  };

  /* ---------- per-frame traffic ---------- */
  const weatherCap = (e: Ent, t: number) => {
    const sc = curSc!;
    let cap = e.vBase;
    if (sc.weather === "fog") cap = Math.min(cap, 60 * KMH);
    if (sc.weather === "sand") cap = Math.min(cap, 50 * KMH);
    if (sc.accident) cap = Math.min(cap, e.dir === 1 ? 50 * KMH : 62 * KMH);
    if (sc.roadworks && e.dir === 1) cap = Math.min(cap, 70 * KMH);
    if (sc.queue && e.dir === 1) cap = Math.min(cap, 3.9 * (0.55 + 0.9 * Math.abs(Math.sin(t * 0.3 + e.id))));
    return cap;
  };
  const free = (e: Ent, lane: number) => {
    for (const o of ents) { if (o === e || o.dir !== e.dir || o.lane !== lane) continue; const dz = (o.z - e.z) * e.dir; if (dz > -(o.len / 2 + e.len / 2 + 6) && dz < e.len / 2 + o.len / 2 + 16 + Math.max(0, e.v - o.v) * 1.4) return false; }
    return true;
  };
  let time = 0;
  const step = (dt: number) => {
    time += dt;
    const sc = curSc; if (!sc) return;
    for (const dir of [1, -1] as const) for (let lane = 0; lane < 3; lane++) {
      const arr = ents.filter((e) => e.dir === dir && e.lane === lane).sort((a, b) => (b.z - a.z) * dir);
      for (let i = 0; i < arr.length; i++) {
        const e = arr[i]; if (e.stat) continue;
        const lead = arr[i - 1];
        let vt = weatherCap(e, time);
        if (lead && !e.wrong) {
          const gap = (lead.z - e.z) * dir - (lead.len + e.len) / 2;
          const blocked = lead.stat || lead.v < e.vBase * 0.55;
          if (blocked && gap < 55 && !e.wrong) {
            for (const t of [lane + 1, lane - 1]) if (t >= 0 && t <= 2 && !closedLane(dir, t, sc) && free(e, t)) { e.lane = t; break; }
          }
          vt = Math.min(vt, Math.max(0, (gap - 5) * 0.9) + lead.v * 0.55);
        }
        e.v += Math.max(-9 * dt, Math.min(3.2 * dt, vt - e.v));
        if (e.v < 0) e.v = 0;
        e.z += e.v * dt * dir;
      }
    }
    for (const e of ents) if (e.wrong) { e.v = e.vBase; e.z += e.v * dt * e.dir; }
    for (const e of ents) {
      if (e.stat) continue;
      const tx = e.wrong ? e.x : (e.lane >= 0 ? LANE_X[e.lane] : SHOULDER_X) * e.dir;
      const dx = tx - e.x; e.x += Math.sign(dx) * Math.min(Math.abs(dx), 2.4 * dt);
      if (e.dir === 1 && e.z > ROAD_LEN - 10) { e.z = sc.queue ? -40 : -30 - Math.random() * 60; e.v = e.vBase * 0.9; }
      else if (e.dir === -1 && e.z < -26) { if (e.wrong) { e.z = 380 + Math.random() * 120; } else { e.z = ROAD_LEN - 20 - Math.random() * 120; e.v = e.vBase; } }
      e.g.position.set(e.x, 0, e.z);
      e.g.rotation.y = (e.dir < 0 ? Math.PI : 0) + e.yaw + Math.max(-0.12, Math.min(0.12, dx * 0.05)) * e.dir;
    }
    // flashing lights
    const ph = time * 2;
    for (const f of flashers) {
      const on = f.kind === "hazard" ? Math.floor(time * 1.6) % 2 === 0 : Math.floor(ph * 2 + f.phase) % 2 === 0;
      f.m.emissiveIntensity = on ? (night ? 4 : 2.6) : 0;
    }
    // dust
    if (dust.visible) { const a = dustGeo.attributes.position as THREE.BufferAttribute; for (let i = 0; i < dustN; i++) { let x = a.getX(i) + 16 * dt; if (x > 45) x = -45; a.setX(i, x); } a.needsUpdate = true; }
  };

  /* ---------- weather, camera, drawing ---------- */
  const horizon = new THREE.Color("#e5dcc8"), zenith = new THREE.Color("#6fa6dd"); let dens = 0.002;
  const tmpH = new THREE.Color(), tmpZ = new THREE.Color();
  let ptz: PTZ = { yaw: 0, zoom: 1 };
  let showOverlay = true;
  const placeCamera = () => {
    if (!curCam) return;
    camera.position.set(curCam.xOff, curCam.height, 0);
    const lx = curCam.lookX + Math.tan(ptz.yaw) * 120;
    camera.lookAt(lx, 0.4, 120);
    camera.fov = 31 / ptz.zoom; camera.updateProjectionMatrix();
  };
  const resize = () => {
    const w = host.clientWidth || 640, h = host.clientHeight || 360;
    renderer.setSize(w, h, false); hud.width = Math.round(w * PR); hud.height = Math.round(h * PR);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  const v3 = new THREE.Vector3(), box = new THREE.Box3();
  const project = (b: THREE.Box3, W: number, H: number) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, ok = true;
    for (let i = 0; i < 8; i++) {
      v3.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera);
      if (v3.z > 1 || v3.z < -1) ok = false;
      const x = (v3.x * 0.5 + 0.5) * W, y = (-v3.y * 0.5 + 0.5) * H;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return ok ? { x0, y0, x1, y1 } : null;
  };
  const drawHud = () => {
    const ctx = hud.getContext("2d")!, W = hud.width, H = hud.height, k = W / (host.clientWidth || W);
    ctx.clearRect(0, 0, W, H);
    if (!showOverlay) return;
    const label = (x: number, y: number, text: string, color: string, size: number) => {
      ctx.font = `600 ${size * k}px "Segoe UI", Arial, sans-serif`; const w = ctx.measureText(text).width + 8 * k, h = (size + 6) * k;
      ctx.fillStyle = color; ctx.fillRect(x, y - h, w, h); ctx.fillStyle = "#0a0f14"; ctx.fillText(text, x + 4 * k, y - 5 * k);
    };
    const near = ents.filter((e) => !e.stat || e.tag || e.kind === "car" || e.kind === "truck").map((e) => ({ e, d: Math.hypot(e.x, e.z - 0) })).filter((o) => o.e.z > 14 && o.e.z < 230 && o.e.kind !== "cone" && o.e.kind !== "worker").sort((a, b) => a.d - b.d).slice(0, compact ? 6 : 11);
    for (const { e } of near) {
      box.setFromObject(e.g); const p = project(box, W, H); if (!p) continue;
      const bw = p.x1 - p.x0; if (bw < 20 * k) continue;
      const flagged = !!e.tag && e.tag.color !== "#00000000";
      const col = flagged ? e.tag!.color : "#3ddc97";
      ctx.lineWidth = (flagged ? 2.4 : 1.3) * k; ctx.strokeStyle = col; ctx.strokeRect(p.x0, p.y0, bw, p.y1 - p.y0);
      if (flagged) label(p.x0, p.y0, e.tag!.text + (e.tag!.text.startsWith("STOPPED") || e.tag!.text.startsWith("BROKEN") ? ` · ${String(Math.floor(faultMins / 60)).padStart(2, "0")}:${String(faultMins % 60).padStart(2, "0")}` : ""), col, 12);
      else if (!compact && bw > 46 * k && !e.stat) label(p.x0, p.y0, `${e.kind === "truck" ? "TRUCK" : e.kind === "bus" ? "BUS" : e.kind === "van" ? "VAN" : "CAR"} ${Math.round(e.v * 3.6)}`, "rgba(61,220,151,.92)", 11);
    }
    for (const t of tags) { box.setFromObject(t.obj); box.expandByScalar(0.6); const p = project(box, W, H); if (!p) continue; ctx.lineWidth = 2 * k; ctx.strokeStyle = t.color; ctx.strokeRect(p.x0 - 6 * k, p.y0 - 6 * k, p.x1 - p.x0 + 12 * k, p.y1 - p.y0 + 12 * k); label(p.x0 - 6 * k, p.y0 - 6 * k, t.text, t.color, 12); }
    // lane guides (3 lanes, right carriageway) are part of the analytics look
  };

  let raf = 0, last = performance.now(), alive = true;
  const minGap = compact ? 1000 / 20 - 2 : 0;
  const loop = (now: number) => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    if (now - last < minGap) return;
    const dt = Math.min(0.08, (now - last) / 1000); last = now;
    step(dt);
    const key = SKY[wxTarget][night ? "night" : "day"];
    tmpH.set(key[0]); tmpZ.set(key[1]);
    const a = 1 - Math.pow(0.04, dt);
    horizon.lerp(tmpH, a); zenith.lerp(tmpZ, a); dens += (key[2] - dens) * a;
    skyU.horizon.value.copy(horizon); skyU.zenith.value.copy(zenith);
    (scene.fog as THREE.FogExp2).color.copy(horizon); (scene.fog as THREE.FogExp2).density = dens;
    dust.visible = wxTarget === "sand";
    dome.position.copy(camera.position);
    placeCamera();
    renderer.render(scene, camera);
    drawHud();
  };
  raf = requestAnimationFrame(loop);

  return {
    setVms: (v) => drawVms(v.lines, v.offline), configure, setPTZ: (p) => { ptz = p; }, setOverlay: (o) => { showOverlay = o; }, setFaultMins: (m) => { faultMins = m; },
    dispose: () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); }); },
  };
}

export default function Scene3D({ cam, sc, night, overlay, ptz, onPtz, faultMins, vms, compact = false }: SceneProps) {
  const host = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), hud = useRef<HTMLCanvasElement>(null);
  const api = useRef<Api | null>(null);
  const ptzRef = useRef(ptz); ptzRef.current = ptz;
  useEffect(() => {
    const a = build(host.current!, cv.current!, hud.current!, compact); api.current = a;
    return () => { a.dispose(); api.current = null; };
  }, []);
  const key = JSON.stringify(sc);
  useEffect(() => { api.current?.configure(cam, sc, night); }, [cam.id, key, night]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.current?.setPTZ(ptz); }, [ptz]);
  useEffect(() => { api.current?.setOverlay(overlay); }, [overlay]);
  useEffect(() => { api.current?.setFaultMins(faultMins); }, [faultMins]);
  const vkey = vms.offline ? "off" : vms.lines.join("|");
  useEffect(() => { api.current?.setVms(vms); }, [vkey]); // eslint-disable-line react-hooks/exhaustive-deps

  const drag = useRef<{ x: number; yaw: number } | null>(null);
  return (
    <div ref={host} className={`cam3d ${compact ? "compact" : ""}`}
      onPointerDown={compact ? undefined : (e) => { drag.current = { x: e.clientX, yaw: ptzRef.current.yaw }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={compact ? undefined : (e) => { const d = drag.current; if (d) onPtz({ ...ptzRef.current, yaw: Math.max(-0.28, Math.min(0.28, d.yaw - (e.clientX - d.x) * 0.0007)) }); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      onWheel={compact ? undefined : (e) => { onPtz({ ...ptzRef.current, zoom: Math.max(1, Math.min(3.5, ptzRef.current.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12))) }); }}
      onDoubleClick={() => onPtz({ yaw: 0, zoom: 1 })}>
      <canvas ref={cv} className="cam3d-gl" aria-label="Simulated road camera view" />
      <canvas ref={hud} className="cam3d-hud" aria-hidden />
    </div>
  );
}
