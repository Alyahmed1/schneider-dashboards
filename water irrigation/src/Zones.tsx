import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { ArrowUp, Pause, Play, X } from "lucide-react";
import { fmt } from "./farm";
import { LCTRLS, LZONES, runMin, flowLpm, SENSORS, siteWeather, zoneById, zonesAt, type CtrlId, type LCtrl, type ZoneNow } from "./landscape";
import { gwAt } from "./grey";
import { useOpenAlarms } from "./alarms";
import { useTick, wobble } from "./live";
import { bounds, px } from "./geo";
import LeafMap from "./LeafMap";
import { CountUp, Panel } from "./ui";
import type { Go } from "./App";

// the compound is the Madinaty map: every place below is a pixel position on a picture of it (see geo.ts)
const P = px;
const ring = (poly: [number, number][]): L.LatLngTuple[] => poly.map(([x, y]) => P(x, y));
const box = (poly: [number, number][]) => { const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
const MARKERS: Record<CtrlId, [number, number]> = { C1: [300, 450], C2: [612, 460], C3: [1042, 622] }; // where each controller box stands
const CARD_AT: Record<CtrlId, [number, number]> = { C1: [130, 118], C2: [600, 118], C3: [1070, 118] }; // the callout cards sit above their zones
const CARD_TO: Record<CtrlId, [number, number]> = { C1: [250, 280], C2: [640, 205], C3: [950, 497] };
const TANK: [number, number][] = [[62, 452], [158, 452], [158, 490], [62, 490]];
const SITE = bounds([P(0, 50), P(1100, 780)]);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const hh = (h: number) => { const m = Math.round(h * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
const nowHour = () => { const d = new Date(); return Math.floor((d.getHours() + d.getMinutes() / 60) * 4) / 4; };

// water flow of each controller over the day (a point every half hour), for the small graphs
const STEPS = 48;
const DAY: Record<CtrlId, number[]> = { C1: [], C2: [], C3: [] };
for (let i = 0; i <= STEPS; i++) {
  const s = zonesAt(i / 2);
  for (const c of LCTRLS) DAY[c.id].push(s.filter((n) => n.z.ctrl === c.id).reduce((a, n) => a + n.lpm, 0));
}
const CUM: Record<CtrlId, number[]> = { C1: [], C2: [], C3: [] }; // litres turned into m³ so far today, a point every half hour
for (const c of LCTRLS) { let run = 0; DAY[c.id].forEach((v, i) => { if (i) run += (v * 30) / 1000; CUM[c.id].push(run); }); }
const TOTAL = DAY.C1.map((_, i) => DAY.C1[i] + DAY.C2[i] + DAY.C3[i]);

/** a small area graph as SVG text (it goes inside a map marker); the dot is where the clock is now */
function spark(v: number[], hour: number, w = 92, h = 30) {
  const max = Math.max(1, ...v), x = (i: number) => (i / (v.length - 1)) * w, y = (n: number) => h - 3 - (n / max) * (h - 8);
  const line = v.map((n, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(n).toFixed(1)}`).join(" ");
  const i = Math.min(v.length - 1, hour * 2), lo = Math.floor(i), cur = v[lo] + (v[Math.min(v.length - 1, lo + 1)] - v[lo]) * (i - lo);
  return `<svg class="nz-sp" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${line} L${w} ${h} L0 ${h} Z" class="a"/><path d="${line}" class="l"/><circle cx="${x(i).toFixed(1)}" cy="${y(cur).toFixed(1)}" r="3" /></svg>`;
}
/** what a controller is doing at this hour, in a few words */
function ctrlText(c: LCtrl, snap: ZoneNow[]) {
  const zs = snap.filter((n) => n.z.ctrl === c.id);
  const w = zs.find((n) => n.status === "Watering");
  if (w) return `${w.z.id} watering till ${hh(w.end)}`;
  const next = zs.filter((n) => n.status === "Scheduled").sort((a, b) => a.start - b.start)[0];
  return next ? `Next: ${next.z.id} at ${hh(next.start)}` : "Done for today";
}

function SiteMap({ snap, hour, t, sel, onSelect, onCtrl, tank }: { snap: ZoneNow[]; hour: number; t: number; sel: string | null; onSelect: (id: string) => void; onCtrl: (id: CtrlId) => void; tank: number }) {
  const [map, setMap] = useState<L.Map | null>(null);
  const cb = useRef({ onSelect, onCtrl }); cb.current = { onSelect, onCtrl };
  useEffect(() => {
    if (!map) return;
    const g = L.layerGroup().addTo(map);
    const icon = (html: string) => L.divIcon({ className: "lf-icon", iconSize: [0, 0], html });
    // the zones: all amber, brighter while the valve is open, red when it is faulty
    for (const n of snap) {
      const z = n.z, on = sel === z.id, fault = n.status === "Fault", c = fault ? "#ff4d5e" : "#ffb21e";
      const op = on ? 0.8 : n.status === "Watering" ? 0.72 : fault ? 0.55 : n.status === "Done" ? 0.42 : 0.5;
      const poly = L.polygon(ring(z.poly), { color: on ? "#ffffff" : fault ? "#ff4d5e" : "#ffd25a", weight: on ? 3.5 : 2.2, fillColor: c, fillOpacity: op, className: `lf-zone nz ${n.status.toLowerCase()}` }).addTo(g);
      poly.bindTooltip(`<b>${z.id}</b> ${esc(z.name)} · ${z.type}<br>${n.status} · soil moisture ${fmt(n.moist, 1)}%<br><em>Click for details</em>`, { sticky: true, className: "lf-tip" });
      poly.on("click", () => cb.current.onSelect(z.id));
      const bb = box(z.poly), named = bb.x1 - bb.x0 >= 135 && bb.y1 - bb.y0 >= 70;
      const badge = L.marker(P((bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2 - (named ? 8 : 0)), { keyboard: false, icon: icon(`<div class="nz-badge ${n.status.toLowerCase()}">${fault ? "!" : z.id}</div>${named ? `<div class="nz-nm">${esc(z.name)}</div>` : ""}`) }).addTo(g);
      badge.on("click", (e) => { L.DomEvent.stopPropagation(e); cb.current.onSelect(z.id); });
    }
    // the broken valve gets a red note beside it, like an alarm tag
    const bad = snap.find((n) => n.status === "Fault");
    if (bad) L.marker(P((box(bad.z.poly).x0 + box(bad.z.poly).x1) / 2, box(bad.z.poly).y1 + 40), { interactive: false, icon: icon(`<div class="nz-pill bad">${bad.z.id} · ${esc(bad.z.fault ?? "fault")}</div>`) }).addTo(g);
    // one callout card per controller, tied to its zones by a thin line
    for (const c of LCTRLS) {
      const [cx, cy] = CARD_AT[c.id], [tx, ty] = CARD_TO[c.id];
      const zs = snap.filter((n) => n.z.ctrl === c.id), lpm = zs.reduce((a, n) => a + n.lpm, 0), seed = LCTRLS.indexOf(c) + 40;
      const base = zs.reduce((a, n) => a + (n.applied * n.z.area) / 1000, 0), today = lpm ? wobble(base, seed, t, 0.003) : base, now = lpm ? wobble(lpm, seed + 5, t, 0.02) : 0; // m³ so far today, L/min right now
      L.polyline([P(cx, cy), P(tx, ty)], { color: "#9fd4ff", weight: 1.2, opacity: 0.7, interactive: false, className: "nz-lead" }).addTo(g);
      const m = L.marker(P(cx, cy), { keyboard: false, icon: icon(
        `<div class="nz-card"><b>${esc(c.name)}</b><div class="v"><strong>${fmt(today, 1)}</strong><span>m³ today</span>${spark(CUM[c.id], hour)}</div><small>Now ${fmt(now)} L/min · ${ctrlText(c, snap)}</small></div>`) }).addTo(g);
      m.on("click", (e) => { L.DomEvent.stopPropagation(e); cb.current.onCtrl(c.id); });
      m.bindTooltip(`Open controller ${c.id}`, { direction: "bottom", className: "lf-tip" });
    }
    // controller boxes and the reuse tank
    LCTRLS.forEach((c) => L.marker(P(...MARKERS[c.id]), { interactive: false, icon: icon(`<div class="nz-pin">${c.id}</div>`) }).addTo(g));
    L.polygon(ring(TANK), { color: "#4cc9ff", weight: 2, fillColor: "#1a8fd0", fillOpacity: 0.5, className: "nz-tank" }).bindTooltip("Reuse tank", { sticky: true, className: "lf-tip" }).addTo(g);
    L.marker(P(110, 471), { interactive: false, icon: icon(`<div class="nz-tk"><b>Reuse tank</b><small>${fmt(tank)}% full</small><i><u style="width:${Math.min(100, Math.max(0, tank))}%"></u></i></div>`) }).addTo(g);
    return () => { g.remove(); };
  }, [map, snap, hour, t, sel, tank]);
  return <LeafMap neon bounds={SITE} onReady={setMap} padRight={24} label="Map of the headquarters grounds with twelve irrigation zones" />;
}

/** Landscape · Zones: the grounds on a night-style map, twelve glowing zones, one callout per controller and a day timeline */
export default function Zones({ start, go }: { start?: string; go: Go }) {
  const t = useTick();
  const [hour, setHour] = useState(nowHour);
  const [play, setPlay] = useState(false);
  const [live, setLive] = useState(true); // follows the clock until the slider or play is used; Now switches it back on
  const [sel, setSel] = useState<string | null>(start && zoneById(start) ? start : null);
  const snap = useMemo(() => zonesAt(hour), [hour]);
  const w = siteWeather(hour);
  const open = useOpenAlarms();
  const critical = open.filter((a) => a.sev === "Critical").length;
  const selZ = sel ? snap.find((x) => x.z.id === sel) : undefined;
  const watering = snap.filter((x) => x.status === "Watering").length;
  const online = Math.round((SENSORS.filter((s) => s.status !== "Offline").length / SENSORS.length) * 100);
  const tank = wobble(gwAt(hour).store / 0.6, 31, t, 0.01);

  useEffect(() => { if (live && !play) setHour(nowHour()); }, [t, live, play]); // the clock moves every 10 seconds with the live data
  useEffect(() => {
    if (!play) return;
    const id = window.setInterval(() => setHour((h) => (h + 0.5) % 24), 700);
    return () => window.clearInterval(id);
  }, [play]);

  const tiles = [
    { l: "Water today", v: wobble(snap.reduce((a, n) => a + (n.applied * n.z.area) / 1000, 0), 7, t, 0.003), d: 1, u: "m³" }, { l: "Zones watering now", v: watering, d: 0, u: `of ${LZONES.length}` },
    { l: "Sensors online", v: online, d: 0, u: "%" }, { l: "Temperature", v: w.temp, d: 0, u: "°C" },
    { l: "Wind", v: w.wind, d: 0, u: "km/h" }, { l: "Reuse tank", v: tank, d: 0, u: "%" },
  ];
  const max = Math.max(1, ...TOTAL);
  const curve = TOTAL.map((n, i) => `${i ? "L" : "M"}${((i / STEPS) * 480).toFixed(1)} ${(34 - (n / max) * 28).toFixed(1)}`).join(" ");
  const rightSide = selZ ? box(selZ.z.poly).x0 > 600 : false;

  return (
    <div className="ag one">
      <section className="ag-map-p nz-p" style={{ ["--i" as string]: 0 }}>
        <div className="ag-map-wrap"><div className="ag-map-in">
          <SiteMap snap={snap} hour={hour} t={t} sel={sel} onSelect={setSel} onCtrl={(id) => go("controllers", id)} tank={tank} />
          <div className="nz-hud">
            <div className="nz-key" aria-label="Colour key">
              <span><i className="wet" />Watering</span><span><i className="idle" />Not running</span><span><i className="bad" />Fault</span>
            </div>
          </div>
          {selZ && (
            <aside className={`lf-card ${rightSide ? "left" : ""}`} aria-label={`Zone ${selZ.z.id}`}>
              <button className="lf-x" onClick={() => setSel(null)} aria-label="Close"><X size={14} /></button>
              <h4>{selZ.z.id} · {selZ.z.name}</h4>
              <dl>
                <div><dt>Type</dt><dd>{selZ.z.type}</dd></div>
                <div><dt>Status</dt><dd>{selZ.status}</dd></div>
                <div><dt>Soil moisture</dt><dd>{fmt(selZ.moist, 1)} %</dd></div>
                <div><dt>Runs today</dt><dd>{fmt(runMin(selZ.z))} min · {fmt(flowLpm(selZ.z))} L/min</dd></div>
                <div><dt>Area</dt><dd>{fmt(selZ.z.area)} m²</dd></div>
              </dl>
              {selZ.z.fault && <p className="pv-fault">{selZ.z.fault}</p>}
              <button className="btn pri" onClick={() => go("controllers", selZ.z.ctrl)}>Open controller {selZ.z.ctrl}</button>
            </aside>
          )}
        </div></div>

        <div className="tl" aria-label="Time of day">
          <button className="tl-play" onClick={() => { setLive(false); setPlay((p) => !p); }} aria-label={play ? "Pause the day" : "Play the day"} title={play ? "Pause" : "Play the day"}>{play ? <Pause size={16} /> : <Play size={16} />}</button>
          <div className="tl-track">
            <svg viewBox="0 0 480 40" preserveAspectRatio="none" aria-hidden="true"><path d={`${curve} L480 40 L0 40 Z`} className="a" /><path d={curve} className="l" /></svg>
            <input type="range" min={0} max={23.5} step={0.25} value={hour} onChange={(e) => { setPlay(false); setLive(false); setHour(+e.target.value); }} aria-label="Hour of the day" />
          </div>
          <div className="tl-read"><b>{hh(hour)}</b><span>{watering ? `${watering} zone${watering > 1 ? "s" : ""} watering` : "No valve open"}{live && !play ? " · live, updates every 10 s" : ""}</span></div>
          <div className="tl-end">
            <button className="btn" onClick={() => { setPlay(false); setLive(true); setHour(nowHour()); }}>Now</button>
            <button className={`ag-alarm ${critical ? "bad" : "ok"}`} onClick={() => go("alarms")}>{critical ? `${critical} critical alarm` : "All normal"}</button>
          </div>
        </div>
      </section>

      <div className="ag-side solo">
        <Panel title="Summary" className="ag-sum" i={1}>
          <div className="tiles">
            {tiles.map((k, i) => (
              <div key={k.l} className="tile" style={{ ["--n" as string]: i }}><span>{k.l}</span><b><CountUp value={k.v} decimals={k.d} /> <small>{k.u}</small>{i === 0 && <ArrowUp size={16} className="up" aria-hidden />}</b></div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
