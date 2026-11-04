import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GOOD, MID, SHOWS, type Metric } from "./mapcolor";
import { INSTRUMENTS, LEAKS, networkAt, NODES, PIPES, pipeById, readInstrument, ZONES, type InstrumentType, type Pipe, type ZoneId } from "./network";
import { TONE_COLOR } from "./ui";
import { darkStreetLayer } from "./geoDark";
import { ALL_LL, pipeColor, pipeLine, pipeMid, tileSpec, useTheme, zoneInfo, ZONE_AREA, nodeLL, type Basemap } from "./geo";

export interface GeoLayers { areas: boolean; pipes: boolean; inst: boolean; leaks: boolean }
export interface GeoFocus { lat: number; lng: number; n: number; zoom?: number }

interface Props {
  mode: "home" | "network";
  metric: Metric; hour: number;
  /** plant output, m³/h (Home) */
  flow?: number;
  basemap?: Basemap;
  zone?: ZoneId | null; onZone?: (z: ZoneId | null) => void;
  layers?: GeoLayers;
  sel?: string | null; onSel?: (id: string) => void;
  onOpen?: () => void;
  focus?: GeoFocus | null;
  label?: string;
}

const GLYPH: Record<InstrumentType, string> = { flow: "Q", pressure: "P", quality: "Cl", level: "H", pump: "M", leak: "Lk", prv: "V" };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const dnW = (p: Pipe, mode: "home" | "network") => (mode === "home" ? (p.zone === "trunk" ? 3 : 2) : Math.min(5.5, 2 + p.dn / 230));
/** Home uses the colours of the reference map: blue is good, yellow is moderate, pink is bad */
export const REGION = { good: "#3db8e0", moderate: "#f7b21d", bad: "#c9467f" } as const;
const regionColour = (c: string) => (c === GOOD ? REGION.good : c === MID ? REGION.moderate : REGION.bad);

const SVG_PLANT = `<svg viewBox="0 0 36 36"><rect x="3" y="6" width="30" height="24" rx="4"/><path class="ic" d="M18 10 C22 15 25 18 25 21.500 A7 7 0 0 1 11 21.500 C11 18 14 15 18 10Z"/></svg>`;
const SVG_PUMP = `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="14"/><path class="ic" d="M13 11 L26 18 L13 25Z"/></svg>`;
const svgTank = (pct: number) => { const h = 16 * (pct / 100); return `<svg viewBox="0 0 36 36"><path d="M6 6 H30 L26 30 H10 Z"/><rect class="ic lvl" x="11" y="${(28 - h).toFixed(1)}" width="14" height="${h.toFixed(1)}"/></svg>`; };

const HOME_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/></svg>`;

interface Kit {
  m: L.Map; tile: L.GridLayer | null; ref: L.TileLayer | null;
  g: { areas: L.LayerGroup; pipes: L.LayerGroup; inst: L.LayerGroup; leaks: L.LayerGroup; assets: L.LayerGroup };
  poly: Map<ZoneId, L.Polygon>; label: Map<ZoneId, L.Marker>;
  line: Map<string, { base: L.Polyline; flow: L.Polyline | null }>;
  inst: Map<string, L.Marker>; asset: Map<string, L.Marker>; leak: Map<string, L.Marker>;
  html: Map<string, string>;
  fit: () => void;
}

/** the Home map and the Network Map: the same real map, the same layers, drawn once and restyled as the hour and the colouring change */
export default function GeoNetwork(props: Props) {
  const { mode, metric, hour, flow, basemap = "Streets", zone = null, layers, sel = null } = props;
  const theme = useTheme();
  const box = useRef<HTMLDivElement>(null);
  const P = useRef(props); P.current = props;
  const kit = useRef<Kit | null>(null);
  const [ready, setReady] = useState(0); // counts map builds, so the effects below run after each one
  const lay: GeoLayers = layers ?? { areas: true, pipes: true, inst: mode === "network", leaks: true };

  /* ---------- build the map once ---------- */
  useEffect(() => {
    const el = box.current!;
    const m = L.map(el, {
      zoomSnap: 0.25, zoomDelta: 0.5, minZoom: 12, maxZoom: 18, zoomControl: true, attributionControl: true,
      dragging: P.current.mode === "network" || !L.Browser.mobile, // on a phone the Home map must not trap the page scroll
    });
    m.attributionControl.setPrefix(false);
    m.createPane("zones").style.zIndex = "410";
    m.createPane("pipes").style.zIndex = "420";
    const lp = m.createPane("labels"); lp.style.zIndex = "430"; lp.style.pointerEvents = "none";
    const fit = () => m.fitBounds(L.latLngBounds(ALL_LL), { padding: [44, 44], animate: false });
    fit();

    const homeBtn = new L.Control({ position: "topleft" });
    homeBtn.onAdd = () => {
      const d = L.DomUtil.create("div", "leaflet-bar leaflet-control");
      const a = L.DomUtil.create("a", "geo-home", d) as HTMLAnchorElement;
      a.href = "#"; a.title = "Show the whole network"; a.setAttribute("role", "button"); a.setAttribute("aria-label", "Show the whole network");
      a.innerHTML = HOME_SVG;
      L.DomEvent.disableClickPropagation(d);
      L.DomEvent.on(a, "click", (e) => { L.DomEvent.preventDefault(e); m.flyToBounds(L.latLngBounds(ALL_LL), { padding: [44, 44], duration: 0.6 }); });
      return d;
    };
    homeBtn.addTo(m);

    const g = { areas: L.layerGroup(), pipes: L.layerGroup(), inst: L.layerGroup(), leaks: L.layerGroup(), assets: L.layerGroup() };
    const snap = () => networkAt(P.current.hour);
    const net = P.current.mode === "network";
    const k: Kit = { m, tile: null, ref: null, g, poly: new Map(), label: new Map(), line: new Map(), inst: new Map(), asset: new Map(), leak: new Map(), html: new Map(), fit };

    // zone areas and their labels
    for (const z of ZONES) {
      const poly = L.polygon(ZONE_AREA[z.id].rings, { pane: "zones", weight: 2, className: "geo-zone", smoothFactor: 0.5 });
      poly.on("click", (e) => {
        if (P.current.mode === "network") P.current.onZone?.(P.current.zone === z.id ? null : z.id);
        else k.label.get(z.id)?.openPopup(e.latlng);
      });
      poly.bindTooltip(() => {
        const i = zoneInfo(P.current.metric, snap(), z.id), q = snap().zones[z.id];
        return `<b>${esc(z.name)}</b><span>Use <em>${q.demand.toFixed(0)} L/s</em> · pressure <em>${q.pressure.toFixed(1)} bar</em></span><span>Water lost <em>${(q.nrw * 100).toFixed(0)}%</em> · ${(q.loss * 86.4).toFixed(0)} m³/day</span><span>${i.sub}</span>`;
      }, { sticky: true, className: "geo-tip", direction: "top", opacity: 1 });
      poly.addTo(g.areas); k.poly.set(z.id, poly);

      const lab = L.marker(ZONE_AREA[z.id].top, { icon: L.divIcon({ className: "geo-ico", html: "" }), keyboard: false, zIndexOffset: 100 });
      lab.on("click", () => {
        if (P.current.mode === "network") P.current.onZone?.(P.current.zone === z.id ? null : z.id);
        else lab.openPopup();
      });
      if (!net) {
        lab.bindPopup(() => {
          const s = snap(), i = zoneInfo(P.current.metric, s, z.id), q = s.zones[z.id];
          const d = document.createElement("div"); d.className = "geo-pop";
          d.innerHTML = `<b>${esc(z.name)}</b><span>Use <em>${q.demand.toFixed(0)} L/s</em> · pressure <em>${q.pressure.toFixed(1)} bar</em></span><span>Water lost <em style="color:${i.c}">${(q.nrw * 100).toFixed(0)}%</em> · ${(q.loss * 86.4).toFixed(0)} m³/day</span><span>Known leaks <em>${q.leaks}</em> · lowest chlorine <em>${q.minChlorine.toFixed(2)} mg/L</em></span><button type="button">Open in the network map</button>`;
          d.querySelector("button")!.addEventListener("click", () => P.current.onOpen?.());
          return d;
        }, { className: "geo-popup", closeButton: true, offset: [0, -6] });
      }
      lab.addTo(g.areas); k.label.set(z.id, lab);
    }

    // pipes
    PIPES.forEach((p) => {
      const ll = pipeLine(p);
      const base = L.polyline(ll, { pane: "pipes", className: "geo-pipe", lineCap: "round", interactive: false });
      base.addTo(g.pipes);
      let fl: L.Polyline | null = null;
      if (p.kind !== "tie") {
        fl = L.polyline(ll, { pane: "pipes", className: "geo-flow", color: "#fff", lineCap: "round", dashArray: "1 12", interactive: false });
        fl.addTo(g.pipes);
      }
      if (net) {
        const hit = L.polyline(ll, { pane: "pipes", weight: 18, opacity: 0, className: "geo-hit" });
        hit.bindTooltip(() => {
          const s = snap(), st = s.pipes[p.id];
          const zn = p.zone === "trunk" ? "Trunk main" : ZONES.find((z) => z.id === p.zone)!.name;
          if (p.kind === "tie") return `<b>${p.id} · DN${p.dn} · ${esc(zn)}</b><span>Closed tie valve: no flow</span>`;
          return `<b>${p.id} · DN${p.dn} · ${esc(zn)}</b><span>Flow <em>${st.flow.toFixed(0)} L/s</em> · ${st.velocity.toFixed(2)} m/s</span><span>Pressure <em>${st.pressure.toFixed(1)} bar</em> · head loss ${st.headloss.toFixed(1)} m</span><span>Water age <em>${((s.nodes[p.from].age + s.nodes[p.to].age) / 2).toFixed(1)} h</em> · ${p.length} m long</span>${st.leak > 0 ? `<span class="bad">Leak ${st.leak} L/s</span>` : ""}`;
        }, { sticky: true, className: "geo-tip", direction: "top", opacity: 1 });
        hit.addTo(g.pipes);
        if (p.kind === "tie") {
          L.marker(pipeMid(p), { icon: L.divIcon({ className: "geo-ico", html: `<div class="geo-valve"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.500"/><path d="M5.200 5.200 10.800 10.800M10.800 5.200 5.200 10.800"/></svg></div>`, iconSize: [16, 16], iconAnchor: [8, 8] }), interactive: false, keyboard: false }).addTo(g.pipes);
        }
      }
      k.line.set(p.id, { base, flow: fl });
    });

    // plant, pumps, reservoir
    for (const n of NODES.filter((q) => q.kind === "plant" || q.kind === "pump" || q.kind === "tank")) {
      const mk = L.marker(nodeLL(n.id), { icon: L.divIcon({ className: "geo-ico", html: "" }), zIndexOffset: 400, keyboard: false });
      mk.bindPopup(() => {
        const s = snap(); const d = document.createElement("div"); d.className = "geo-pop";
        const f = P.current.flow ?? 0;
        const rows = n.kind === "tank" ? `<span>Level <em>${s.tank.toFixed(0)}%</em></span><span>Net flow <em>${s.tankFlow >= 0 ? "filling" : "emptying"} ${Math.abs(s.tankFlow).toFixed(0)} L/s</em></span>`
          : n.id === "ps2" ? `<span>Boosts the south and west zones by <em>14 m</em></span>` : `<span>Output <em>${f ? f.toLocaleString("en-US") + " m³/h" : s.plant.toFixed(0) + " L/s"}</em></span>`;
        d.innerHTML = `<b>${esc(n.name ?? n.id)}</b>${rows}`;
        return d;
      }, { className: "geo-popup", offset: [0, -4] });
      mk.addTo(g.assets); k.asset.set(n.id, mk);
    }

    // known leaks
    for (const l of LEAKS) {
      const mk = L.marker(pipeMid(pipeById(l.pipe), 0.55), {
        icon: L.divIcon({ className: "geo-ico", html: `<div class="geo-leak"><i class="r1"></i><i class="r2"></i><b></b><span>${l.rate} L/s</span></div>`, iconSize: [30, 30], iconAnchor: [15, 15] }), zIndexOffset: 500, keyboard: false,
      });
      mk.bindPopup(() => {
        const d = document.createElement("div"); d.className = "geo-pop";
        d.innerHTML = `<b>${l.id} · ${l.rate} L/s</b><span>${esc(l.note)}</span><span>Running for <em>${esc(l.since)}</em> · <em>${esc(l.status)}</em></span><span>That is about <em>${(l.rate * 86.4).toFixed(0)} m³ every day</em></span>`;
        return d;
      }, { className: "geo-popup", offset: [0, -8] });
      mk.addTo(g.leaks); k.leak.set(l.id, mk);
    }

    // instruments: spread out when they share a spot, with a thin lead line back to it
    if (net) {
      const seen = new Map<string, number>();
      for (const inst of INSTRUMENTS) {
        const key = inst.at.node ?? `${inst.at.pipe}`;
        const i = seen.get(key) ?? 0; seen.set(key, i + 1);
        const base = inst.at.node ? nodeLL(inst.at.node) : pipeMid(pipeById(inst.at.pipe!), inst.type === "prv" ? 0.72 : 0.4);
        const off = inst.at.node || i > 0;
        const ang = (-90 + i * 70 + (inst.at.node ? 0 : 40)) * (Math.PI / 180), r = inst.at.node ? 30 : 26;
        const dx = off ? Math.cos(ang) * r : 0, dy = off ? Math.sin(ang) * r : 0;
        const mk = L.marker(base, { icon: L.divIcon({ className: "geo-ico", html: "" }), zIndexOffset: 300, keyboard: true, title: `${inst.id} ${inst.name}` });
        (mk as L.Marker & { geoOff: [number, number] }).geoOff = [dx, dy];
        mk.on("click", () => P.current.onSel?.(inst.id));
        mk.bindTooltip(() => { const r2 = readInstrument(inst, P.current.hour); return `<b>${inst.id} · ${esc(inst.name)}</b><span>${esc(r2.text)} · ${esc(r2.detail)}</span>`; }, { className: "geo-tip", direction: "top", offset: [0, -14], opacity: 1 });
        k.inst.set(inst.id, mk);
      }
    }

    for (const key of ["areas", "pipes", "assets", "leaks", "inst"] as const) g[key].addTo(m);
    const zc = () => { el.classList.toggle("geo-z15", m.getZoom() >= 15); el.classList.toggle("geo-z155", m.getZoom() >= 15.5); };
    m.on("zoomend", zc); zc();
    // the box has no size until the page has laid it out, so frame the network the first time it has one
    let framed = false;
    const ro = new ResizeObserver(() => { m.invalidateSize(); if (!framed && el.clientWidth > 0 && el.clientHeight > 0) { framed = true; fit(); } });
    ro.observe(el);
    kit.current = k; setReady((n) => n + 1);
    return () => { ro.disconnect(); m.remove(); kit.current = null; };
  }, []);

  /* ---------- basemap: follows the page theme ---------- */
  useEffect(() => {
    const k = kit.current; if (!k) return;
    const t = tileSpec(basemap, theme);
    if (k.tile) k.m.removeLayer(k.tile);
    if (k.ref) k.m.removeLayer(k.ref);
    const navy = mode === "home" && basemap === "Streets"; // Home is always the navy map of the reference image
    k.tile = basemap === "Streets" && (theme === "dark" || navy) ? darkStreetLayer(t.url, t.attr, t.native, navy ? "quiet" : "rich") : L.tileLayer(t.url, { attribution: t.attr, maxZoom: 18, maxNativeZoom: t.native, crossOrigin: true });
    k.tile.addTo(k.m); k.tile.bringToBack();
    // place names go above the zones and pipes
    k.m.getPane("tilePane")!.style.zIndex = "200";
    k.ref = t.ref ? L.tileLayer(t.ref, { maxZoom: 18, maxNativeZoom: t.native, crossOrigin: true, pane: "labels" }) : null;
    k.ref?.addTo(k.m);
    k.m.getContainer().dataset.base = basemap === "Satellite" ? "sat" : navy ? "navy" : theme;
  }, [ready, basemap, theme, mode]);

  /* ---------- restyle as the hour, the colouring, the zone filter and the layers change ---------- */
  useEffect(() => {
    const k = kit.current; if (!k) return;
    const s = networkAt(hour);
    const net = mode === "network";
    const setHtml = (key: string, mk: L.Marker, html: string, size: L.PointExpression, anchor: L.PointExpression, cls = "geo-ico") => {
      if (k.html.get(key) === html) return;
      k.html.set(key, html);
      mk.setIcon(L.divIcon({ className: cls, html, iconSize: size, iconAnchor: anchor }));
    };
    const dim = (z: ZoneId | "trunk") => zone !== null && z !== "trunk" && z !== zone;

    // layers on and off
    const toggle = (g: L.LayerGroup, on: boolean) => { if (on && !k.m.hasLayer(g)) g.addTo(k.m); if (!on && k.m.hasLayer(g)) k.m.removeLayer(g); };
    toggle(k.g.areas, lay.areas); toggle(k.g.pipes, lay.pipes); toggle(k.g.leaks, lay.leaks); toggle(k.g.inst, lay.inst && net);

    // areas
    for (const z of ZONES) {
      const i = zoneInfo(metric, s, z.id), d = dim(z.id), on = zone === z.id;
      const col = net ? i.c : regionColour(i.c);
      k.poly.get(z.id)!.setStyle(net
        ? { color: i.c, fillColor: i.c, weight: 2, opacity: d ? 0.3 : 0.95, fillOpacity: d ? 0.07 : on ? 0.5 : 0.34 }
        : i.c === MID ? { color: "#ffd36b", fillColor: col, weight: 1, opacity: 0.9, fillOpacity: 0.96 }
        : i.c === GOOD ? { color: "#8fd3ec", fillColor: col, weight: 1, opacity: 0.8, fillOpacity: 0.5 }
        : { color: "#e583ad", fillColor: col, weight: 1, opacity: 0.8, fillOpacity: 0.45 });
      setHtml(`z${z.id}`, k.label.get(z.id)!,
        net ? `<div class="geo-zl ${d ? "dim" : ""} ${on ? "on" : ""}" style="--c:${i.c}"><span class="n">${esc(z.name)}</span><span class="v"><b>${i.big}</b> ${esc(i.unit)}</span><span class="s">${esc(i.sub)}</span></div>`
          : `<div class="geo-rl"><span>${esc(z.name)}</span></div>`,
        [0, 0], [0, 0]);
    }

    // pipes
    for (const p of PIPES) {
      const ln = k.line.get(p.id)!, st = s.pipes[p.id], d = dim(p.zone), w = dnW(p, mode);
      const tie = p.kind === "tie";
      ln.base.setStyle({ color: net ? pipeColor(metric, s, p) : "#9db4d6", weight: tie ? 1.5 : w, opacity: d ? 0.2 : tie ? 0.8 : net ? 0.95 : 0.9, dashArray: tie ? "5 6" : undefined });
      if (ln.flow) {
        const moving = !st.closed && st.flow > 0.5;
        ln.flow.setStyle({ weight: Math.max(1.6, w * 0.34), opacity: moving && !d ? 0.9 : 0 });
        const el = ln.flow.getElement() as SVGPathElement | undefined;
        if (el) {
          el.style.setProperty("--dur", `${Math.max(0.35, Math.min(4, 13 / (Math.max(st.velocity, 0.05) * 14)))}s`);
          el.classList.toggle("rev", st.reverse);
        }
      }
    }

    // plant, pumps, reservoir
    for (const n of NODES.filter((q) => q.kind === "plant" || q.kind === "pump" || q.kind === "tank")) {
      const mk = k.asset.get(n.id)!;
      const v = n.kind === "tank" ? `${s.tank.toFixed(0)}% full` : n.kind === "plant" || n.id === "ps1" ? (flow ? `${flow.toLocaleString("en-US")} m³/h` : `${s.plant.toFixed(0)} L/s`) : "Booster +14 m";
      const nm = n.id === "ps1" ? "PS-1 pumps" : n.id === "ps2" ? "PS-2 booster" : n.kind === "plant" ? "Treatment plant" : "Reservoir";
      const svg = n.kind === "plant" ? SVG_PLANT : n.kind === "tank" ? svgTank(s.tank) : SVG_PUMP;
      setHtml(`a${n.id}`, mk, `<div class="geo-as ${n.kind}${n.id === "ps1" ? " up" : ""}"><span class="gi">${svg}</span><b>${nm}</b><i>${v}</i></div>`, [112, 70], [56, n.id === "ps1" ? 50 : 20]);
    }

    // instruments
    if (net) {
      const shown = SHOWS[metric];
      k.g.inst.clearLayers();
      for (const inst of INSTRUMENTS) {
        const mk = k.inst.get(inst.id)!;
        if (!shown.includes(inst.type) && sel !== inst.id) continue;
        const r = readInstrument(inst, hour), [dx, dy] = (mk as L.Marker & { geoOff: [number, number] }).geoOff;
        const len = Math.hypot(dx, dy), a = (Math.atan2(-dy, -dx) * 180) / Math.PI;
        const lead = len ? `<i class="lead" style="width:${len.toFixed(1)}px;transform:rotate(${a.toFixed(1)}deg)"></i>` : "";
        setHtml(`i${inst.id}`, mk,
          `<div class="geo-in ${r.tone} ${sel === inst.id ? "sel" : ""}">${lead}<span class="b" style="border-color:${TONE_COLOR[r.tone]}">${GLYPH[inst.type]}</span><span class="rd">${esc(r.text)}</span></div>`,
          [28, 28], [14 - dx, 14 - dy]);
        mk.addTo(k.g.inst);
      }
    }
  }, [ready, metric, hour, zone, sel, flow, mode, lay.areas, lay.pipes, lay.inst, lay.leaks]);

  /* ---------- fly to something (a leak in the list, say) ---------- */
  useEffect(() => {
    const k = kit.current, f = props.focus; if (!k || !f) return;
    k.m.flyTo([f.lat, f.lng], f.zoom ?? 16, { duration: 0.7 });
  }, [ready, props.focus?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  /* a zone picked in the table: frame it */
  useEffect(() => {
    const k = kit.current; if (!k || mode !== "network") return;
    if (zone) k.m.flyToBounds(L.latLngBounds(ZONE_AREA[zone].rings.flat()), { padding: [50, 50], duration: 0.6, maxZoom: 16 });
    else if (ready) k.m.flyToBounds(L.latLngBounds(ALL_LL), { padding: [44, 44], duration: 0.6 });
  }, [zone]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={box} className={`geo geo-${mode}`} role="application" aria-label={props.label ?? "Interactive map of the water network over New Cairo. Drag to move, scroll or use the plus and minus to zoom."} />;
}
