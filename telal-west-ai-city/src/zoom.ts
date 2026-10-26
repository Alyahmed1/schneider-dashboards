import { useEffect, useRef, useState } from "react";
import { REDUCE } from "./ui";

export type Box = [number, number, number, number];

/** glides the visible part of the map to a new box (a zoom), and hands back the SVG viewBox string for each frame */
export function useViewBox(target: Box, ms = 800): string {
  const [box, setBox] = useState<Box>(target);
  const cur = useRef<Box>(target);
  const key = target.join(",");
  useEffect(() => {
    const from = [...cur.current] as Box, to = target;
    if (REDUCE) { cur.current = to; setBox(to); return; }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const v = from.map((x, i) => x + (to[i] - x) * e) as Box;
      cur.current = v; setBox(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [key, ms]); // eslint-disable-line react-hooks/exhaustive-deps
  return box.map((n) => n.toFixed(1)).join(" ");
}
