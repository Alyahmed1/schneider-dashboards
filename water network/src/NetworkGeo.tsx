import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { INSTRUMENTS, LEAKS, networkAt, pipeById, PIPES, readInstrument, ZONES, type Instrument, type InstrumentType, type ZoneId } from "./network";
import { GOOD, MID, type Metric } from "./mapcolor";
import { pipeColor, tileSpec, useTheme, zoneInfo } from "./geo";
import { darkStreetLayer } from "./geoDark";
import { ZONE_RINGS } from "./geoZones";
import { TONE_COLOR } from "./ui";

/* The Network Map on the real roads of New Cairo, drawn like the intro video: a water tower and a plant building, glowing cyan pipes that run along the roads
   and branch to the neighbourhoods, and glowing sensor pins with their readings. Three zones: Banafseg (the big one), Rehab and Lotus.
   Positions are sample data placed on the real areas, not a survey. */

type LL = [number, number];
export interface GeoLayers { areas: boolean; pipes: boolean; ctl: boolean }

/** where every node of the network sits (lat, lng): the plant in the south, the trunk going north to the hub, the tower in Banafseg, the branches into the three zones */
const NP: Record<string, LL> = {
  wtp: [30.0075, 31.4905], ps1: [30.0188, 31.4885], j0: [30.0330, 31.4866], res: [30.0518, 31.4683], ps2: [30.0262, 31.4930], j1: [30.0455, 31.4866],
  a1: [30.0455, 31.4722], a2: [30.0545, 31.4640], a3: [30.0640, 31.4712], a4: [30.0605, 31.4635], a5: [30.0375, 31.4668],
  c1: [30.0585, 31.4905], c2: [30.0625, 31.4968], c3: [30.0685, 31.5020], c4: [30.0580, 31.5000], c5: [30.0590, 31.5065], c6: [30.0660, 31.5068],
  d1: [30.0275, 31.5015], d2: [30.0305, 31.5150], d3: [30.0225, 31.5085], d4: [30.0315, 31.5240], d5: [30.0215, 31.5230],
};
const FACS: { id: string; name: string; icon: "plant" | "pump" | "hub" | "tank"; meters: string[] }[] = [
  { id: "wtp", name: "Treatment plant", icon: "plant", meters: ["FT-01"] },
  { id: "ps1", name: "PS-1 pumps", icon: "pump", meters: ["PU-01"] },
  { id: "j0", name: "Hub", icon: "hub", meters: ["PT-01", "AT-01"] },
  { id: "res", name: "Reservoir", icon: "tank", meters: ["LT-01"] },
  { id: "ps2", name: "PS-2 booster", icon: "pump", meters: ["PU-02", "PRV-01"] },
];
const ALL: LL[] = [...Object.values(NP), ...Object.values(ZONE_RINGS).flatMap((r) => r[0] as LL[])];
const REGION_FILL = { lv0: "#1aa7ae", lv1: "#f7c11f", lv2: "#e0405a" } as const;
const lvl = (c: string) => (c === GOOD ? "lv0" : c === MID ? "lv1" : "lv2");

const GLYPH: Record<InstrumentType, string> = { flow: "Q", pressure: "P", quality: "Cl", level: "H", pump: "M", leak: "Lk", prv: "V" };
const unitOf = (t: InstrumentType) => (t === "flow" ? " L/s" : t === "pressure" ? " bar" : t === "quality" ? " mg/L" : t === "leak" ? " dB" : "");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const ICONS = {
  plant: `<svg viewBox="0 0 36 36"><rect x="4" y="7" width="28" height="22" rx="4"/><path class="ic" d="M18 11 C22 16 25 19 25 22 A7 7 0 0 1 11 22 C11 19 14 16 18 11Z"/></svg>`,
  pump: `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="13"/><path class="ic" d="M13 11 L26 18 L13 25Z"/></svg>`,
  hub: `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="10"/><circle class="ic" cx="18" cy="18" r="4.5"/></svg>`,
  tank: (pct: number) => { const h = 16 * (pct / 100); return `<svg viewBox="0 0 36 36"><path d="M6 6 H30 L26 30 H10 Z"/><rect class="ic lvl" x="11" y="${(28 - h).toFixed(1)}" width="14" height="${h.toFixed(1)}"/></svg>`; },
};
const ringOf = (z: ZoneId) => ZONE_RINGS[z][0] as unknown as LL[];
const north = (r: LL[]): LL => r.reduce((a, p) => (p[0] > a[0] ? p : a), r[0]);

interface Props {
  metric: Metric; hour: number;
  zone: ZoneId | null; onZone: (z: ZoneId | null) => void;
  layers: GeoLayers;
  sel: string | null; onSel: (id: string) => void;
}
interface Kit {
  m: L.Map; tile: L.GridLayer | null;
  g: { areas: L.LayerGroup; pipes: L.LayerGroup; ctl: L.LayerGroup; fac: L.LayerGroup };
  poly: Map<ZoneId, L.Polygon>; label: Map<ZoneId, L.Marker>; line: Map<string, { base: L.Polyline; flow: L.Polyline; casing: L.Polyline }>; pin: Map<string, L.Marker>; fac: Map<string, L.Marker>;
  html: Map<string, string>;
  fit: () => void;
}
const PAD: L.FitBoundsOptions = { paddingTopLeft: [60, 96], paddingBottomRight: [60, 50], animate: false };

export default function NetworkGeo(props: Props) {
  const { metric, hour, zone, layers, sel } = props;
  const theme = useTheme();
  const box = useRef<HTMLDivElement>(null);
  const P = useRef(props); P.current = props;
  const kit = useRef<Kit | null>(null);
  const [ready, setReady] = useState(0);
  const [zoomN, setZoomN] = useState(0); // counts moves, so the badges are laid out again

  /* ---------- build the map once ---------- */
  useEffect(() => {
    const el = box.current!;
    const m = L.map(el, { zoomSnap: 0.25, zoomDelta: 0.5, minZoom: 12, maxZoom: 18, zoomControl: true, attributionControl: true });
    m.attributionControl.setPrefix(false);
    m.createPane("zones").style.zIndex = "410";
    m.createPane("pipes").style.zIndex = "420";
    const bounds = L.latLngBounds(ALL);
    const fit = () => m.fitBounds(bounds, PAD);
    fit();

    const homeBtn = new L.Control({ position: "topleft" });
    homeBtn.onAdd = () => {
      const d = L.DomUtil.create("div", "leaflet-bar leaflet-control");
      const a = L.DomUtil.create("a", "geo-home", d) as HTMLAnchorElement;
      a.href = "#"; a.title = "Show the whole network"; a.setAttribute("role", "button"); a.setAttribute("aria-label", "Show the whole network");
      a.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/></svg>`;
      L.DomEvent.disableClickPropagation(d);
      L.DomEvent.on(a, "click", (e) => { L.DomEvent.preventDefault(e); P.current.onZone(null); m.flyToBounds(bounds, { ...PAD, animate: true, duration: 0.6 }); });
      return d;
    };
    homeBtn.addTo(m);

    const g = { areas: L.layerGroup(), pipes: L.layerGroup(), ctl: L.layerGroup(), fac: L.layerGroup() };
    const k: Kit = { m, tile: null, g, poly: new Map(), label: new Map(), line: new Map(), pin: new Map(), fac: new Map(), html: new Map(), fit };
    const snap = () => networkAt(P.current.hour);

    // the three regions, with their name and figures above them
    for (const z of ZONES) {
      const ring = ringOf(z.id);
      const poly = L.polygon(ring, { pane: "zones", weight: 2.4, className: "ng-zone", smoothFactor: 0.5 });
      poly.on("click", () => P.current.onZone(P.current.zone === z.id ? null : z.id));
      poly.bindTooltip(() => { const q = snap().zones[z.id]; return `<b>${esc(z.name)}</b><span>Use <em>${q.demand.toFixed(0)} L/s</em> · pressure <em>${q.pressure.toFixed(1)} bar</em></span><span>Water lost <em>${(q.nrw * 100).toFixed(0)}%</em> · ${(q.loss * 86.4).toFixed(0)} m³/day</span><span>Click to focus this zone</span>`; }, { sticky: true, className: "geo-tip", direction: "top", opacity: 1 });
      poly.addTo(g.areas); k.poly.set(z.id, poly);
      const lab = L.marker(north(ring), { icon: L.divIcon({ className: "geo-ico", html: "" }), zIndexOffset: 600, keyboard: false });
      lab.on("click", () => P.current.onZone(P.current.zone === z.id ? null : z.id));
      lab.addTo(g.areas); k.label.set(z.id, lab);
    }

    // pipes: a dark casing, the coloured pipe with a glow, and moving water
    for (const p of PIPES) {
      if (p.kind === "tie" || !NP[p.from] || !NP[p.to]) continue;
      const ll = [NP[p.from], NP[p.to]];
      const casing = L.polyline(ll, { pane: "pipes", className: "ng-case", lineCap: "round", interactive: false });
      const base = L.polyline(ll, { pane: "pipes", className: "ng-pipe", lineCap: "round" });
      const flow = L.polyline(ll, { pane: "pipes", className: "ng-flow", color: "#fff", lineCap: "round", dashArray: "1 12", interactive: false });
      base.bindTooltip(() => {
        const s = snap(), st = s.pipes[p.id], zn = p.zone === "trunk" ? "Trunk main" : ZONES.find((z) => z.id === p.zone)!.name;
        return `<b>${p.id} · DN${p.dn} · ${esc(zn)}</b><span>Flow <em>${st.flow.toFixed(0)} L/s</em> · ${st.velocity.toFixed(2)} m/s</span><span>Pressure <em>${st.pressure.toFixed(1)} bar</em> · ${p.length} m long</span>${st.leak > 0 ? `<span class="bad">Leak ${st.leak} L/s</span>` : ""}`;
      }, { sticky: true, className: "geo-tip", direction: "top", opacity: 1 });
      casing.addTo(g.pipes); base.addTo(g.pipes); flow.addTo(g.pipes);
      k.line.set(p.id, { base, flow, casing });
    }

    // the plant, the pumps, the hub and the tower
    for (const f of FACS) {
      const mk = L.marker(NP[f.id], { icon: L.divIcon({ className: "geo-ico", html: "" }), zIndexOffset: 500, keyboard: false });
      mk.bindPopup(() => {
        const s = snap(); const d = document.createElement("div"); d.className = "geo-pop";
        const rows = f.id === "res" ? `<span>Level <em>${s.tank.toFixed(0)}%</em></span><span>Net flow <em>${s.tankFlow >= 0 ? "filling" : "emptying"} ${Math.abs(s.tankFlow).toFixed(0)} L/s</em></span>`
          : f.id === "ps2" ? `<span>Boosts Lotus by <em>14 m</em></span>` : f.id === "j0" ? `<span>Where the water splits: the tower, Banafseg, Rehab and (through PS-2) Lotus</span>` : `<span>Output <em>${s.plant.toFixed(0)} L/s</em></span>`;
        d.innerHTML = `<b>${esc(f.name)}</b>${rows}`; return d;
      }, { className: "geo-popup", offset: [0, -4] });
      mk.addTo(g.fac); k.fac.set(f.id, mk);
    }

    // controllers: a glowing pin each, with its reading beside it when there is room
    for (const inst of INSTRUMENTS) {
      const mk = L.marker(anchorOf(inst), { icon: L.divIcon({ className: "geo-ico", html: "" }), zIndexOffset: 300, keyboard: true, title: `${inst.id} ${inst.name}` });
      mk.on("click", () => P.current.onSel(inst.id));
      mk.bindTooltip(() => { const r = readInstrument(inst, P.current.hour); return `<b>${inst.id} · ${esc(inst.name)}</b><span>${esc(r.text)} · ${esc(r.detail)}</span>`; }, { className: "geo-tip", direction: "top", offset: [0, -16], opacity: 1 });
      mk.addTo(g.ctl); k.pin.set(inst.id, mk);
    }

    for (const key of ["areas", "pipes", "fac", "ctl"] as const) g[key].addTo(m);
    m.on("moveend zoomend", () => setZoomN((n) => n + 1));
    let touched = false;
    for (const ev of ["pointerdown", "wheel", "touchstart"]) el.addEventListener(ev, () => { touched = true; }, { passive: true });
    const ro = new ResizeObserver(() => { m.invalidateSize(); if (!touched && el.clientWidth > 0 && el.clientHeight > 0) fit(); });
    ro.observe(el);
    kit.current = k; setReady((n) => n + 1);
    return () => { ro.disconnect(); m.remove(); kit.current = null; };
  }, []);

  /* ---------- the basemap follows the theme ---------- */
  useEffect(() => {
    const k = kit.current; if (!k) return;
    const t = tileSpec("Streets", theme);
    if (k.tile) k.m.removeLayer(k.tile);
    k.tile = darkStreetLayer(t.url, t.attr, t.native, theme === "dark" ? "rich" : "sky");
    k.tile.addTo(k.m); k.tile.bringToBack();
    k.m.getContainer().dataset.base = theme;
  }, [ready, theme]);

  /* ---------- restyle as the hour, the colouring, the zone and the layers change ---------- */
  useEffect(() => {
    const k = kit.current; if (!k) return;
    const s = networkAt(hour);
    const dim = (z: ZoneId | "trunk") => zone !== null && z !== "trunk" && z !== zone;
    const setHtml = (key: string, mk: L.Marker, html: string, size: L.PointExpression, anchor: L.PointExpression) => {
      if (k.html.get(key) === html) return;
      k.html.set(key, html);
      mk.setIcon(L.divIcon({ className: "geo-ico", html, iconSize: size, iconAnchor: anchor }));
    };
    const toggle = (g: L.LayerGroup, on: boolean) => { if (on && !k.m.hasLayer(g)) g.addTo(k.m); if (!on && k.m.hasLayer(g)) k.m.removeLayer(g); };
    toggle(k.g.areas, layers.areas); toggle(k.g.pipes, layers.pipes); toggle(k.g.ctl, layers.ctl);

    for (const z of ZONES) {
      const i = zoneInfo(metric, s, z.id), d = dim(z.id), on = zone === z.id, q = s.zones[z.id];
      k.poly.get(z.id)!.setStyle({ color: "#e8f4ff", fillColor: REGION_FILL[lvl(i.c) as keyof typeof REGION_FILL], opacity: d ? 0.35 : 0.95, fillOpacity: d ? 0.1 : on ? 0.5 : 0.36, weight: on ? 4 : 2.4 });
      const leaks = LEAKS.filter((l) => pipeById(l.pipe).zone === z.id);
      setHtml(`z${z.id}`, k.label.get(z.id)!,
        `<div class="ng-zl ${lvl(i.c)} ${d ? "dim" : ""} ${on ? "on" : ""}"><b class="n">${esc(z.name)}</b><span class="v"><b>${i.big}</b> ${esc(i.unit)}</span><span class="s">${q.pressure.toFixed(1)} bar · ${(q.nrw * 100).toFixed(0)}% lost</span>${leaks.map((l) => `<span class="lk"><i></i>Leak ${l.rate} L/s</span>`).join("")}</div>`,
        [0, 0], [0, 0]);
    }
    for (const p of PIPES) {
      const ln = k.line.get(p.id); if (!ln) continue;
      const st = s.pipes[p.id], d = dim(p.zone), w = Math.min(10, 4.5 + p.dn / 200);
      ln.casing.setStyle({ weight: w + 5, opacity: d ? 0.15 : 0.9 });
      ln.base.setStyle({ color: pipeColor(metric, s, p), weight: w, opacity: d ? 0.25 : 1 });
      const moving = !st.closed && st.flow > 0.5;
      ln.flow.setStyle({ weight: Math.max(2, w * 0.36), opacity: moving && !d ? 0.95 : 0 });
      const el = ln.flow.getElement() as SVGPathElement | undefined;
      if (el) { el.style.setProperty("--dur", `${Math.max(0.35, Math.min(4, 13 / (Math.max(st.velocity, 0.05) * 14)))}s`); el.classList.toggle("rev", st.reverse); }
    }
    for (const f of FACS) {
      const nm = f.id === "res" ? `${s.tank.toFixed(0)}% full` : f.id === "wtp" ? `${s.plant.toFixed(0)} L/s out` : f.id === "ps2" ? "Adds 14 m" : f.id === "ps1" ? "Duty pump running" : "Water splits here";
      const svg = f.icon === "tank" ? ICONS.tank(s.tank) : ICONS[f.icon];
      setHtml(`f${f.id}`, k.fac.get(f.id)!, `<div class="ng-fac ${f.icon}"><span class="gi">${svg}</span><b>${esc(f.name)}</b><i>${esc(nm)}</i></div>`, [140, 92], [70, 24]);
    }
  }, [ready, metric, hour, zone, layers.areas, layers.pipes, layers.ctl]);

  /* ---------- controllers: each pin and, where there is room, its reading ---------- */
  useEffect(() => {
    const k = kit.current; if (!k) return;
    const m = k.m, w = m.getSize();
    const rect = (x: number, y: number, ww: number, hh: number) => ({ x, y, w: ww, h: hh });
    const fixed: { x: number; y: number; w: number; h: number }[] = [];
    for (const f of FACS) { const p = m.latLngToContainerPoint(NP[f.id]); fixed.push(rect(p.x - 70, p.y - 26, 140, 92)); }
    for (const z of ZONES) { const p = m.latLngToContainerPoint(north(ringOf(z.id))); fixed.push(rect(p.x - 80, p.y - 112, 160, 108)); }
    const placed = [...fixed];
    const order = [...INSTRUMENTS].sort((a, b) => Number(readInstrument(b, hour).tone !== "good") - Number(readInstrument(a, hour).tone !== "good"));
    const fan = new Map<string, number>();
    const sizeOf = (_i: Instrument, text: string) => 24 + 6 + text.length * 7.2 + 12;
    const html: Record<string, { html: string; ax: number; ay: number; w: number }> = {};
    const dims = (z: ZoneId | "trunk") => zone !== null && z !== "trunk" && z !== zone;
    for (const inst of order) {
      const r = readInstrument(inst, hour), off = inst.forced === "offline";
      const txt = off ? "offline" : r.text;
      const key = inst.at.node ?? inst.at.pipe!;
      const n = fan.get(key) ?? 0; fan.set(key, n + 1);
      const base = m.latLngToContainerPoint(anchorOf(inst));
      const dx = n === 0 ? 0 : (n % 2 ? 1 : -1) * 20, dy = n === 0 ? 0 : -14 * n;
      const px = base.x + dx, py = base.y + dy, cw = sizeOf(inst, txt), ch = 24;
      const pin = rect(px - 14, py - 14, 28, 28);
      if (px < -20 || py < -20 || px > w.x + 20 || py > w.y + 20) continue;
      placed.push(pin);
      const cands: [number, number][] = [[17, -ch / 2], [-17 - cw, -ch / 2], [-cw / 2, -ch - 17], [-cw / 2, 17], [17, 6], [-17 - cw, 6], [17, -ch - 6], [-17 - cw, -ch - 6]];
      let side = -1;
      for (let i = 0; i < cands.length; i++) {
        const c = rect(px + cands[i][0], py + cands[i][1], cw, ch);
        if (c.x < 4 || c.y < 4 || c.x + c.w > w.x - 4 || c.y + c.h > w.y - 4) continue;
        if (placed.some((q) => c.x < q.x + q.w + 3 && c.x + c.w + 3 > q.x && c.y < q.y + q.h + 3 && c.y + c.h + 3 > q.y)) continue;
        side = i; placed.push(c); break;
      }
      const zn = inst.at.node ? (/^a/.test(inst.at.node) ? "Z1" : /^c/.test(inst.at.node) ? "Z3" : /^d/.test(inst.at.node) ? "Z4" : "trunk") : (() => { const t = pipeById(inst.at.pipe!).to; return /^a/.test(t) ? "Z1" : /^c/.test(t) ? "Z3" : /^d/.test(t) ? "Z4" : "trunk"; })();
      const unit = off ? "" : unitOf(inst.type);
      const num = off ? "offline" : r.text.replace(/ (L\/s|bar|mg\/L|dB)$/, "").replace(" %", "%");
      const chip = side < 0 ? "" : `<span class="ng-chip" style="left:${cands[side][0] + 14}px;top:${cands[side][1] + 14}px;width:${cw}px"><b>${esc(num)}</b>${esc(unit)}</span>`;
      html[inst.id] = { html: `<div class="ng-pin ${r.tone} ${sel === inst.id ? "sel" : ""} ${dims(zn as ZoneId | "trunk") ? "dim" : ""}"><i style="background:${TONE_COLOR[r.tone]}">${GLYPH[inst.type]}</i><u></u>${chip}</div>`, ax: 14 - dx, ay: 14 - dy, w: cw };
    }
    for (const inst of INSTRUMENTS) {
      const mk = k.pin.get(inst.id)!, h = html[inst.id];
      if (!h) { mk.getElement()?.style.setProperty("display", "none"); continue; }
      mk.getElement()?.style.removeProperty("display");
      const key = `i${inst.id}`;
      if (k.html.get(key) !== h.html + h.ax + h.ay) { k.html.set(key, h.html + h.ax + h.ay); mk.setIcon(L.divIcon({ className: "geo-ico", html: h.html, iconSize: [28, 28], iconAnchor: [h.ax, h.ay] })); }
    }
  }, [ready, zoomN, hour, sel, zone, layers.ctl]);

  /* a zone picked in the list or on the map: frame it */
  useEffect(() => {
    const k = kit.current; if (!k || !ready) return;
    if (zone) k.m.flyToBounds(L.latLngBounds(ringOf(zone)), { paddingTopLeft: [50, 110], paddingBottomRight: [50, 50], duration: 0.6, maxZoom: 16 });
    else k.m.flyToBounds(L.latLngBounds(ALL), { ...PAD, animate: true, duration: 0.6 });
  }, [zone]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={box} className="geo ng" role="application" aria-label="Map of the water network over New Cairo with three zones: Banafseg, Rehab and Lotus. Drag to move, scroll or use the plus and minus to zoom." />;
}

function anchorOf(inst: Instrument): LL {
  if (inst.at.node) return NP[inst.at.node];
  const p = pipeById(inst.at.pipe!), t = inst.type === "prv" ? 0.7 : 0.45, a = NP[p.from], b = NP[p.to];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
