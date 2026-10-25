import { useEffect, useId, useState } from "react";

/** a simplified Egypt: the Mediterranean and Red Sea coasts, Sinai and the Nile, drawn from lon/lat points */
const X0 = 300, S = 56, LON0 = 28, LAT0 = 32;
const px = (lon: number, lat: number): [number, number] => [X0 + (lon - LON0) * S, (LAT0 - lat) * S];
const path = (pts: [number, number][], close = false) => pts.map(([lo, la], i) => `${i ? "L" : "M"}${px(lo, la).map((n) => n.toFixed(1)).join(" ")}`).join(" ") + (close ? "Z" : "");

const LAND: [number, number][] = [
  [28, 31.12], [29, 30.85], [30, 31.05], [31, 31.5], [31.8, 31.6], [32.3, 31.25], [33, 31.1], [34.2, 31.3],
  [34.9, 29.5], [34.65, 29.0], [34.5, 28.5], [34.25, 27.75], [33.6, 28.3], [33.1, 29.05], [32.7, 29.6], [32.55, 29.97],
  [32.35, 29.6], [32.65, 29.1], [33.1, 28.35], [33.5, 27.75], [33.8, 27.25], [33.95, 26.75], [34.3, 26.1], [34.6, 25.5],
  [34.9, 25.05], [35.2, 24.4], [35.5, 23.9], [35.7, 23.5], [28, 23.5],
];
const NILE: [number, number][] = [[32.9, 23.5], [32.9, 24.1], [32.65, 25.7], [31.2, 27.2], [31.25, 29.0], [31.25, 30.1]];
const DELTA: [number, number][][] = [[[31.25, 30.1], [31.0, 31.4]], [[31.25, 30.1], [31.8, 31.5]]];

export interface Region { id: string; name: string; lon: number; lat: number; value: number; warn?: boolean }

/** the plant sits on the Red Sea coast at Hurghada; four coastal supply zones around it show a percentage ring */
export default function EgyptMap({ regions, unit, grow = true }: { regions: Region[]; unit: string; grow?: boolean }) {
  const uid = useId().replace(/:/g, "");
  // on a narrow screen the picture fills the panel and the empty left side is cropped, so the coast stays readable
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 1100px) and (min-height: 501px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1100px) and (min-height: 501px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const plant = px(33.85, 27.25);
  return (
    <svg className="hm-map" viewBox="0 0 860 460" preserveAspectRatio={narrow ? "xMaxYMid slice" : "xMidYMid meet"} role="img" aria-label="Map of Egypt and the Red Sea coast with the plant and four supply zones">
      <defs>
        <linearGradient id={`fx${uid}`} gradientUnits="userSpaceOnUse" x1="300" y1="0" x2="390" y2="0"><stop offset="0" stopColor="#000" /><stop offset="1" stopColor="#fff" /></linearGradient>
        <linearGradient id={`fy${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="340" x2="0" y2="450"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#000" /></linearGradient>
        <mask id={`mx${uid}`}><rect width="860" height="460" fill={`url(#fx${uid})`} /></mask>
        <mask id={`my${uid}`}><rect width="860" height="460" fill={`url(#fy${uid})`} /></mask>
      </defs>

      <text className="hm-map-big" x="36" y="236">Arab Republic</text>
      <text className="hm-map-big" x="36" y="262">of Egypt</text>
      <text className="hm-map-sea" x="330" y="14">Mediterranean Sea</text>
      <text className="hm-map-sea" x="748" y="290">Red Sea</text>

      <g mask={`url(#mx${uid})`}><g mask={`url(#my${uid})`}>
        <path className="hm-land" d={path(LAND, true)} />
        <path className="hm-nile" d={path(NILE)} />
        {DELTA.map((d, i) => <path key={i} className="hm-nile" d={path(d)} />)}
      </g></g>

      {regions.map((r, n) => {
        const [x, y] = px(r.lon, r.lat);
        const C = 2 * Math.PI * 19;
        return (
          <g key={r.id} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            <g className="hm-zone" style={{ ["--n" as string]: n }}>
            <title>{`${r.name}: ${r.value.toFixed(0)}${unit}`}</title>
            <ellipse className="hm-region" rx="36" ry="37" />
            <circle className="hm-ring-bg" r="19" />
            <circle className={`hm-ring ${r.warn ? "warn" : ""}`} r="19" strokeDasharray={`${grow ? (C * r.value) / 100 : 0} ${C}`} transform="rotate(-90)" />
            <text className="hm-ring-n" y="3" textAnchor="middle">{r.value.toFixed(0)}%</text>
            <path className={`hm-ring-t ${r.warn ? "warn" : ""}`} d={r.warn ? "M-3.5 9 L3.5 9 L0 14Z" : "M-3.5 14 L3.5 14 L0 9Z"} />
            <text className="hm-region-n" y="31" textAnchor="middle">{r.name}</text>
            </g>
          </g>
        );
      })}

      <g transform={`translate(${plant[0].toFixed(1)} ${plant[1].toFixed(1)})`}>
        <circle className="hm-plant-pulse" r="6" />
        <circle className="hm-plant" r="5" />
        <text className="hm-plant-n" x="12" y="4">Red Sea SWRO Plant</text>
      </g>
    </svg>
  );
}
