import { createContext, useEffect, useState } from "react";

/**
 * The dashboard is drawn on a design canvas (the "stage") and scaled to fit the screen, never stretched:
 *  - landscape: the stage is 800 high and 1066..1440 wide (4:3 up to 9:5), so a 4:3, 16:10, 3:2 or 16:9 tablet is filled edge to edge
 *  - portrait: the stage is 800 wide and 1066..1440 high
 *  - phone (short side under 720 px): no scaling at all. The stage is the screen at its natural size (1 design px = 1 css px), one column, and the page scrolls; scaling an 800 px canvas down to a phone would shrink the text to 5 px.
 * The stage keeps its shape, so a screen wider or taller than that range gets calm bars of the background picture, not distortion.
 */
export interface Stage { w: number; h: number; scale: number; x: number; y: number; portrait: boolean; phone: boolean }

/** true when the dashboard runs in phone mode (the drawings switch to their compact versions) */
export const PhoneContext = createContext(false);
export const PHONE_MAX = 720;

const BASE = 800;
const LONG_MIN = 1066;
const LONG_MAX = 1440;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function measureStage(vw: number, vh: number): Stage {
  const portrait = vh > vw;
  if (Math.min(vw, vh) < PHONE_MAX) return { w: vw, h: vh, scale: 1, x: 0, y: 0, portrait, phone: true };
  const ratio = portrait ? vh / vw : vw / vh;
  const long = Math.round(clamp(ratio * BASE, LONG_MIN, LONG_MAX));
  const w = portrait ? BASE : long;
  const h = portrait ? long : BASE;
  const scale = Math.min(vw / w, vh / h);
  return { w, h, scale, x: (vw - w * scale) / 2, y: (vh - h * scale) / 2, portrait, phone: false };
}

export function useStage(): Stage {
  const read = () => {
    const vv = window.visualViewport;
    return measureStage(vv?.width ?? window.innerWidth, vv?.height ?? window.innerHeight);
  };
  const [s, setS] = useState<Stage>(read);
  useEffect(() => {
    const on = () => setS(read());
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    window.visualViewport?.addEventListener("resize", on);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
      window.visualViewport?.removeEventListener("resize", on);
    };
  }, []);
  return s;
}
