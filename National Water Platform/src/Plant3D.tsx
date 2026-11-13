import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STAGES } from "./plantStages";

/**
 * El Hamam water-reuse plant, drawn in code with three.js (free, no models, no credits).
 * Water flows left to right: intake canal -> screening house -> clarifiers -> sand filters -> chlorine contact -> outlet canal -> pivot field.
 * Drag to turn, scroll to zoom. Labels are HTML chips that follow their 3D spot.
 */
/** the plant is folded in two rows: water runs right along row 1, turns at x = -1, then runs left along row 2 (a group turned half a circle) */
const L1 = 17, L2 = 14, L3 = 31.4, LEN = L1 + L2 + L3;
function flowAt(k: number): [number, number] { // k 0..1 along the flow, returns world x, z
  const d = k * LEN;
  if (d < L1) return [-18 + d, 0];
  if (d < L1 + L2) return [-1, d - L1];
  return [-1 - (d - L1 - L2), 14];
}

function rippleTexture(base: string, line: string, bands = 9) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = line; g.lineWidth = 3;
  for (let i = 0; i < bands; i++) {
    const y = (i * 256) / bands + 8;
    g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(64, y - 10, 128, y + 10, 256, y); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const OVERVIEW = { pos: [-11, 40, 54] as [number, number, number], target: [-17, 1.5, 7] as [number, number, number] };
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** stage = -1 shows the whole plant; 0..6 flies the camera to that stage */
export default function Plant3D({ stage, onPick }: { stage: number; onPick: (i: number) => void }) {
  const api = useRef<{ go: (i: number) => void } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const tagBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current, tagsEl = tagBox.current;
    if (!el || !tagsEl) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "st-canvas";
    el.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 1, 400);
    camera.position.set(-11, 40, 54);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(-17, 1.5, 7);
    controls.enableDamping = true; controls.enablePan = false;
    controls.minDistance = 9; controls.maxDistance = 120;
    controls.minPolarAngle = 0.25; controls.maxPolarAngle = 1.38;
    controls.autoRotate = false;
    controls.update();

    scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x1a1a5e, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(-20, 40, 25); scene.add(sun);
    const rim = new THREE.DirectionalLight(0x7aa7ff, 0.9); rim.position.set(30, 20, -30); scene.add(rim);

    const flows: THREE.Texture[] = [];
    const spinners: { o: THREE.Object3D; v: number }[] = [];
    const concrete = new THREE.MeshStandardMaterial({ color: 0x8794b8, roughness: 0.7, metalness: 0.1 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a3166, roughness: 0.6, metalness: 0.3 });
    const glow = (c: number) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.4, roughness: 0.4 });

    let root: THREE.Object3D = scene;
    const add = (o: THREE.Object3D, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); root.add(o); return o; };
    const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), x, y + h / 2, z);
    const waterMat = (base = "#1d6fd1", line = "rgba(190,235,255,0.55)", rx = 2, ry = 1) => {
      const t = rippleTexture(base, line); t.repeat.set(rx, ry); flows.push(t);
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.25, metalness: 0.1, emissive: 0x0b3a7a, emissiveIntensity: 0.5 });
    };
    /** a basin: concrete walls with a flowing water surface */
    const pool = (w: number, d: number, x: number, z: number, h = 0.9, base?: string) => {
      box(w, h, d, concrete, x, 0, z);
      const wm = waterMat(base, undefined, Math.max(1, w / 3), Math.max(1, d / 3));
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.6, d - 0.6), wm);
      p.rotation.x = -Math.PI / 2; add(p, x, h + 0.02, z);
    };

    // ground and a faint grid
    const ground = new THREE.Mesh(new THREE.CircleGeometry(78, 64), new THREE.MeshStandardMaterial({ color: 0x0c1347, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; add(ground, -17, -0.02, 7);
    const grid = new THREE.GridHelper(140, 70, 0x3a4cc0, 0x1c2570);
    (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.35; add(grid, -17, 0, 7);

    // 1 intake canal
    pool(6, 2.4, -15, 0, 0.8);
    // 2 screening house with pump chimney and glowing windows
    box(3.6, 3.2, 3.8, new THREE.MeshStandardMaterial({ color: 0x6d7fb0, roughness: 0.6 }), -9.5, 0, 0);
    box(3.9, 0.35, 4.1, dark, -9.5, 3.2, 0);
    for (const z of [-1.1, 1.1]) box(0.9, 0.9, 0.06, glow(0x67e8f9), -7.67, 1.5, z);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.2, 14), dark), -10.4, 4.7, 1.2);
    // 3 clarifiers: round tanks with a turning bridge
    for (const z of [-5.8, 0, 5.8]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 1.2, 40), concrete), -4, 0.6, z);
      const wm = waterMat("#2a86e0", "rgba(200,240,255,0.5)", 1.5, 1.5);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), wm); disc.rotation.x = -Math.PI / 2; add(disc, -4, 1.22, z);
      const arm = new THREE.Group(); arm.position.set(-4, 1.5, z); scene.add(arm);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.16, 0.34), dark); arm.add(bridge);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), glow(0xfbbf24)); dot.position.set(2.4, 0.2, 0); arm.add(dot);
      spinners.push({ o: arm, v: -0.5 });
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 12), dark), -4, 1.5, z);
    }
    // row 2: a group turned half a circle at x = -0.7, z = 14, so its local x runs to the left
    const rowB = new THREE.Group(); rowB.position.set(-0.7, 0, 14); rowB.rotation.y = Math.PI; scene.add(rowB); root = rowB;
    // 4 sand filters: 2 x 2 basins
    for (const x of [2.4, 6.9]) for (const z of [-3.4, 3.4]) pool(4.1, 5.2, x, z, 0.9, "#1c8fa8");
    // 5 chlorine contact lanes and two dosing tanks
    for (const z of [-2.4, 0, 2.4]) pool(5.2, 1.7, 12.4, z, 0.9, "#2a6fd6");
    for (const z of [-6, 6]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 3.4, 28), new THREE.MeshStandardMaterial({ color: 0x7c5cf0, roughness: 0.45, metalness: 0.25 })), 12.4, 1.7, z);
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.34, 1.34, 0.25, 28), glow(0xc4b5fd)), 12.4, 2.2, z);
    }
    // water tower
    for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 5, 8), dark), 17 + dx, 2.5, -7.5 + dz);
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 2.2, 24), concrete), 17, 6.1, -7.5);
    add(new THREE.Mesh(new THREE.ConeGeometry(2, 1, 24), dark), 17, 7.7, -7.5);
    // 6 outlet canal
    pool(4.2, 1.8, 18.2, 0, 0.7);
    // 7 pivot field: green disc, crop rings, turning arm with sprays
    const field = new THREE.Mesh(new THREE.CircleGeometry(6.4, 56), new THREE.MeshStandardMaterial({ color: 0x1c8a56, roughness: 0.9 }));
    field.rotation.x = -Math.PI / 2; add(field, 25.6, 0.03, 0);
    for (const r of [2.2, 3.5, 4.8, 6.1]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.28, r, 56), new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x0f7a4a, emissiveIntensity: 0.5, roughness: 0.8 }));
      ring.rotation.x = -Math.PI / 2; add(ring, 25.6, 0.05, 0);
    }
    const pivot = new THREE.Group(); pivot.position.set(25.6, 1.3, 0); root.add(pivot);
    pivot.add(new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.14, 0.3), new THREE.MeshStandardMaterial({ color: 0xd6dcf5, roughness: 0.4, metalness: 0.5 })));
    for (const x of [-5.6, -3.7, -1.9, 1.9, 3.7, 5.6]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 6), dark); leg.position.set(x, -0.65, 0); pivot.add(leg);
      const spray = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); spray.position.set(x, -0.3, 0); pivot.add(spray);
    }
    spinners.push({ o: pivot, v: -0.12 });
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.4, 12), dark), 25.6, 0.7, 0);

    root = scene;
    // connecting pipes at ground level
    const pipe = (x1: number, x2: number, z: number) => add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, x2 - x1, 10), glow(0x22d3ee)), (x1 + x2) / 2, 0.55, z).rotateZ(Math.PI / 2);
    pipe(-12.1, -11.5, 0); pipe(-7.6, -6.5, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 14, 10), glow(0x22d3ee)), -1, 0.55, 7).rotateX(Math.PI / 2);
    // the flow line: glowing beads travelling the whole plant along both rows
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.4 });
    const seg = (len: number, x: number, z: number, alongZ: boolean) => { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 8), lineMat), x, 2.7, z); if (alongZ) m.rotateX(Math.PI / 2); else m.rotateZ(Math.PI / 2); };
    seg(L1, -18 + L1 / 2, 0, false); seg(L2, -1, L2 / 2, true); seg(L3, -1 - L3 / 2, 14, false);
    const bead = new THREE.SphereGeometry(0.34, 12, 12), beadMat = new THREE.MeshBasicMaterial({ color: 0xa5f3fc });
    const beads = Array.from({ length: 26 }, () => { const m = new THREE.Mesh(bead, beadMat); scene.add(m); return m; });

    // real free models (Poly Haven, CC0), loaded after the first frame: control cabinets
    let alive = true;
    const loader = new GLTFLoader();
    loader.load("/models/utility_box_01/utility_box_01.gltf", (g) => {
      if (!alive) return;
      for (const [x, z, ry] of [[-7.2, -2.9, 0], [-12.4, -3, 0.3], [-5, 21.9, Math.PI]] as [number, number, number][]) {
        const c = g.scene.clone(true); c.scale.setScalar(2.2); c.position.set(x, 0, z); c.rotation.y = ry; scene.add(c);
      }
    });
    // stage ring on the ground and the camera flight
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.8, 56), new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; ring.visible = false; scene.add(ring);
    let tw: { t: number; fp: THREE.Vector3; ft: THREE.Vector3; tp: THREE.Vector3; tt: THREE.Vector3 } | null = null;
    api.current = {
      go: (i: number) => {
        const st = STAGES[i];
        const dest = st ? { pos: [st.at[0] + 6 * st.zoom, 13 * st.zoom, st.at[1] + 17 * st.zoom] as [number, number, number], target: [st.at[0], 1.5, st.at[1]] as [number, number, number] } : OVERVIEW;
        tw = { t: 0, fp: camera.position.clone(), ft: controls.target.clone(), tp: new THREE.Vector3(...dest.pos), tt: new THREE.Vector3(...dest.target) };
        ring.visible = !!st; if (st) ring.position.set(st.at[0], 0.08, st.at[1]);
      },
    };
    // labels
    const tagEls = Array.from(tagsEl.children) as HTMLElement[];
    const v = new THREE.Vector3();
    const size = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (w < 10 || h < 10) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size); ro.observe(el);

    const clock = new THREE.Clock();
    let raf = 0, t = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05); t += dt;
      if (!reduce) {
        flows.forEach((f) => { f.offset.x -= dt * 0.22; });
        spinners.forEach((s) => { s.o.rotation.y += s.v * dt; });
        beads.forEach((b, i) => { const k = (t * 0.05 + i / beads.length) % 1; const [bx, bz] = flowAt(k); b.position.set(bx, 2.7 + Math.sin(t * 3 + i) * 0.12, bz); });
      }
      if (tw) {
        tw.t = Math.min(1, tw.t + dt / 1.5);
        const k = ease(tw.t);
        camera.position.lerpVectors(tw.fp, tw.tp, k); controls.target.lerpVectors(tw.ft, tw.tt, k);
        if (tw.t >= 1) tw = null;
      }
      if (ring.visible) { const sc = 1 + 0.12 * Math.sin(t * 3); ring.scale.set(sc, sc, sc); }
      controls.update();
      renderer.render(scene, camera);
      const w = el.clientWidth, h = el.clientHeight;
      STAGES.forEach((tg, i) => {
        const e = tagEls[i]; if (!e) return;
        v.set(tg.at[0], tg.pinY, tg.at[1]).project(camera);
        const hide = v.z > 1;
        e.style.opacity = hide ? "0" : "1";
        e.style.transform = `translate(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%, -50%)`;
      });
    };
    tick();

    return () => {
      alive = false; api.current = null; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => { (x as THREE.MeshStandardMaterial).map?.dispose(); x.dispose(); });
      });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  useEffect(() => { api.current?.go(stage); }, [stage]);

  return (
    <div className="st-3d" ref={host} role="img" aria-label="3D model of the El Hamam water reuse plant. Drag to turn it.">
      <div className="st-tags" ref={tagBox}>
        {STAGES.map((tg, i) => (
          <button key={tg.id} className={`st-pin ${stage === i ? "on" : ""}`} onClick={() => onPick(i)} aria-label={`Stage ${i + 1}: ${tg.title}`}><b>{i + 1}</b><span>{tg.title}</span></button>
        ))}
      </div>
    </div>
  );
}
