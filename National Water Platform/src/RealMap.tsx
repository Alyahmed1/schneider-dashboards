import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnimatePresence, motion } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowLeft, ChevronRight, Star } from "lucide-react";
import { MINISTRIES, MINISTRY_BY_ID, STATUS_LABEL, type Go, type MinistryId, type Status } from "./data";
import MinistryIcon from "./MinistryIcon";
import { HUBS, STATIONS, STATION_PAGES, TYPE_INFO, shortName, stationStats, type Station } from "./stations";
import { Semi } from "./gauges";

/** neighbouring land (Libya, Sudan, Gaza/Israel, Jordan, Saudi Arabia) is painted over, so only Egypt shows on the map */
const NEIGHBOURS: [number, number][][] = [
  [[16, 17], [16, 25.0], [22.0, 25.0], [31.57, 25.15], [36, 25.15], [36, 17]],
  [[16, 25.0], [16, 42], [22.0, 42], [22.0, 25.0]],
  [[31.23, 34.27], [29.55, 34.92], [28.0, 34.97], [27.6, 35.3], [27.35, 35.7], [26.2, 36.45], [24.1, 38.05], [22.0, 39.2], [22.0, 42], [36, 42], [36, 34.27]],
  // the rest of the world, so zooming far out never shows other places
  [[36, -180], [85, -180], [85, 180], [36, 180]],
  [[-85, -180], [16, -180], [16, 180], [-85, 180]],
  [[16, -180], [36, -180], [36, 17], [16, 17]],
  [[16, 42], [36, 42], [36, 180], [16, 180]],
];
/** the Home map opens close in on the Nile valley, with every ministry icon fully inside */
const HOME_CENTER: L.LatLngTuple = [28.0, 30.5];
const HOME_ZOOM = 6.5; // 6.5 and up loads the more detailed map tiles, so the governorate names appear
/** with the menu hidden the map is 698 px wide: Egypt keeps exactly that position when the menu is shown (the extra width goes to the right) */
const REF_W = 698;
function homeCenter(m: L.Map): L.LatLng {
  const off = Math.max(0, (m.getSize().x - REF_W) / 2);
  return m.unproject(m.project(HOME_CENTER, HOME_ZOOM).add([off, 0]), HOME_ZOOM);
}
/** the whole of Egypt in view (a little sea and a little of the neighbours) */
const EGYPT: L.LatLngBoundsExpression = [[21.7, 24.6], [32.0, 36.9]];
const CITIES: [string, number, number][] = [
  ["Luxor", 25.7, 32.64], ["Suez", 29.97, 32.55], ["Port Said", 31.26, 32.3], ["Hurghada", 27.26, 33.8], ["Siwa", 29.2, 25.52], ["Sharm El Sheikh", 27.9, 34.33],
];
const STATUS_COLOR: Record<Status, string> = { good: "#34d399", watch: "#fbbf24", bad: "#fb7185" };
const svg = (el: React.ReactElement) => renderToStaticMarkup(el);

interface Item { st: Station; mk: L.Marker; line: L.Polyline; dot: L.CircleMarker }

/**
 * Give every pin its own space: pins whose boxes touch are pushed apart (in screen pixels), and a thin line joins each moved pin to its true spot.
 */
function relax(m: L.Map, items: Item[], w: number, h: number, top: number) {
  if (!items.length) return;
  const size = m.getSize();
  const P = items.map((it) => { const p = m.latLngToContainerPoint([it.st.lat, it.st.lng]); return { x0: p.x, y0: p.y, x: p.x, y: p.y }; });
  for (let k = 0; k < 120; k++) {
    let moved = false;
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const dx = P[j].x - P[i].x, dy = P[j].y - P[i].y, ox = w - Math.abs(dx), oy = h - Math.abs(dy);
      if (ox > 0 && oy > 0) {
        moved = true;
        if (ox < oy) { const s = (ox / 2 + 0.5) * (dx >= 0 ? 1 : -1); P[i].x -= s; P[j].x += s; }
        else { const s = (oy / 2 + 0.5) * (dy >= 0 ? 1 : -1); P[i].y -= s; P[j].y += s; }
      }
    }
    P.forEach((p) => { p.x = Math.min(size.x - w / 2, Math.max(w / 2, p.x)); p.y = Math.min(size.y - h / 2 - 8, Math.max(top + h / 2, p.y)); });
    if (!moved) break;
  }
  items.forEach((it, i) => {
    const ll = m.containerPointToLatLng([P[i].x, P[i].y]);
    it.mk.setLatLng(ll);
    const far = Math.hypot(P[i].x - P[i].x0, P[i].y - P[i].y0) > 9;
    it.line.setLatLngs([[it.st.lat, it.st.lng], ll]);
    it.line.getElement()?.setAttribute("opacity", far ? "1" : "0");
    it.dot.getElement()?.setAttribute("opacity", far ? "1" : "0");
  });
}

export default function RealMap({ mode = "home", hover = null, setHover, go, wide = false }: { mode?: "home" | "health"; hover?: MinistryId | null; setHover?: (id: MinistryId | null) => void; go: Go; wide?: boolean }) {
  const health = mode === "health";
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const hubs = useRef<L.LayerGroup | null>(null);
  const pins = useRef<L.LayerGroup | null>(null);
  const items = useRef<Item[]>([]);
  const touched = useRef(false);
  const firstRun = useRef(true);
  const hubMarkers = useRef<Partial<Record<MinistryId, L.Marker>>>({});
  const [focus, setFocus] = useState<MinistryId | null>(null); // home: zoomed ministry; health: filter
  const [sel, setSel] = useState<Station | null>(null);
  const [online, setOnline] = useState(true);
  const cell = health ? { w: 27, h: 27 } : { w: 92, h: 58 };

  /* build the map once */
  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { zoomControl: false, attributionControl: true, minZoom: health ? 4.8 : 5.6, maxZoom: 11, zoomSnap: 0.1, maxBounds: [[20.6, 23.4], [33.0, 38.2]], maxBoundsViscosity: 1, zoomAnimation: true });
    m.attributionControl.setPrefix(false);
    const tiles = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16, maxNativeZoom: 11, attribution: "Tiles © Esri" });
    tiles.on("tileerror", () => setOnline(false));
    tiles.on("tileload", () => setOnline(true));
    tiles.addTo(m);
    NEIGHBOURS.forEach((poly) => L.polygon(poly, { stroke: false, fillColor: "#04284a", fillOpacity: 1, interactive: false, className: "rm-void" }).addTo(m));
    if (health) m.fitBounds(EGYPT, { animate: false, paddingTopLeft: [0, 50], paddingBottomRight: [0, 4] }); else m.setView(homeCenter(m), HOME_ZOOM, { animate: false });

    // Egypt's land borders (west, south, Israel) as a soft glowing line, so the country stands out
    [[[31.57, 25.15], [22.0, 25.0], [22.0, 36.9]], [[31.23, 34.27], [29.55, 34.9]]].forEach((line) =>
      L.polyline(line as L.LatLngTuple[], { color: "#5eead4", weight: 2.2, opacity: 0.9, dashArray: "7 6", interactive: false, className: "rm-border" }).addTo(m));
    if (!health) L.control.zoom({ position: "topright" }).addTo(m);
    // city names in English, kept quiet
    CITIES.forEach(([name, lat, lng]) => L.marker([lat, lng], { interactive: false, icon: L.divIcon({ className: "rm-city", html: `<span>${name}</span>`, iconSize: [0, 0] }) }).addTo(m));

    const hubLayer = L.layerGroup();
    if (!health) {
      hubLayer.addTo(m);
      MINISTRIES.forEach((min, n) => {
        const html = `<div class="rm-hub" style="--accent:${min.accent};--accent2:${min.accent2};animation-delay:${0.4 + n * 0.12}s"><span class="rm-ring"></span>${svg(<MinistryIcon m={min} size={46} />)}<b>${min.short}</b></div>`;
        const mk = L.marker(HUBS[min.id], { icon: L.divIcon({ className: "rm-hubwrap", html, iconSize: [46, 46], iconAnchor: [23, 23] }), keyboard: true, title: min.name });
        mk.on("click", () => setFocus(min.id));
        mk.on("mouseover", () => setHover?.(min.id));
        mk.on("mouseout", () => setHover?.(null));
        mk.addTo(hubLayer);
        hubMarkers.current[min.id] = mk;
      });
    }
    hubs.current = hubLayer;
    pins.current = L.layerGroup().addTo(m);
    m.on("click", () => setSel(null));
    map.current = m;
    const again = () => { if (map.current === m) relax(m, items.current, cell.w, cell.h, 52); };
    m.on("moveend", again);
    m.on("zoomend", () => { if (box.current) box.current.dataset.zoom = String(m.getZoom()); });
    const ro = new ResizeObserver(() => {
      m.invalidateSize();
      const sz = m.getSize();
      if (!touched.current && !health && sz.x > 50 && sz.y > 50) { // until someone touches the map, keep the opening view right for the current size
        m.setView(homeCenter(m), HOME_ZOOM, { animate: false });
      } else if (!touched.current && health && sz.x > 50 && sz.y > 50) m.fitBounds(EGYPT, { animate: false, paddingTopLeft: [0, 50], paddingBottomRight: [0, 4] });
      again();
    });
    ro.observe(box.current);
    const touch = () => { touched.current = true; };
    box.current.addEventListener("wheel", touch, { passive: true });
    box.current.addEventListener("pointerdown", touch);
    const settle = [350, 900, 1600].map((ms) => setTimeout(() => { if (!touched.current && !health && map.current === m) { m.invalidateSize(); m.setView(homeCenter(m), HOME_ZOOM, { animate: false }); } }, ms));
    return () => { settle.forEach(clearTimeout); ro.disconnect(); map.current = null; m.off(); m.stop(); m.remove(); hubMarkers.current = {}; items.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* the sidebar toggle changes the width: let the map re-measure after the transition */
  useEffect(() => { const t = setTimeout(() => map.current?.invalidateSize(), 420); return () => clearTimeout(t); }, [wide]);

  /* highlight a ministry icon when its card is hovered */
  useEffect(() => {
    (Object.keys(hubMarkers.current) as MinistryId[]).forEach((id) => hubMarkers.current[id]?.getElement()?.classList.toggle("hot", hover === id));
  }, [hover, focus]);

  /* pins: home shows one ministry at a time, health shows every station (or one ministry when filtered) */
  useEffect(() => {
    const m = map.current, hubLayer = hubs.current, pinLayer = pins.current;
    if (!m || !pinLayer || !hubLayer) return;
    setSel(null);
    pinLayer.clearLayers();
    items.current = [];
    const showPins = health || focus !== null;
    if (!health) { if (focus) m.removeLayer(hubLayer); else if (!m.hasLayer(hubLayer)) hubLayer.addTo(m); }
    if (!showPins) { if (firstRun.current) { firstRun.current = false; return; } m.flyTo(homeCenter(m), HOME_ZOOM, { duration: 1.1 }); return; }
    const list = STATIONS.filter((s) => !focus || s.ministry === focus);
    list.forEach((st, n) => {
      const min = MINISTRY_BY_ID[st.ministry];
      const Icon = TYPE_INFO[st.type].icon;
      const color = health ? STATUS_COLOR[st.status] : min.accent;
      const isStar = st.featured && !health;
      const sz = health ? 24 : isStar ? 40 : 32;
      const html = `<div class="rm-pin ${st.status} ${isStar ? "star" : ""} ${health ? "small" : ""}" style="--accent:${color};animation-delay:${0.3 + n * 0.05}s"><span class="rm-ring"></span><i>${svg(<Icon size={health ? 12 : isStar ? 20 : 16} strokeWidth={2.2} />)}</i>${health ? "" : `<b>${shortName(st)}</b>`}</div>`;
      const mk = L.marker([st.lat, st.lng], { icon: L.divIcon({ className: "rm-pinwrap", html, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }), keyboard: true, title: st.name, zIndexOffset: st.status === "bad" ? 800 : st.featured ? 500 : 0 });
      mk.on("click", (e) => {
        L.DomEvent.stopPropagation(e); setSel(st);
        if (!health) { // keep the pin visible above the bigger card
          const p = m.latLngToContainerPoint(mk.getLatLng()), room = m.getSize().y - 330;
          if (p.y > room) m.panBy([0, p.y - room], { animate: true });
        }
      });
      const line = L.polyline([[st.lat, st.lng], [st.lat, st.lng]], { color, weight: 1.4, opacity: 0.9, interactive: false, className: "rm-lead" });
      const dot = L.circleMarker([st.lat, st.lng], { radius: 3, color, fillColor: color, fillOpacity: 1, weight: 1, interactive: false });
      line.addTo(pinLayer); dot.addTo(pinLayer); mk.addTo(pinLayer);
      items.current.push({ st, mk, line, dot });
    });
    const b = L.latLngBounds(list.map((s) => [s.lat, s.lng] as [number, number]));
    if (health) m.flyToBounds(b, { paddingTopLeft: [34, 62], paddingBottomRight: [34, 40], duration: 1, maxZoom: 9 });
    else m.flyToBounds(b, { paddingTopLeft: [70, 80], paddingBottomRight: [70, 70], duration: 1.3, maxZoom: 9 });
    const t = setTimeout(() => { if (map.current === m) relax(m, items.current, cell.w, cell.h, 52); }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const min = focus ? MINISTRY_BY_ID[focus] : null;
  const count = focus ? STATIONS.filter((s) => s.ministry === focus).length : 0;
  const tally = useMemo(() => ({ good: STATIONS.filter((s) => s.status === "good").length, watch: STATIONS.filter((s) => s.status === "watch").length, bad: STATIONS.filter((s) => s.status === "bad").length }), []);
  return (
    <div className={`map-box rm ${focus ? "focused" : ""} ${health ? "health" : ""}`}>
      <div ref={box} className="rm-map" />
      <div className="rm-glow" aria-hidden />
      {!health && <div className="rm-north" aria-hidden>N</div>}
      <div className="rm-top">
        {health ? (
          <div className="rm-filters" role="group" aria-label="Show stations of">
            <button className={focus === null ? "on" : ""} onClick={() => setFocus(null)}>All <em>{STATIONS.length}</em></button>
            {MINISTRIES.map((mm) => (
              <button key={mm.id} className={focus === mm.id ? "on" : ""} style={{ ["--accent" as string]: mm.accent }} onClick={() => setFocus(focus === mm.id ? null : mm.id)}>
                {mm.short} <em>{STATIONS.filter((s) => s.ministry === mm.id).length}</em>
              </button>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {focus && min ? (
              <motion.div key="f" className="rm-chip" style={{ ["--accent" as string]: min.accent }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <button className="rm-back" onClick={() => setFocus(null)}><ArrowLeft size={15} /> Back to Egypt</button>
                <span><b>{min.short}</b> · {count} stations</span>
              </motion.div>
            ) : (
              <motion.div key="n" initial={false} />
            )}
          </AnimatePresence>
        )}
      </div>
      {health && (
        <div className="rm-legend">
          <span><i style={{ background: STATUS_COLOR.good }} />{tally.good} on track</span>
          <span><i style={{ background: STATUS_COLOR.watch }} />{tally.watch} watch</span>
          <span><i style={{ background: STATUS_COLOR.bad }} />{tally.bad} behind</span>
        </div>
      )}
      {!online && <div className="rm-offline">Map tiles need an internet connection</div>}
      <AnimatePresence>
        {sel && (() => {
          const m2 = MINISTRY_BY_ID[sel.ministry], T = TYPE_INFO[sel.type], Icon = T.icon;
          return (
            <motion.div key={sel.id} className="rm-card" style={{ ["--accent" as string]: health ? STATUS_COLOR[sel.status] : m2.accent }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.25 }}>
              <header>
                <i className="rm-card-ic"><Icon size={20} /></i>
                <span><h4>{sel.name}{sel.featured && <Star size={13} fill="currentColor" />}</h4><em>{T.label} · {m2.short}</em></span>
                <u className={`x-chip ${sel.status}`}>{STATUS_LABEL[sel.status]}</u>
              </header>
              {sel.issue && sel.status !== "good" && <p className="rm-issue">{sel.issue}</p>}
              <div className="rm-kpis">{sel.kpis.map((v, n) => <div key={n}><em>{T.kpiLabels[n]}</em><b>{v}</b></div>)}</div>
              {!health && (() => {
                const x = stationStats(sel), lo = Math.min(...x.trend), hi = Math.max(...x.trend);
                return (
                  <div className="rm-rich">
                    <Semi key={sel.id} pct={x.score} tone={STATUS_COLOR[sel.status]} label="health score" size={96} />
                    <div className="rm-prog">{x.bars.map(([l, p, t]) => <div key={l}><span><em>{l}</em><b>{t}</b></span><u><s style={{ width: `${p}%` }} /></u></div>)}</div>
                    <div className="rm-trend">
                      <em>{T.kpiLabels[0]}, last 12 hours</em>
                      <div aria-hidden>{x.trend.map((v, i) => <s key={i} className={i === x.trend.length - 1 ? "now" : ""} style={{ height: `${25 + ((v - lo) / (hi - lo || 1)) * 75}%`, animationDelay: `${i * 0.04}s` }} />)}</div>
                      <span><i>12 h ago</i><i>now {sel.kpis[0]}</i></span>
                    </div>
                  </div>
                );
              })()}
              {STATION_PAGES.has(sel.id)
                ? <button className="rm-open" onClick={() => go("station", sel.id)}>Open station page <ChevronRight size={15} /></button>
                : <button className="rm-open" onClick={() => go("ministry", sel.ministry)}>Open {m2.short} page <ChevronRight size={15} /></button>}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
