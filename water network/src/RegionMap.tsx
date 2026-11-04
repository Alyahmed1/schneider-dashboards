import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GOVERNORATES } from "./egyptRegions";
import { tileSpec } from "./geo";
import { darkStreetLayer } from "./geoDark";

/* The Home map, as in the reference picture: a navy map, a few big regions coloured Good, Moderate or Bad, white names, free to drag and zoom.
   The regions are the governorates around Cairo. The numbers are sample data; Cairo's water loss is the one the Network Map shows. */
export type RegionMetric = "WaterQuality" | "WaterConsumption" | "WaterLoss";
export const REGION_METRICS: { id: RegionMetric; label: string }[] = [
  { id: "WaterQuality", label: "WaterQuality" }, { id: "WaterConsumption", label: "WaterConsumption" }, { id: "WaterLoss", label: "WaterLoss" },
];
export const REGION_COLOUR = { Good: "#3db8e0", Moderate: "#f7b21d", Bad: "#c9467f" } as const;
type Level = keyof typeof REGION_COLOUR;

interface Region { name: string; label: [number, number]; quality: number; consumption: number; loss: number }
const REGIONS: Region[] = [
  { name: "Cairo", label: [30.02, 31.58], quality: 99.4, consumption: 285, loss: 16.1 },
  { name: "Giza", label: [29.45, 30.9], quality: 98.1, consumption: 245, loss: 24 },
  { name: "Sharqia", label: [30.7, 31.95], quality: 99.2, consumption: 205, loss: 19 },
  { name: "Ismailia", label: [30.62, 32.4], quality: 97.9, consumption: 188, loss: 13 },
  { name: "Suez", label: [29.7, 32.3], quality: 96.2, consumption: 176, loss: 18 },
];
/** the rule behind each colour */
const RULE: Record<RegionMetric, { title: string; unit: string; of: (r: Region) => number; level: (v: number) => Level; notes: [string, string, string] }> = {
  WaterQuality: { title: "Water quality (tests passed)", unit: "%", of: (r) => r.quality, level: (v) => (v >= 99 ? "Good" : v >= 97.5 ? "Moderate" : "Bad"), notes: ["99% or more", "97.5 to 99%", "under 97.5%"] },
  WaterConsumption: { title: "Water use per person", unit: " L/day", of: (r) => r.consumption, level: (v) => (v < 200 ? "Good" : v < 260 ? "Moderate" : "Bad"), notes: ["under 200 L/day", "200 to 260", "over 260"] },
  WaterLoss: { title: "Water lost on the way", unit: "%", of: (r) => r.loss, level: (v) => (v < 15 ? "Good" : v < 22 ? "Moderate" : "Bad"), notes: ["under 15%", "15 to 22%", "over 22%"] },
};
export const regionNotes = (m: RegionMetric) => RULE[m].notes;
const STYLE: Record<Level, L.PathOptions> = {
  Good: { color: "#8fd3ec", fillColor: REGION_COLOUR.Good, weight: 1, opacity: 0.85, fillOpacity: 0.5 },
  Moderate: { color: "#ffd36b", fillColor: REGION_COLOUR.Moderate, weight: 1, opacity: 0.95, fillOpacity: 0.95 },
  Bad: { color: "#e583ad", fillColor: REGION_COLOUR.Bad, weight: 1, opacity: 0.85, fillOpacity: 0.45 },
};
const HOME_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/></svg>`;

export default function RegionMap({ metric, onOpen }: { metric: RegionMetric; onOpen: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const P = useRef({ metric, onOpen }); P.current = { metric, onOpen };
  const kit = useRef<{ m: L.Map; poly: Map<string, L.Polygon> } | null>(null);

  useEffect(() => {
    const el = box.current!;
    const m = L.map(el, { zoomSnap: 0.25, zoomDelta: 0.5, minZoom: 5, maxZoom: 13, attributionControl: true, dragging: !L.Browser.mobile });
    m.attributionControl.setPrefix(false);
    const t = tileSpec("Streets", "dark");
    darkStreetLayer(t.url, t.attr, t.native, "quiet").addTo(m);
    const bounds = L.latLngBounds([[28.95, 30.45], [31.25, 33.0]]);
    const fit = () => m.fitBounds(bounds, { padding: [14, 14], animate: false });
    fit();

    const home = new L.Control({ position: "topleft" });
    home.onAdd = () => {
      const d = L.DomUtil.create("div", "leaflet-bar leaflet-control");
      const a = L.DomUtil.create("a", "geo-home", d) as HTMLAnchorElement;
      a.href = "#"; a.title = "Show all regions"; a.setAttribute("role", "button"); a.setAttribute("aria-label", "Show all regions");
      a.innerHTML = HOME_SVG;
      L.DomEvent.disableClickPropagation(d);
      L.DomEvent.on(a, "click", (e) => { L.DomEvent.preventDefault(e); m.flyToBounds(bounds, { padding: [14, 14], duration: 0.6 }); });
      return d;
    };
    home.addTo(m);

    const poly = new Map<string, L.Polygon>();
    for (const r of REGIONS) {
      const p = L.polygon(GOVERNORATES[r.name], { smoothFactor: 0.5, className: "geo-zone" });
      const card = () => {
        const rule = RULE[P.current.metric];
        const d = document.createElement("div"); d.className = "geo-pop";
        const row = (key: RegionMetric, name: string, v: string) => { const lv = RULE[key].level(RULE[key].of(r)); return `<span><i class="geo-dot ${lv}"></i>${name} <em>${v}</em> · ${lv}</span>`; };
        d.innerHTML = `<b>${r.name}</b>${row("WaterQuality", "Water quality", r.quality + "%")}${row("WaterConsumption", "Water use", r.consumption + " L/day per person")}${row("WaterLoss", "Water lost", r.loss + "%")}<small>Sample data. Colour shown: ${rule.title.toLowerCase()}.</small>${r.name === "Cairo" ? "<button type=\"button\">Open the New Cairo network</button>" : ""}`;
        d.querySelector("button")?.addEventListener("click", () => P.current.onOpen());
        return d;
      };
      p.bindPopup(card, { className: "geo-popup", closeButton: true });
      p.bindTooltip(() => { const rule = RULE[P.current.metric], v = rule.of(r); return `<b>${r.name}</b><span>${rule.title}: <em>${v}${rule.unit}</em> · ${rule.level(v)}</span>`; }, { sticky: true, className: "geo-tip", direction: "top", opacity: 1 });
      p.addTo(m); poly.set(r.name, p);
      L.marker(r.label, { icon: L.divIcon({ className: "geo-ico", html: `<div class="geo-rl big"><span>${r.name}</span></div>` }), interactive: false, keyboard: false }).addTo(m);
    }
    let framed = false;
    const ro = new ResizeObserver(() => { m.invalidateSize(); if (!framed && el.clientWidth > 0 && el.clientHeight > 0) { framed = true; fit(); } });
    ro.observe(el);
    kit.current = { m, poly };
    return () => { ro.disconnect(); m.remove(); kit.current = null; };
  }, []);

  useEffect(() => {
    const k = kit.current; if (!k) return;
    const rule = RULE[metric];
    for (const r of REGIONS) k.poly.get(r.name)!.setStyle(STYLE[rule.level(rule.of(r))]);
  }, [metric]);

  return <div ref={box} className="geo geo-home geo-region" data-base="navy" role="application" aria-label="Map of Egypt around Cairo. Each governorate is coloured Good, Moderate or Bad for the chosen measure. Drag and zoom; click a governorate for its numbers." />;
}
