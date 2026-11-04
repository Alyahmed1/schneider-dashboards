import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Home, Layers } from "lucide-react";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const SAT = `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`;
const BASE = { dark: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, light: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}` };
const REF = { dark: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, light: `${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}` };
const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"; // street map; the night look is made with a colour filter in map.css
const NEON = { dark: OSM, light: OSM };
const ATTR = "Tiles &copy; Esri, HERE, Garmin, Maxar, USGS";
const ATTR_NEON = "&copy; OpenStreetMap contributors";
const isDark = () => document.documentElement.dataset.theme !== "light";

/** a real, pannable and zoomable map. By default it is drawn in the theme's own background colour (a gray canvas map tinted to match the page);
 *  the layer button switches to the satellite picture. */
export default function LeafMap({ bounds, onReady, label, padRight = 24, neon = false }: { bounds: L.LatLngBoundsExpression; onReady: (m: L.Map) => void; label: string; padRight?: number; neon?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const bRef = useRef(bounds);
  const fit = { paddingTopLeft: L.point(24, 24), paddingBottomRight: L.point(padRight, 24) };
  const [sat, setSat] = useState(false);
  const [dark, setDark] = useState(isDark);
  const refs = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const map = L.map(el, { zoomControl: false, zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 90, attributionControl: true, maxZoom: 19, minZoom: 10 });
    map.attributionControl.setPrefix(false);
    L.control.zoom({ position: "topleft" }).addTo(map);
    // tint pane: sits above the tiles, below the shapes
    const tint = map.createPane("tint"); tint.style.zIndex = "250"; tint.classList.add("lf-tint");
    tiles.current = L.tileLayer(neon ? NEON.dark : BASE.dark, { attribution: neon ? ATTR_NEON : ATTR, maxZoom: 19, maxNativeZoom: neon ? 19 : 12, subdomains: "abcd", className: "lf-tiles" }).addTo(map);
    // a tile that fails (the server is busy) is asked for again a couple of times
    tiles.current.on("tileerror", (e) => {
      const img = e.tile as HTMLImageElement & { _n?: number };
      if ((img._n ?? 0) >= 3) return;
      img._n = (img._n ?? 0) + 1;
      const src = img.src;
      window.setTimeout(() => { img.src = ""; img.src = src; }, 1200 * img._n);
    });
    const lab = map.createPane("labels"); lab.style.zIndex = "300"; lab.style.pointerEvents = "none";
    refs.current = L.tileLayer(REF.dark, { pane: "labels", maxZoom: 18, maxNativeZoom: 12, className: "lf-ref" }).addTo(map);
    map.fitBounds(bRef.current, fit);
    mapRef.current = map;
    onReady(map);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      // a wheel-zoom timer can still be pending when the page changes; stop it so it never touches a removed map
      const w = map.scrollWheelZoom as unknown as { _timer?: number };
      if (w._timer) window.clearTimeout(w._timer);
      map.scrollWheelZoom.disable(); map.stop(); map.remove(); mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // follow the Light / Dark switch
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(isDark()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  useEffect(() => {
    const t = dark ? "dark" : "light";
    tiles.current?.setUrl(sat ? SAT : neon ? NEON[t] : BASE[t]);
    tiles.current?.options && (tiles.current.options.maxNativeZoom = sat ? 18 : neon ? 19 : 12);
    refs.current?.setUrl(REF[t]);
    refs.current?.getContainer()?.style.setProperty("display", sat || neon ? "none" : "");
  }, [sat, dark, neon]);

  return (
    <div className={`lf-wrap ${neon ? "neon" : ""}`}>
      <div ref={host} className={`lf ${sat ? "sat" : neon ? "neon" : "plain"}`} role="application" aria-label={label} />
      <div className="lf-tools">
        <button className="lf-btn" onClick={() => mapRef.current?.fitBounds(bRef.current, fit)} aria-label="Reset the view" title="Reset the view"><Home size={16} /></button>
        <button className={`lf-btn ${sat ? "on" : ""}`} onClick={() => setSat((s) => !s)} aria-pressed={sat} aria-label={sat ? "Show the plain map" : "Show the satellite picture"} title={sat ? "Plain map" : "Satellite"}><Layers size={16} /></button>
      </div>
    </div>
  );
}
