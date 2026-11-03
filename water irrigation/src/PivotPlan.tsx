import { useEffect, useRef } from "react";
import { fmt, type PivotNow } from "./farm";
import { moistColor, STATUS_COLOR } from "./farmColor";
import { useAspect } from "./useAspect";

export interface Ctl { stopped: boolean; speed: number; endGun: boolean; reverse: boolean }
export const DEFAULT_CTL: Ctl = { stopped: false, speed: 100, endGun: true, reverse: false };

const REDUCE = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const S = 660, R = 235;
const rad = (d: number) => (d * Math.PI) / 180;
const LEGEND = [{ l: "Dry <28%", c: "#ef5a6a" }, { l: "Low 28-33%", c: "#f0b429" }, { l: "Optimal 33-45%", c: "#3ecf5a" }, { l: "Wet >45%", c: "#3db8ff" }];

/** a pivot seen from above: twelve sectors coloured by soil moisture, and the arm turning with its towers and a wet trail. In a wide box the circle stays in the middle and the sides carry the key and the readings. */
export default function PivotPlan({ n, sectors, ctl, running, flow }: { n: PivotNow; sectors: number[]; ctl: Ctl; running: boolean; flow: number }) {
  const [boxRef, asp] = useAspect<SVGSVGElement>(0.6, 3);
  const W = Math.max(S, S * asp), H = Math.max(S, W / asp);
  const C = W / 2, CY = H / 2;
  const wide = W >= 960;
  const armRef = useRef<SVGGElement>(null);
  const txtRef = useRef<SVGTextElement>(null);
  const angles = useRef<Record<string, number>>({});
  const id = n.p.id;
  const pt = (r: number, deg: number) => [C + r * Math.cos(rad(deg)), CY + r * Math.sin(rad(deg))] as const;

  // the arm is turned straight on the element (no React re-render per frame); a stopped pivot keeps its angle
  useEffect(() => {
    if (angles.current[id] === undefined) angles.current[id] = (id.charCodeAt(1) * 47) % 360;
    const set = () => {
      const a = ((angles.current[id] % 360) + 360) % 360;
      armRef.current?.setAttribute("transform", `rotate(${a.toFixed(1)} ${C} ${CY})`);
      if (txtRef.current) txtRef.current.textContent = `${Math.round(a)}°`;
    };
    set();
    if (!running || REDUCE) return;
    const dps = (360 / 30) * (ctl.speed / 100) * (ctl.reverse ? -1 : 1); // a turn every 30 s at full speed, to show the motion
    let raf = 0, last = performance.now();
    const loop = (now: number) => { angles.current[id] += dps * Math.min(0.1, (now - last) / 1000); last = now; set(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id, running, ctl.speed, ctl.reverse, C, CY]);

  const sc = STATUS_COLOR[n.status];
  const [tx, ty] = pt(R, -40);
  return (
    <svg ref={boxRef} className="pp" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Pivot ${id} seen from above, soil moisture by sector`}>
      <circle className="pp-road" cx={C} cy={CY} r={R + 10} />
      {sectors.map((v, i) => {
        const a0 = -90 + i * 30, a1 = a0 + 30;
        const [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1), [lx, ly] = pt(R + 32, a0 + 15);
        const c = moistColor(v);
        return (
          <g key={i}>
            <path className="pp-sec" d={`M${C} ${CY} L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z`} style={{ fill: c }}><title>{`Sector ${i + 1}: soil moisture ${fmt(v, 1)}%`}</title></path>
            <text className="pp-rim" x={lx} y={ly + 7} textAnchor={Math.abs(lx - C) < 30 ? "middle" : lx > C ? "start" : "end"}>{fmt(v)}%</text>
          </g>
        );
      })}
      <g ref={armRef}>
        {running && <path className="pp-wet" d={`M${C} ${CY} L${C + R} ${CY} A${R} ${R} 0 0 0 ${tx} ${ty} Z`} />}
        <line className="pp-arm" x1={C} y1={CY} x2={C + R} y2={CY} />
        {Array.from({ length: 7 }, (_, i) => {
          const bad = n.p.fault && i === 6;
          return <circle key={i} className={`pp-tower ${bad ? "bad" : ""}`} cx={C + (R * (i + 1)) / 7} cy={CY} r={i === 6 ? 9 : 7} />;
        })}
        {running && ctl.endGun && <path className="pp-gun" d={`M${C + R} ${CY} L${C + R + 26} ${CY - 16} A30 30 0 0 1 ${C + R + 26} ${CY + 16} Z`} />}
      </g>
      <circle className="pp-hub" cx={C} cy={CY} r={14} />

      <text className="pp-t1" x={14} y={34}>{id} · {n.p.crop}</text>
      <text className="pp-t2" x={14} y={60}>{n.p.stage}</text>
      <text className="pp-t2" x={W - 14} y={34} textAnchor="end">Arm angle</text>
      <text className="pp-t1" x={W - 14} y={64} textAnchor="end" ref={txtRef}>0°</text>
      <circle cx={22} cy={H - 56} r={8} style={{ fill: sc }} />
      <text className="pp-t3" x={38} y={H - 49}>{ctl.stopped && n.status === "Irrigating" ? "Stopped by operator" : n.status}</text>
      <text className="pp-t2" x={W - 14} y={H - 14} textAnchor="end">{running && ctl.endGun ? "End gun on" : "End gun off"}</text>
      <text className="pp-t2" x={14} y={H - 14}>Soil moisture by sector</text>

      {wide && <>
        {LEGEND.map((k, i) => (
          <g key={k.l}><rect x={14} y={CY - 60 + i * 34} width={18} height={18} fill={k.c} fillOpacity={0.7} /><text className="pp-key" x={40} y={CY - 45 + i * 34}>{k.l}</text></g>
        ))}
        <text className="pp-t2" x={W - 14} y={CY - 44} textAnchor="end">Speed</text>
        <text className="pp-t3" x={W - 14} y={CY - 18} textAnchor="end">{ctl.speed}% · {ctl.reverse ? "Reverse" : "Forward"}</text>
        <text className="pp-t2" x={W - 14} y={CY + 22} textAnchor="end">Flow</text>
        <text className="pp-t3" x={W - 14} y={CY + 48} textAnchor="end">{fmt(flow)} m³/h</text>
      </>}
    </svg>
  );
}
