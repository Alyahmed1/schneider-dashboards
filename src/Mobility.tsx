import { useEffect, useMemo, useRef, useState } from "react";
import { useStoryCmd } from "./storytour";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Car, Gauge, Navigation, Pause, Play, Radio, Timer } from "lucide-react";
import MasterMap from "./MasterMap";
import { GATES, LOTS, ROADS, asPath, lengthOf, pointAt, type Lot } from "./plan";
import { avgSpeed, clock, forecastSeries, freeSpaces, gateQueue, loadColor, lotOcc, lotTaken, networkIndex, nextPeak, occColor, roadLoad, searchMinutes, totalSpaces } from "./traffic";
import { LivePill, rng, useTick } from "./live";
import { CountUp, Panel, REDUCE, useGrow } from "./ui";

const LENS = ROADS.map((r) => lengthOf(r.pts));
const MAXC = LENS.map((l) => Math.max(4, Math.min(16, Math.round(l / 22))));
const nowHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };

/** small dots driving along every road: more of them and slower when the road is busier. They move by direct DOM updates, not React state. */
function Cars({ loads }: { loads: Record<string, number> }) {
  const els = useRef<(SVGCircleElement | null)[]>([]);
  const loadsRef = useRef(loads);
  loadsRef.current = loads;
  const cars = useMemo(() => ROADS.flatMap((_r, ri) => Array.from({ length: MAXC[ri] }, (_, k) => ({ ri, k, f: (k / MAXC[ri] + rng(ri * 37 + k)() * 0.08) % 1, dir: k % 2 ? 1 : -1, v: 0.85 + rng(ri * 53 + k)() * 0.3 }))), []);
  useEffect(() => {
    let raf = 0, last = performance.now();
    const place = (dt: number) => {
      cars.forEach((c, i) => {
        const el = els.current[i];
        if (!el) return;
        const road = ROADS[c.ri], load = loadsRef.current[road.id] ?? 0.2;
        const shown = c.k < Math.round(MAXC[c.ri] * (0.25 + 0.75 * Math.min(1, load * 1.3)));
        el.style.opacity = shown ? "1" : "0";
        c.f = (c.f + (c.dir * (8 + 60 * (1 - 0.85 * load)) * c.v * dt) / LENS[c.ri] + 1) % 1;
        const p = pointAt(road.pts, c.f, LENS[c.ri]);
        const o = c.dir * 3.2;
        el.setAttribute("cx", (p.x - Math.sin(p.a) * o).toFixed(1));
        el.setAttribute("cy", (p.y + Math.cos(p.a) * o).toFixed(1));
        el.style.fill = loadColor(load);
      });
    };
    place(0);
    if (REDUCE) return;
    const step = (now: number) => { place(Math.min(0.05, (now - last) / 1000)); last = now; raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cars]);
  return <g className="cars" aria-hidden>{cars.map((_c, i) => <circle key={i} ref={(e) => { els.current[i] = e; }} r="3.3" />)}</g>;
}

/** Mobility: AI traffic management and smart parking on the plan, with a day you can play through */
export default function Mobility({ focus }: { focus?: string }) {
  const tick = useTick();
  const grow = useGrow(250);
  const [live, setLive] = useState(true);
  const [scrub, setScrub] = useState(nowHour);
  const [playing, setPlaying] = useState(false);
  const [layers, setLayers] = useState({ traffic: true, parking: true });
  const [lotId, setLotId] = useState<string | null>(() => (LOTS.some((l) => l.id === focus) ? (focus as string) : null));
  useStoryCmd((c, a) => {
    if (c === "mob:hour") { setLive(false); setPlaying(false); setScrub(Number(a)); }
    else if (c === "mob:play") { setLive(false); setPlaying(true); }
    else if (c === "mob:lot") setLotId(a || null);
  });

  // the clock: the real time in live mode, the slider otherwise; Play runs a whole day in about a minute
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setScrub((h) => (h + 0.05) % 24), 100);
    return () => window.clearInterval(id);
  }, [playing]);
  const hour = useMemo(() => (live ? nowHour() : scrub), [live, scrub, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const loads = useMemo(() => Object.fromEntries(ROADS.map((r) => [r.id, roadLoad(r, hour)])), [hour]);
  const index = networkIndex(hour);
  const queues = GATES.map((g) => ({ g, ...gateQueue(g.id, hour) }));
  const worst = queues.reduce((a, b) => (b.cars > a.cars ? b : a));
  const fc = useMemo(() => forecastSeries(Math.floor(hour)), [Math.floor(hour)]); // eslint-disable-line react-hooks/exhaustive-deps
  const peak = nextPeak(Math.floor(hour));
  const peakRoad = ROADS.reduce((a, b) => (roadLoad(b, peak.hour) > roadLoad(a, peak.hour) ? b : a));
  const peakGate = GATES.find((g) => g.road === peakRoad.id) ?? worst.g;
  const lot = LOTS.find((l) => l.id === lotId) ?? null;

  const kpis = [
    { icon: Gauge, label: "Congestion", value: index * 100, dec: 0, suf: "%" },
    { icon: Car, label: "Average speed", value: avgSpeed(index), dec: 0, suf: " km/h" },
    { icon: Navigation, label: `Free spaces of ${totalSpaces}`, value: freeSpaces(hour), dec: 0, suf: "" },
    { icon: Timer, label: "Time to find a space", value: searchMinutes(hour), dec: 1, suf: " min" },
    { icon: Radio, label: `Longest gate queue (${worst.g.id})`, value: worst.cars, dec: 0, suf: " cars" },
  ];

  const eta = (l: Lot) => { const km = (lengthOf(l.route) * 2.25) / 1000, v = Math.max(8, avgSpeed(index) * 0.7); return Math.max(1, Math.round((km / v) * 60)); };

  return (
    <div className="mob">
      <div className="mob-kpis">
        {kpis.map((k, i) => (
          <div className="kpi" key={k.label} style={{ ["--n" as string]: i }}>
            <k.icon size={16} /><span>{k.label}</span><b><CountUp value={k.value} decimals={k.dec} suffix={k.suf} ms={600} /></b>
          </div>
        ))}
      </div>

      <Panel title="Traffic and parking" className="mob-map" i={0} aside={
        <div className="map-tools">
          <button className={`chip ${layers.traffic ? "on" : ""}`} aria-pressed={layers.traffic} onClick={() => setLayers({ ...layers, traffic: !layers.traffic })}>Traffic</button>
          <button className={`chip ${layers.parking ? "on" : ""}`} aria-pressed={layers.parking} onClick={() => setLayers({ ...layers, parking: !layers.parking })}>Parking</button>
          <LivePill />
        </div>
      }>
        <div className="timebar">
          <button className="icon-btn" onClick={() => { setLive(false); setPlaying(!playing); }} aria-label={playing ? "Pause the day" : "Play the day"}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
          <b className="clock">{clock(hour)}</b>
          <input type="range" min={0} max={23.95} step={0.05} value={hour} aria-label="Time of day"
            onChange={(e) => { setLive(false); setPlaying(false); setScrub(+e.target.value); }} />
          <button className={`chip ${live ? "on" : ""}`} aria-pressed={live} onClick={() => { setLive(true); setPlaying(false); }}>Live</button>
        </div>
        <div className="map-wrap">
          <MasterMap muted grow={grow}>
            {layers.traffic && <g className="net">
              {ROADS.map((r) => (
                <g key={r.id}><path className="rd-case" d={asPath(r.pts)} /><path className="rd-load" d={asPath(r.pts)} style={{ stroke: loadColor(loads[r.id]) }} /><title>{`${r.name}: ${Math.round(loads[r.id] * 100)}% busy`}</title></g>
              ))}
              <Cars loads={loads} />
            </g>}
            {GATES.map((g) => {
              const q = queues.find((x) => x.g.id === g.id);
              return (
                <g key={g.id} className="gate" transform={`translate(${g.at[0]} ${g.at[1]})`}>
                  <rect x="-12" y="-12" width="24" height="24" rx="6" /><text y="5" textAnchor="middle">{g.id}</text>
                  {layers.traffic && q && <g className="gq" transform="translate(0 -22)"><rect x="-26" y="-10" width="52" height="17" rx="8" /><text y="3" textAnchor="middle">{q.cars} cars</text></g>}
                  <title>{`${g.name}: ${q?.cars ?? 0} cars waiting, about ${q?.wait ?? 0} min`}</title>
                </g>
              );
            })}
            {layers.parking && LOTS.map((l) => {
              const occ = lotOcc(l, hour), r = 11 + l.cap / 55, C = 2 * Math.PI * r, on = l.id === lotId;
              return (
                <g key={l.id} className={`lot ${on ? "on" : ""}`} transform={`translate(${l.at[0]} ${l.at[1]})`} tabIndex={0} role="button" aria-label={`${l.name}, ${Math.round(occ * 100)}% full`} aria-pressed={on}
                  onClick={() => setLotId(on ? null : l.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLotId(on ? null : l.id); } }}>
                  {on && <circle className="halo" r={r + 6} />}
                  <circle className="lot-bg" r={r} />
                  <circle className="lot-ring" r={r} style={{ stroke: occColor(occ), strokeDasharray: `${grow ? occ * C : 0} ${C}` }} transform="rotate(-90)" />
                  <text y="4.5" textAnchor="middle">P</text>
                  <title>{`${l.name}: ${lotTaken(l, hour)} of ${l.cap} taken`}</title>
                </g>
              );
            })}
            {lot && layers.parking && <g className="route" aria-hidden>
              <path className="route-line" d={asPath(lot.route)} />
              <circle r="6" className="route-dot"><animateMotion dur="3.2s" repeatCount="indefinite" path={asPath(lot.route)} /></circle>
            </g>}
          </MasterMap>
          <div className="map-legend" aria-hidden>
            <span><i style={{ background: "var(--good)" }} />Flowing</span><span><i style={{ background: "var(--warn)" }} />Busy</span><span><i style={{ background: "var(--bad)" }} />Jammed</span>
            <span className="sep">Parking ring = how full</span>
          </div>
        </div>
        <p className="map-note">Roads, gates, lots and traffic are sample data laid on the brief's zoning map. Drag the time slider or press play to watch a day.</p>
      </Panel>

      <div className="side">
        <Panel title="AI forecast" i={1} aside={<span className="loc-tag">next 12 hours</span>}>
          <div className="fc-chart" aria-label="Network congestion, so far today and the AI forecast">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={fc} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--line-2)" vertical={false} />
                <XAxis dataKey="label" interval={3} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={38} unit="%" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }} />
                <Area dataKey="band" stroke="none" fill="var(--gold)" fillOpacity={0.18} isAnimationActive={grow} name="Forecast range" />
                <Line dataKey="typical" stroke="var(--muted)" strokeDasharray="2 4" dot={false} strokeWidth={1.5} name="Typical day" isAnimationActive={grow} />
                <Line dataKey="actual" stroke="var(--green)" strokeWidth={2.4} dot={false} name="So far" isAnimationActive={grow} />
                <Line dataKey="forecast" stroke="var(--gold)" strokeWidth={2.4} strokeDasharray="6 4" dot={false} name="AI forecast" isAnimationActive={grow} />
                <ReferenceLine x={clock(Math.floor(hour))} stroke="var(--gold)" label={{ value: "now", fill: "var(--gold)", fontSize: 10, position: "insideTopRight" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="advice"><b>{String(peak.hour).padStart(2, "0")}:00</b> is the busiest hour ahead, about {peak.pct}% on {peakRoad.name}. Suggest an extra lane open at the {peakGate.name} from {String(Math.max(0, peak.hour - 1)).padStart(2, "0")}:00.</p>
        </Panel>

        <Panel title="Smart parking" className="grow" i={2} aside={<span className="loc-tag">{freeSpaces(hour)} free</span>}>
          <ul className="lots">
            {LOTS.map((l) => {
              const occ = lotOcc(l, hour), on = l.id === lotId;
              return (
                <li key={l.id}>
                  <button className={on ? "on" : ""} onClick={() => setLotId(on ? null : l.id)}>
                    <span className="ln">{l.name}</span>
                    <span className="lbar"><em style={{ width: grow ? `${occ * 100}%` : 0, background: occColor(occ) }} /></span>
                    <b>{l.cap - lotTaken(l, hour)}<small> free</small></b>
                  </button>
                  {on && <div className="guide"><Navigation size={14} /><span>Guide from the <b>{GATES.find((g) => g.id === l.gate)?.name}</b>: about <b>{eta(l)} min</b> by car, {Math.round(occ * 100)}% full.</span></div>}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
