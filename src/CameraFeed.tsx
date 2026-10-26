import { useEffect, useRef, useState } from "react";
import { CLS_LABEL, SIZE, type Cam } from "./camdata";
import { lengthOf, pointAt } from "./plan";
import { REDUCE } from "./ui";

const conf = (camId: string, i: number) => 0.82 + ((camId.charCodeAt(1) * 7 + i * 37) % 17) / 100;

/** one simulated camera: a picture from the brief with detection boxes moving along paths drawn on it */
export default function CameraFeed({ cam, detect, privacy, small = false }: { cam: Cam; detect: boolean; privacy: boolean; small?: boolean }) {
  const boxes = useRef<(HTMLDivElement | null)[]>([]);
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setClock(new Date()), 1000); return () => window.clearInterval(id); }, []);

  useEffect(() => {
    if (cam.kind !== "objects") return;
    const lens = cam.objs.map((o) => lengthOf(o.path as [number, number][]));
    const place = (secs: number) => {
      cam.objs.forEach((o, i) => {
        const el = boxes.current[i];
        if (!el) return;
        const p = (((o.phase + (secs * o.speed) / lens[i]) % 1) + 1) % 1;
        const pt = pointAt(o.path as [number, number][], p, lens[i]);
        const s = 0.5 + 0.55 * pt.y, [bw, bh] = SIZE[o.cls];
        const w = bw * s * 100, h = bh * s * 100;
        el.style.left = `${pt.x * 100 - w / 2}%`;
        el.style.top = `${pt.y * 100 - h}%`;
        el.style.width = `${w}%`;
        el.style.height = `${h}%`;
        el.style.opacity = String(Math.min(1, p * 10, (1 - p) * 10));
      });
    };
    place(0);
    if (REDUCE) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => { place((now - t0) / 1000); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cam]);

  const stamp = clock.toLocaleTimeString("en-GB");
  return (
    <div className={`feed ${cam.kind} ${small ? "small" : ""} ${privacy ? "privacy" : ""}`} aria-label={`${cam.name}, camera ${cam.id}${cam.kind === "offline" ? ", offline" : ""}`}>
      {cam.kind !== "offline" && <img src={cam.img} alt="" draggable={false} />}
      {cam.kind === "offline" && <div className="noise"><span>NO SIGNAL</span></div>}
      {cam.kind === "density" && detect && cam.density?.map((d, i) => (
        <div key={i} className="blob" style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: `${d.r * 200}%`, paddingBottom: `${d.r * 200}%`, ["--v" as string]: d.v, animationDelay: `${i * -0.8}s` }}>
          {!small && <b>{Math.round(d.v * 100)}%</b>}
        </div>
      ))}
      {cam.kind === "objects" && detect && cam.objs.map((o, i) => (
        <div key={i} ref={(e) => { boxes.current[i] = e; }} className={`bx ${o.cls}`}>
          {!small && <span>{privacy ? CLS_LABEL[o.cls] : `${CLS_LABEL[o.cls]} ${conf(cam.id, i).toFixed(2)}`}</span>}
        </div>
      ))}
      <div className="scan" aria-hidden />
      <span className="ftag">{cam.id}{!small && <> · {cam.name}</>}</span>
      {cam.kind !== "offline" && <span className="rec" aria-hidden><i />REC</span>}
      {!small && <span className="stamp">{stamp}</span>}
    </div>
  );
}
