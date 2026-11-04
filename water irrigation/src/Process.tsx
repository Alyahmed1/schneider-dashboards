import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt, MOMENT_LABELS, momentHour, type Moment } from "./farm";
import { FRESH_VALUE, GW, gwAt, gwDay, PARAMS, reuseYtd, TREAT_COST } from "./grey";
import { useAspect } from "./useAspect";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import { CountUp, Panel, Ring, Segmented, Tip } from "./ui";

const W0 = 1250, H0 = 440, MY = 250; // drawing grid, and the height of the main pipe
const BUBBLES = [0, 1, 2, 3, 4, 5];

/** Landscape · Process (grey water):  a drawn process diagram, from showers and laundry through screen, membrane reactor, UV and chlorine to the storage tank and back out to the gardens and the farm */
export default function Process() {
  const t = useTick();
  const grow = useGrow();
  const [moment, setMoment] = useState<Moment>("Morning");
  const hour = momentHour(moment);
  const p = gwAt(hour);
  const day = useMemo(() => gwDay(), []);
  const ytd = useMemo(() => reuseYtd(), []);
  const made = ytd.reduce((q, m) => q + m.gen, 0);
  const reused = ytd.reduce((q, m) => q + m.reused, 0);
  const net = reused * (FRESH_VALUE - TREAT_COST);
  const cl = PARAMS.find((x) => x.id === "cl")!.outlet;
  const [ref, asp] = useAspect<SVGSVGElement>(1.8, 5);
  const W = Math.max(W0, H0 * asp), H = Math.max(H0, W / asp), dy = (H - H0) / 2;
  const X = (x: number) => (x * W) / W0; // equipment moves apart as the box gets wider; its size stays the same
  const running = p.treat > 0;
  const on = running ? "on" : "";
  const cEdge = X(250), sEdge = X(1035);
  const pumpX = X(1035) + 85, colX = X(1035) + 125;
  const outs = [{ y: 100, t: "Landscape", v: day.landscape, run: p.landscape > 0 }, { y: 230, t: "Farm", v: day.farm, run: p.farm > 0 }, { y: 360, t: "Overflow", v: day.overflow, run: p.overflow > 0 }];

  // a cylinder tank with the water level inside
  const tank = (id: string, cx: number, y: number, w: number, h: number, level: number) => {
    const x = cx - w / 2, ry = 14, top = y + ry, bot = y + h - ry, wy = bot - (bot - top) * Math.min(1, Math.max(0, level));
    return (
      <g className="gp-tank">
        <clipPath id={`gp-${id}`}><path d={`M${x} ${top} V${bot} A${w / 2} ${ry} 0 0 0 ${x + w} ${bot} V${top} Z`} /></clipPath>
        <rect className="water" x={x} y={wy} width={w} height={y + h - wy} clipPath={`url(#gp-${id})`} />
        <path className="body" d={`M${x} ${top} V${bot} A${w / 2} ${ry} 0 0 0 ${x + w} ${bot} V${top}`} />
        <ellipse className="body" cx={cx} cy={top} rx={w / 2} ry={ry} />
        <path className="surf" d={`M${x + 4} ${wy + 2} Q${x + w / 4} ${wy - 3} ${cx} ${wy + 2} T${x + w - 4} ${wy + 2}`} clipPath={`url(#gp-${id})`} />
      </g>
    );
  };
  const pump = (cx: number, cy: number, r: number, run: boolean) => (
    <g className={`gp-pump ${run ? "on" : ""}`}>
      <circle cx={cx} cy={cy} r={r} />
      <g transform={`translate(${cx} ${cy})`}><g className="imp"><path d={`M0 0 L0 ${-r * 0.7} M0 0 L${r * 0.6} ${r * 0.35} M0 0 L${-r * 0.6} ${r * 0.35}`} /></g></g>
    </g>
  );
  const tag = (cx: number, y: number, text: string, ey: number, click?: () => void) => {
    const w = text.length * 8 + 22;
    return (
      <g className={`gp-tag ${click ? "click" : ""}`} onClick={click}>
        <path d={`M${cx} ${y + 24} V${ey}`} />
        <rect x={cx - w / 2} y={y} width={w} height={24} rx={12} />
        <text x={cx} y={y + 17} textAnchor="middle">{text}</text>
      </g>
    );
  };
  const label = (cx: number, y: number, title: string, sub: string) => (
    <g><text className="gp-t" x={cx} y={y} textAnchor="middle">{title}</text><text className="gp-s" x={cx} y={y + 20} textAnchor="middle">{sub}</text></g>
  );

  const greyIn = `M${X(118)} 75 H${X(170)} M${X(118)} 200 H${X(170)} M${X(118)} 325 H${X(170)} M${X(170)} 75 V325 M${X(170)} ${MY} H${cEdge - 55}`;
  const mainA = `M${cEdge + 55} ${MY} H${X(370)}`;                 // collection → screen
  const mainB = `M${X(450)} ${MY} H${X(500) - 22} M${X(500) + 22} ${MY} H${X(560)}`; // screen → pump → reactor
  const mainC = `M${X(700)} ${MY} H${X(760)} M${X(850)} ${MY} H${sEdge - 55}`; // reactor → UV → storage
  const outPipe = `M${sEdge + 55} 290 H${pumpX - 20} M${pumpX + 20} 290 H${colX} M${colX} 100 V360`;

  return (
    <div className="vw ov pr">
      <Panel title="Grey water plant" className="ov-dia" i={0}
        right={<div className="ov-head"><span className="ov-leg"><i className="canal" />Grey water<i className="pump" />Treated water<i className="loss" />Overflow</span><Segmented<Moment> label="Time of day" value={moment} options={MOMENT_LABELS} onChange={setMoment} /></div>}>
        <div className="ov-wrap">
          <svg ref={ref} className="ov-svg gp" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Grey water process: showers, laundry and kitchen into the collection tank, screen, membrane bioreactor, UV, chlorine, storage tank and reuse">
            <g transform={`translate(0 ${dy})`}>
              {/* pipes */}
              <g className="gp-pipes">
                <path className="grey" d={greyIn} />
                <path className="grey" d={mainA} />
                <path className="treated" d={`${mainB} ${mainC}`} />
                <path className="dose" d={`M${X(920)} 200 V${MY}`} />
                <path className="treated" d={outPipe} />
                {outs.map((o) => <path key={o.t} className={o.t === "Overflow" ? "loss" : "treated"} d={`M${colX} ${o.y} H${X(1200) - 25}`} />)}
              </g>
              <g className="gp-flows">
                {p.gen > 0.3 && <path className="gp-fl" d={greyIn} />}
                {running && <path className="gp-fl" d={`${mainA} ${mainB} ${mainC}`} />}
                {running && <path className="gp-fl dose" d={`M${X(920)} 200 V${MY}`} />}
                {(p.landscape > 0 || p.farm > 0) && <path className="gp-fl" d={`M${sEdge + 55} 290 H${pumpX - 20} M${pumpX + 20} 290 H${colX}`} />}
                {outs.map((o) => o.run && <path key={o.t} className={`gp-fl ${o.t === "Overflow" ? "lost" : ""}`} d={`M${colX} 290 V${o.y} H${X(1200) - 25}`} />)}
              </g>

              {/* sources: a shower, a washing machine and a kitchen sink */}
              <g className="gp-eq" transform={`translate(${X(80) - 30} 40)`}>
                <path d="M4 0 H30 V12 M18 12 H42 L38 24 H22 Z" /><path className="drops" d="M24 32 v10 M30 32 v14 M36 32 v10" />
              </g>
              {label(X(80), 132, "Showers", "38 m³/day")}
              <g className="gp-eq" transform={`translate(${X(80) - 30} 165)`}>
                <rect x={4} y={0} width={52} height={64} rx={4} /><circle cx={30} cy={38} r={15} /><circle cx={30} cy={38} r={7} className="spin-s" /><path d="M10 10 H22 M40 10 H46" />
              </g>
              {label(X(80), 257, "Laundry", "22 m³/day")}
              <g className="gp-eq" transform={`translate(${X(80) - 30} 296)`}>
                <path d="M6 28 H54 L48 52 H12 Z M30 28 V14 H44 M44 14 V22" /><path className="drops" d="M44 26 v6" />
              </g>
              {label(X(80), 382, "Kitchen", "8 m³/day")}

              {/* collection tank, screen, transfer pump */}
              {tank("coll", cEdge, 140, 110, 170, p.coll / GW.collect)}
              {tag(cEdge, 92, `LIT ${fmt((p.coll / GW.collect) * 100)}%`, 140)}
              {label(cEdge, 352, "Collection tank", `${fmt(p.coll)} m³`)}
              <g className={`gp-eq ${on}`}>
                <rect x={X(370)} y={222} width={80} height={56} rx={4} />
                <path d={`M${X(370) + 14} 228 l10 44 M${X(370) + 28} 228 l10 44 M${X(370) + 42} 228 l10 44 M${X(370) + 56} 228 l10 44`} />
              </g>
              {tag(X(410), 176, `FIT ${fmt(p.treat, 1)} m³/h`, 222)}
              {label(X(410), 352, "Screen", "removes hair, lint")}
              {pump(X(500), MY, 22, running)}
              {label(X(500), 300, "Pump", "")}

              {/* membrane bioreactor: air bubbles and membrane modules */}
              <g className={`gp-eq ${on}`}>
                <rect className="tankbox" x={X(560)} y={150} width={140} height={180} rx={6} />
                <rect className="water" x={X(560) + 1} y={178} width={138} height={151} />
                {[28, 64, 100].map((d) => <rect key={d} className="mem" x={X(560) + d} y={200} width={12} height={100} rx={2} />)}
                {running && BUBBLES.map((b) => <circle key={b} className="bub" cx={X(560) + 18 + b * 21} cy={318} r={4} style={{ ["--d" as string]: `${b * 0.45}s` }} />)}
              </g>
              {tag(X(630), 100, `DO ${fmt(wobble(2.1, 3, t, 0.03), 1)} mg/L`, 150)}
              {label(X(630), 352, "Membrane bioreactor", "aeration and membranes")}

              {/* UV lamp */}
              <g className={`gp-eq ${on}`}>
                <rect x={X(760)} y={232} width={90} height={36} rx={18} />
                <path className="lamp" d={`M${X(760) + 16} ${MY} H${X(850) - 16}`} />
              </g>
              {tag(X(805), 176, running ? "42 mJ/cm²" : "UV standby", 232)}
              {label(X(805), 352, "UV", "disinfection")}

              {/* chlorine dosing */}
              <g className={`gp-eq ${on}`}>
                <rect x={X(920) - 24} y={150} width={48} height={50} rx={4} /><rect className="water" x={X(920) - 23} y={168} width={46} height={31} />
              </g>
              {pump(X(920), 226, 11, running)}
              {tag(X(920), 100, `AIT ${fmt(wobble(cl, 4, t, 0.03), 2)} mg/L`, 150)}
              {label(X(920), 352, "Chlorine", "dosing")}

              {/* storage tank and the reuse pump */}
              {tank("store", sEdge, 140, 110, 170, p.store / GW.store)}
              {tag(sEdge, 92, `LIT ${fmt((p.store / GW.store) * 100)}%`, 140)}
              {label(sEdge, 352, "Storage tank", `${fmt(p.store)} m³`)}
              {pump(pumpX, 290, 20, p.landscape > 0 || p.farm > 0)}

              {/* where the water goes */}
              <g className="gp-eq" transform={`translate(${X(1200) - 22} ${100 - 24})`}>
                <circle cx={22} cy={18} r={18} /><path d="M22 36 V50" />
              </g>
              {label(X(1200), 156, "Landscape", `${fmt(day.landscape)} m³`)}
              <g className="gp-eq" transform={`translate(${X(1200) - 25} ${230 - 24})`}>
                <path d="M4 44 H46 M10 44 V26 M10 34 L4 26 M10 34 L16 26 M25 44 V20 M25 30 L19 22 M25 30 L31 22 M40 44 V26 M40 34 L34 26 M40 34 L46 26" />
              </g>
              {label(X(1200), 286, "Farm", `${fmt(day.farm)} m³`)}
              <g className="gp-eq bad" transform={`translate(${X(1200) - 22} ${360 - 14})`}>
                <rect x={0} y={0} width={44} height={28} rx={3} /><path d="M11 4 V24 M22 4 V24 M33 4 V24" />
              </g>
              {label(X(1200), 406, "Overflow", `${fmt(day.overflow)} m³`)}
              <text className="gp-s" x={X(80)} y={H0 - 6} textAnchor="middle">{fmt(day.gen)} m³ made today</text>
            </g>
          </svg>
        </div>
      </Panel>

      <Panel title="Reuse and savings, this year" className="pr-sum" i={1}>
        <div className="tiles">
          <div className="tile"><span>Grey water reused</span><b><CountUp value={(reused / made) * 100} decimals={0} /> <small>% of what is made</small></b></div>
          <div className="tile"><span>Money saved</span><b><CountUp value={net / 1000} decimals={0} /> <small>k LE</small></b></div>
          <div className="tile"><span>Made today</span><b><CountUp value={day.gen} decimals={0} /> <small>m³</small></b></div>
          <div className="tile"><span>Overflow to the sewer today</span><b><CountUp value={day.overflow} decimals={0} /> <small>m³</small></b></div>
        </div>
      </Panel>
      <div className="ov-gauges five">
        <Panel title="Collection tank" i={1}><Ring value={(p.coll / GW.collect) * 100} max={100} unit="% full" grow={grow} color="var(--water)" /></Panel>
        <Panel title="Storage tank" i={2}><Ring value={(p.store / GW.store) * 100} max={100} unit="% full" grow={grow} color="var(--teal)" /></Panel>
        <Panel title="Treated flow" i={3}><Ring value={p.treat} max={5} unit="m³/h" decimals={1} grow={grow} color="var(--amber)" /></Panel>
        <Panel title="Turbidity out" i={4}><Ring value={wobble(1.1, 5, t, 0.03)} max={5} unit="NTU" decimals={1} grow={grow} color="var(--good)" /></Panel>
        <Panel title="Free chlorine" i={5}><Ring value={wobble(cl, 6, t, 0.03)} max={1.5} unit="mg/L" decimals={2} grow={grow} color="var(--water)" /></Panel>
      </div>
      <Panel title="Made and reused, month by month" className="pr-year" i={6}
        right={<span className="pm-leg"><span className="key"><i style={{ background: "var(--muted)", opacity: 0.6 }} />Made</span><span className="key"><i style={{ background: "var(--teal)" }} />Reused</span></span>}>
        <div className="chart">
          <ResponsiveContainer>
            <BarChart data={ytd} margin={{ left: 0, right: 8, top: 6, bottom: 0 }} barGap={2}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="t" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} width={44} tickCount={4} />
              <Tooltip content={<Tip unit="m³" />} cursor={{ fill: "var(--tint)" }} />
              <Bar dataKey="gen" name="Made" fill="var(--muted)" fillOpacity={0.55} barSize={10} isAnimationActive animationDuration={900} />
              <Bar dataKey="reused" name="Reused" fill="var(--teal)" barSize={10} isAnimationActive animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
