/* ================= Map helpers: base map tiles for the Home region map, and the colours shared by the Home and Network maps ================= */
import { useEffect, useState } from "react";
import { BAD, colorOf, type Metric } from "./mapcolor";
import { PIPES, ZONES, type Pipe, type Snapshot, type ZoneId } from "./network";

/* ---------- basemaps ---------- */
export type Basemap = "Streets" | "Satellite";
export const BASEMAPS = ["Streets", "Satellite"] as const;
const ESRI = "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, USGS, OpenStreetMap contributors";
/** the street map keeps its own yellow and orange roads in both themes (dark mode recolours the land in geoDark.ts) */
export function tileSpec(base: Basemap, _theme: "light" | "dark") {
  const E = "https://server.arcgisonline.com/ArcGIS/rest/services";
  if (base === "Satellite") return { url: `${E}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, ref: `${E}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, native: 18, attr: "Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics" };
  return { url: `${E}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`, ref: null, native: 18, attr: ESRI };
}

/** the page theme ("light" | "dark"), kept live */
export function useTheme(): "light" | "dark" {
  const read = () => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
  const [t, setT] = useState<"light" | "dark">(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setT(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return t;
}

/* ---------- colours and numbers shared by Home and the Network Map ---------- */
const WIRE = "#8796a8";
export function pipeColor(metric: Metric, s: Snapshot, p: Pipe) {
  if (p.kind === "tie") return WIRE;
  const st = s.pipes[p.id];
  switch (metric) {
    case "Consumption": return colorOf(metric, st.load);
    case "Pressure": return colorOf(metric, st.pressure);
    case "Leakage": return st.leak > 0 ? BAD : p.zone === "trunk" ? WIRE : colorOf(metric, s.zones[p.zone].nrw);
  }
}
/** mean pipe load of a zone, the same number its pipes are coloured with */
export function zoneLoad(s: Snapshot, id: ZoneId) {
  const ps = PIPES.filter((p) => p.zone === id && p.kind === "tree");
  return ps.reduce((a, p) => a + s.pipes[p.id].load, 0) / ps.length;
}
export function zoneInfo(metric: Metric, s: Snapshot, id: ZoneId) {
  const z = ZONES.find((q) => q.id === id)!, q = s.zones[id];
  if (metric === "Consumption") return { z, c: colorOf(metric, zoneLoad(s, id)), big: q.supplied.toFixed(0), unit: "L/s", sub: `${q.pressure.toFixed(1)} bar · ${(q.nrw * 100).toFixed(0)}% lost` };
  if (metric === "Pressure") return { z, c: colorOf(metric, q.pressure), big: q.pressure.toFixed(1), unit: "bar", sub: `lowest ${q.minPressure.toFixed(1)} bar · ${q.supplied.toFixed(0)} L/s` };
  return { z, c: colorOf(metric, q.nrw), big: (q.nrw * 100).toFixed(0), unit: "% lost", sub: `${q.leaks} known leak${q.leaks === 1 ? "" : "s"} · ${(q.loss * 86.4).toFixed(0)} m³/day` };
}
