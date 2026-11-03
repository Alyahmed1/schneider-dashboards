import { useEffect, useRef, useState } from "react";

/** the width/height of the box that holds a drawing, so the drawing can spread out to fill it (no empty bands at the sides, nothing cropped) */
export function useAspect<T extends Element>(min = 1, max = 5) {
  const ref = useRef<T>(null);
  const [asp, setAsp] = useState(2.8);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setAsp(Math.min(max, Math.max(min, Math.round((r.width / r.height) * 50) / 50)));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min, max]);
  return [ref, asp] as const;
}
