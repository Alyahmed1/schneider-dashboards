import { useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** numbers climb from 0 to their value, so every figure arrives in front of the viewer */
export function CountUp({ value, decimals = 0, duration = 1.3 }: { value: number; decimals?: number; duration?: number }) {
  const [v, setV] = useState(() => (reduced() ? value : 0));
  const from = useRef(reduced() ? value : 0); // counts on from the number on screen, so live updates move a little instead of restarting
  useEffect(() => {
    if (reduced()) { setV(value); from.current = value; return; }
    let raf = 0;
    const t0 = performance.now();
    const a = from.current;
    const dur = a === 0 ? duration : 0.6;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / (dur * 1000));
      const x = a + (value - a) * (1 - Math.pow(1 - p, 3));
      from.current = x;
      setV(x);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

/** the whole platform is drawn on a 1600 x 900 canvas and scaled to fit the window (never stretched) */
export const STAGE_W = 1600;
export const STAGE_H = 900;
const calc = () => (typeof window === "undefined" ? 1 : Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
export function useScale() {
  const [s, setS] = useState(calc);
  useEffect(() => {
    const on = () => setS(calc());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return s;
}

/** close a popover on outside click or Escape */
export function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open, close, ref]);
}

/** light / dark theme, remembered in localStorage and written on <html data-theme> */
export type Theme = "dark" | "light";
export const readTheme = (): Theme => { try { return localStorage.getItem("nwp-theme") === "light" ? "light" : "dark"; } catch { return "dark"; } };
export const applyTheme = (t: Theme) => { document.documentElement.dataset.theme = t; };
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => { applyTheme(theme); }, [theme]);
  const toggle = () => setTheme((t) => { const n: Theme = t === "dark" ? "light" : "dark"; try { localStorage.setItem("nwp-theme", n); } catch { /* not remembered */ } return n; });
  return [theme, toggle] as const;
}
