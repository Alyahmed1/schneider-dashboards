import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Eye, EyeOff, Pause, Play } from "lucide-react";
import { Chip, Segmented, TONE_COLOR } from "./ui";
import { BAD, colorOf, LEGEND, METRICS, SHOWS, type Metric } from "./mapcolor";
import {
  dayCurve, INSTRUMENTS, LEAKS, NODES, networkAt, nodeById, PIPES, pipeById, readInstrument, ZONES,
  type InstrumentType, type Pipe, type ZoneId,
} from "./network";

export type { Metric };

const GLYPH: Record<InstrumentType, string> = { flow: "Q", pressure: "P", quality: "Cl", level: "H", pump: "M", leak: "Lk", prv: "V" };
const TYPE_NAME: Record<InstrumentType, string> = { flow: "Flow meter", pressure: "Pressure sensor", quality: "Chlorine analyser", level: "Level sensor", pump: "Pump", leak: "Leak logger", prv: "Pressure-reducing valve" };

const CURVE = dayCurve();
const CURVE_MAX = Math.max(...CURVE.map((d) => d.supplied));
const hh = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const period = (h: number) => (h < 5 ? "Night low" : h < 9 ? "Morning peak" : h < 17 ? "Daytime" : h < 21 ? "Evening peak" : "Night");

const stroke = (p: Pipe) => Math.min(12, 4 + p.dn / 120);
const mid = (p: Pipe, t = 0.5) => { const a = nodeById(p.from), b = nodeById(p.to); return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; };

interface Hover { id: string; x: number; y: number }

export default function NetworkMap({ preset }: { preset?: { hour: number; metric: Metric; n: number } | null }) {
  const [metric, setMetric] = useState<Metric>(preset?.metric ?? "Consumption");
  const [hour, setHour] = useState(preset?.hour ?? 8);
  const [play, setPlay] = useState(false);
  // the assistant can send the map to a time and a colouring
  useEffect(() => { if (preset) { setMetric(preset.metric); setHour(preset.hour); setPlay(false); } }, [preset?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const [zone, setZone] = useState<ZoneId | null>(null);
  const [sel, setSel] = useState<string | null>("FT-04");
  const [showInst, setShowInst] = useState(true);
  const [hover, setHover] = useState<Hover | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!play) return;
    const id = window.setInterval(() => setHour((h) => (h + 0.25) % 24), 230);
    return () => window.clearInterval(id);
  }, [play]);

  const s = networkAt(hour);

  /** colour of a pipe in the current mode */
  const pipeColor = (p: Pipe) => {
    if (p.kind === "tie") return "var(--wire)";
    const st = s.pipes[p.id];
    switch (metric) {
      case "Consumption": return colorOf(metric, st.load);
      case "Pressure": return colorOf(metric, st.pressure);
      case "Leakage": {
        if (st.leak > 0) return BAD;
        return p.zone === "trunk" ? "var(--wire)" : colorOf(metric, s.zones[p.zone].nrw);
      }
    }
  };

  // instruments that share an anchor are fanned out so none sits on another
  const placed = useMemo(() => {
    const seen = new Map<string, number>();
    return INSTRUMENTS.map((inst) => {
      const key = inst.at.node ?? `${inst.at.pipe}`;
      const k = seen.get(key) ?? 0; seen.set(key, k + 1);
      const base = inst.at.node ? nodeById(inst.at.node) : mid(pipeById(inst.at.pipe!), inst.type === "prv" ? 0.72 : 0.4);
      if (!inst.at.node && k === 0) return { inst, x: base.x, y: base.y, lead: false };
      const ang = (-90 + k * 70 + (inst.at.node ? 0 : 40)) * (Math.PI / 180), r = inst.at.node ? 22 : 18;
      return { inst, x: base.x + Math.cos(ang) * r, y: base.y + Math.sin(ang) * r, lead: true, bx: base.x, by: base.y };
    });
  }, []);

  const readings = useMemo(() => Object.fromEntries(INSTRUMENTS.map((i) => [i.id, readInstrument(i, hour)])), [hour]);
  const selInst = INSTRUMENTS.find((i) => i.id === sel) ?? null;
  const trend = useMemo(() => (selInst ? Array.from({ length: 24 }, (_, h) => ({ h, v: +readInstrument(selInst, h).value.toFixed(2) })) : []), [selInst]);

  const onMove = (id: string) => (e: MouseEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    setHover({ id, x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const dim = (z: ZoneId | "trunk") => zone !== null && z !== "trunk" && z !== zone;
  const hp = hover && PIPES.find((p) => p.id === hover.id);
  const hi = hover && INSTRUMENTS.find((i) => i.id === hover.id);
  const bad = INSTRUMENTS.filter((i) => readings[i.id].tone === "bad").length + LEAKS.length;

  /** mean pipe load of a zone, the same number the pipes are coloured with */
  const zoneLoad = (id: ZoneId) => { const ps = PIPES.filter((p) => p.zone === id && p.kind === "tree"); return ps.reduce((a, p) => a + s.pipes[p.id].load, 0) / ps.length; };
  const avgP = ZONES.reduce((a, z) => a + s.zones[z.id].pressure * s.zones[z.id].demand, 0) / ZONES.reduce((a, z) => a + s.zones[z.id].demand, 0);
  const nrw = s.loss / s.supplied;
  const legend = LEGEND[metric];

  return (
    <div className="nm">
      <section className="hm-map-p nm-map-p">
        <div className="nm-head">
          <Segmented<Metric> label="Colour the network by" value={metric} options={METRICS} onChange={setMetric} />
          <div className="nm-head-r">
            <button className={`nm-btn ${showInst ? "on" : ""}`} onClick={() => setShowInst(!showInst)} aria-pressed={showInst}>{showInst ? <Eye size={14} /> : <EyeOff size={14} />} Instruments</button>
            <span className={`hm-alarm ${bad ? "bad" : "ok"}`}>{bad} active faults</span>
          </div>
        </div>

        <div className="nm-wrap" ref={wrap} onMouseLeave={() => setHover(null)}>
          <svg className="nm-svg" viewBox="0 0 960 650" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Water network map coloured by ${metric}`}>


            {/* the zones: soft areas behind the pipes (one group, so overlaps do not stack) */}
            {ZONES.map((z) => (
              <g key={z.id} className={`nm-zone ${zone === z.id ? "on" : ""} ${dim(z.id) ? "dim" : ""}`} onClick={() => setZone(zone === z.id ? null : z.id)}>
                <g>{NODES.filter((n) => n.zone === z.id).map((n) => <circle key={n.id} cx={n.x} cy={n.y} r={52} />)}</g>
              </g>
            ))}
            {ZONES.map((z) => (
              <g key={z.id} className={`nm-zlabel ${dim(z.id) ? "dim" : ""}`} transform={`translate(${z.label.x} ${z.label.y})`} onClick={() => setZone(zone === z.id ? null : z.id)}>
                <text className="n" textAnchor="middle">{z.name}</text>
                <text className="v" y="15" textAnchor="middle">{s.zones[z.id].supplied.toFixed(0)} L/s · {(s.zones[z.id].nrw * 100).toFixed(0)}% lost</text>
              </g>
            ))}

            {/* pipes: the coloured pipe, then moving water on top (faster water, faster dots) */}
            {PIPES.map((p, i) => {
              const a = nodeById(p.from), b = nodeById(p.to), st = s.pipes[p.id];
              const d = `M${a.x} ${a.y} L${b.x} ${b.y}`;
              const w = stroke(p);
              const dur = Math.max(0.35, Math.min(4, 13 / (Math.max(st.velocity, 0.05) * 14)));
              return (
                <g key={p.id} className={`nm-pipe ${dim(p.zone) ? "dim" : ""}`} style={{ ["--i" as string]: i }}>
                  <path className={`nm-p k-${p.kind}`} d={d} stroke={pipeColor(p)} strokeWidth={p.kind === "tie" ? 2 : w} />
                  {!st.closed && st.flow > 0.5 && <path className={`nm-flow ${st.reverse ? "rev" : ""}`} d={d} strokeWidth={Math.max(1.6, w * 0.34)} style={{ ["--dur" as string]: `${dur}s` }} />}
                  <path className="nm-hit" d={d} onMouseMove={onMove(p.id)} />
                  {p.kind === "tie" && (() => { const m = mid(p); return <g className="nm-valve" transform={`translate(${m.x} ${m.y})`}><circle r="5.5" /><path d="M-2.6 -2.6 L2.6 2.6 M2.6 -2.6 L-2.6 2.6" /></g>; })()}
                </g>
              );
            })}

            {/* the plant, pumps, reservoir and junctions */}
            {NODES.map((n) => {
              if (n.kind === "plant") return (
                <g key={n.id} transform={`translate(${n.x} ${n.y})`} className="nm-asset">
                  <rect x="-24" y="-15" width="48" height="30" rx="3" /><path className="ic" d="M0 -8 C4 -2 7 1 7 4 A7 7 0 0 1 -7 4 C-7 1 -4 -2 0 -8Z" />
                  <text y="30" textAnchor="middle">Treatment plant</text>
                </g>
              );
              if (n.kind === "pump") return (
                <g key={n.id} transform={`translate(${n.x} ${n.y})`} className="nm-asset">
                  <circle r="13" /><path className="ic spin" d="M-5 -6 L7 0 L-5 6Z" />
                  <text y="29" textAnchor="middle">{n.id === "ps1" ? "Pump station PS-1" : "Booster PS-2"}</text>
                </g>
              );
              if (n.kind === "tank") return (
                <g key={n.id} transform={`translate(${n.x} ${n.y})`} className="nm-asset nm-tank">
                  <path d="M-16 -22 L16 -22 L11 2 L-11 2Z" /><rect className="lvl" x="-11" y={2 - 22 * (s.tank / 100)} width="22" height={22 * (s.tank / 100)} /><rect x="-3" y="2" width="6" height="14" />
                  <text x="-24" y="-8" textAnchor="end">Reservoir {s.tank.toFixed(0)}%</text>
                </g>
              );
              if (n.kind === "junction") return <circle key={n.id} className="nm-j" cx={n.x} cy={n.y} r="4.5" />;
              return <circle key={n.id} className="nm-n" cx={n.x} cy={n.y} r="4" style={metric === "Pressure" ? { fill: colorOf("Pressure", s.nodes[n.id].pressure) } : undefined} />;
            })}

            {/* known leaks */}
            {LEAKS.map((l) => { const m = mid(pipeById(l.pipe), 0.55); return (
              <g key={l.id} className="nm-leak" transform={`translate(${m.x} ${m.y})`}>
                <circle className="rip" r="6" /><circle className="rip r2" r="6" /><circle className="dot" r="5" />
                <text y="-12" textAnchor="middle">{l.rate} L/s</text>
              </g>
            ); })}

            {/* instruments */}
            {showInst && placed.filter(({ inst }) => SHOWS[metric].includes(inst.type)).map(({ inst, x, y, lead, bx, by }) => {
              const r = readings[inst.id];
              return (
                <g key={inst.id} className={`nm-inst ${r.tone} ${sel === inst.id ? "sel" : ""}`} transform={`translate(${x} ${y})`} onClick={() => setSel(inst.id)} onMouseMove={onMove(inst.id)} tabIndex={0} role="button" aria-label={`${inst.id} ${inst.name}: ${r.text}`}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSel(inst.id); }}>
                  {lead && <line className="lead" x1={0} y1={0} x2={(bx ?? x) - x} y2={(by ?? y) - y} />}
                  {sel === inst.id && <circle className="halo" r="18" />}
                  <circle className="b" r="12" style={{ stroke: TONE_COLOR[r.tone] }} />
                  <text y="4" textAnchor="middle">{GLYPH[inst.type]}</text>
                  <text className="rd" y="27" textAnchor="middle">{r.text}</text>
                </g>
              );
            })}
          </svg>

          {/* legend */}
          <div className="nm-legend" aria-label="Colour key">
            <b>{legend.title}</b>
            {legend.items.map((i) => <div key={i.label} className="row"><i style={{ background: i.c }} /><span>{i.label}</span><em>{i.note}</em></div>)}
            <div className="row"><i className="tie" /><span>Closed valve</span><em>no flow</em></div>
          </div>

          {hover && (hp || hi) && (
            <div className="nm-tip" style={{ left: Math.min(hover.x + 14, (wrap.current?.clientWidth ?? 600) - 210), top: hover.y + 14 }}>
              {hp && (() => { const st = s.pipes[hp.id]; return <>
                <b>{hp.id} · DN{hp.dn} · {hp.zone === "trunk" ? "Trunk main" : ZONES.find((z) => z.id === hp.zone)!.name}</b>
                {hp.kind === "tie" ? <span>Closed tie valve: no flow</span> : <>
                  <span>Flow <em>{st.flow.toFixed(0)} L/s</em> · {st.velocity.toFixed(2)} m/s</span>
                  <span>Pressure <em>{st.pressure.toFixed(1)} bar</em> · head loss {st.headloss.toFixed(1)} m</span>
                  <span>Water age <em>{((s.nodes[hp.from].age + s.nodes[hp.to].age) / 2).toFixed(1)} h</em> · {hp.length} m long</span>
                  {st.leak > 0 && <span className="bad">Leak {st.leak} L/s</span>}
                </>}
              </>; })()}
              {hi && <><b>{hi.id} · {hi.name}</b><span>{readings[hi.id].text} · {readings[hi.id].detail}</span></>}
            </div>
          )}
        </div>

        {/* time: drag to see the network through the day, or press play */}
        <div className="nm-time">
          <button className="nm-play" onClick={() => setPlay(!play)} aria-label={play ? "Pause" : "Play the day"}>{play ? <Pause size={16} /> : <Play size={16} />}</button>
          <div className="nm-track">
            <svg viewBox="0 0 96 28" preserveAspectRatio="none" aria-hidden>
              <path d={`M0 28 ${CURVE.map((d, i) => `L${(i / 23) * 96} ${28 - (d.supplied / CURVE_MAX) * 24}`).join(" ")} L96 28Z`} />
            </svg>
            <i className="cur" style={{ left: `${(hour / 23.75) * 100}%` }} />
            <input type="range" min={0} max={23.75} step={0.25} value={hour} onChange={(e) => { setPlay(false); setHour(+e.target.value); }} aria-label="Time of day" />
          </div>
          <div className="nm-clock"><b>{hh(hour)}</b><span>{period(hour)}</span></div>
          <button className="nm-btn" onClick={() => { setPlay(false); const d = new Date(); setHour(Math.floor((d.getHours() + d.getMinutes() / 60) * 4) / 4); }}>Now</button>
        </div>
      </section>

      <aside className="nm-side">
        <section className="hm-p nm-stats">
          <div><span>Supplied</span><b>{s.supplied.toFixed(0)}<small> L/s</small></b></div>
          <div><span>Water lost</span><b className={nrw > 0.2 ? "warn" : ""}>{(nrw * 100).toFixed(1)}<small> %</small></b></div>
          <div><span>Avg pressure</span><b className={avgP < 2.8 ? "warn" : ""}>{avgP.toFixed(1)}<small> bar</small></b></div>
          <div><span>Reservoir</span><b>{s.tank.toFixed(0)}<small> %</small></b></div>
        </section>

        <section className="hm-p nm-zones">
          <h3>Zones {zone && <button className="nm-clear" onClick={() => setZone(null)}>Show all</button>}</h3>
          <table>
            <thead><tr><th>Zone</th><th>Use L/s</th><th>Bar</th><th>Lost</th></tr></thead>
            <tbody>
              {[...ZONES].sort((a, b) => s.zones[b.id].demand - s.zones[a.id].demand).map((z) => {
                const q = s.zones[z.id];
                const col = metric === "Pressure" ? colorOf(metric, q.pressure) : metric === "Leakage" ? colorOf(metric, q.nrw) : colorOf("Consumption", zoneLoad(z.id));
                return (
                  <tr key={z.id} className={zone === z.id ? "on" : ""} onClick={() => setZone(zone === z.id ? null : z.id)}>
                    <td><i style={{ background: col }} />{z.name}</td>
                    <td>{q.demand.toFixed(0)}</td>
                    <td className={q.minPressure < 2.5 ? "warn" : ""}>{q.pressure.toFixed(1)}</td>
                    <td className={q.nrw > 0.2 ? "warn" : ""}>{(q.nrw * 100).toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="hm-p nm-detail">
          {selInst ? (() => { const r = readings[selInst.id]; const off = selInst.forced === "offline"; return <>
            <div className="nm-dh"><div><small>{selInst.id} · {TYPE_NAME[selInst.type]}</small><h3>{selInst.name}</h3></div><Chip tone={r.tone}>{off ? "Offline" : r.tone === "good" ? "Normal" : r.tone === "warn" ? "Watch" : "Fault"}</Chip></div>
            <div className="nm-val"><b>{off ? "—" : r.text}</b><span>{r.detail}</span></div>
            <div className="nm-chart">
              {off ? <p>No data since 06:10. Check the radio link at the pole.</p> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--line-2)" strokeDasharray="3 4" vertical={false} />
                    <XAxis dataKey="h" ticks={[0, 6, 12, 18, 23]} tickFormatter={(v) => `${v}h`} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={46} />
                    <ReferenceLine x={Math.floor(hour)} stroke="var(--teal)" strokeDasharray="4 3" />
                    <Line type="monotone" dataKey="v" stroke="var(--teal)" strokeWidth={2} dot={false} isAnimationActive />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </>; })() : <p className="nm-empty">Click an instrument on the map to see its reading and its day.</p>}
        </section>
      </aside>
    </div>
  );
}
