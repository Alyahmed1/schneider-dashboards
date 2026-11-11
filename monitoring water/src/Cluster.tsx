import { useContext } from "react";
import { PhoneContext } from "./stage";
import { ChevronLeft, ChevronRight, Droplet, Gauge, Leaf, Power, TriangleAlert, Wind, type LucideIcon } from "lucide-react";
import { annular, pt } from "./geo";
import { applicationOf, pressureOf, statusOf, type PivotState } from "./model";

/** the top cluster of Pivot detail: two curved status widgets and the speed dial with the power button, one SVG so they stay aligned at every size */
const W = 660, H = 250, CX = 330, CY = 125;
const RI = 170, RO = 310, HALF = 20, GAP = 0.9;

interface Seg { value: string; unit?: string; label: string; icon: LucideIcon; fill: string; tone?: string; onClick?: () => void }

function Widget({ side, segs }: { side: "L" | "R"; segs: Seg[] }) {
  const n = segs.length;
  const step = (2 * HALF) / n;
  return (
    <g>
      {segs.map((s, k) => {
        // top to bottom
        const a0 = side === "L" ? 180 + HALF - (k + 1) * step + GAP : -HALF + k * step + GAP;
        const a1 = a0 + step - 2 * GAP;
        const mid = (a0 + a1) / 2;
        const [tx, ty] = pt(CX, CY, RI + (RO - RI) * 0.4, mid);
        const [ix, iy] = pt(CX, CY, RO - 24, mid);
        return (
          <g key={k} className={`cl-seg ${s.onClick ? "click" : ""}`} role={s.onClick ? "button" : undefined} tabIndex={s.onClick ? 0 : undefined} aria-label={s.onClick ? `${s.value} ${s.label}, open` : undefined} onClick={s.onClick} onKeyDown={s.onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); s.onClick!(); } } : undefined}>
            <path d={annular(CX, CY, RI, RO, a0, a1)} fill={s.fill} stroke="rgba(150,230,215,.55)" strokeWidth="1.5" />
            <text x={tx} y={ty + 2} textAnchor="middle" className="cl-val" fill={s.tone ?? "#fff"}>{s.value}{s.unit && <tspan className="cl-unit" dx="3">{s.unit}</tspan>}</text>
            <text x={tx} y={ty + 19} textAnchor="middle" className="cl-lab">{s.label}</text>
            <s.icon x={ix - 11} y={iy - 11} width={22} height={22} stroke={s.tone ?? "#bfeee2"} strokeWidth={1.8} />
          </g>
        );
      })}
    </g>
  );
}

/** phone: the six status values as plain tiles (the curved widgets would shrink their text to 7 px on a 366 px wide screen) */
function Tiles({ segs }: { segs: Seg[] }) {
  return (
    <div className="cl-tiles">
      {segs.map((s, k) => {
        const inner = (
          <>
            <s.icon size={20} color={s.tone ?? "#bfeee2"} strokeWidth={1.9} />
            <b style={{ color: s.tone ?? "#fff" }}>{s.value}{s.unit && <small>{s.unit}</small>}</b>
            <span>{s.label}</span>
          </>
        );
        return s.onClick
          ? <button key={k} className="cl-tile click" style={{ background: s.fill }} onClick={s.onClick} aria-label={`${s.value} ${s.label}, open`}>{inner}</button>
          : <div key={k} className="cl-tile" style={{ background: s.fill }}>{inner}</div>;
      })}
    </div>
  );
}

export default function Cluster({ p, alerts, canTune, onToggle, onSpeed, onAlerts }: { p: PivotState; alerts: number; canTune: boolean; onToggle: () => void; onSpeed: (v: number) => void; onAlerts: () => void }) {
  const phone = useContext(PhoneContext);
  const st = statusOf(p);
  const left: Seg[] = [
    { value: st === "on" ? "ON" : st === "fault" ? "FAULT" : "OFF", label: "Water", icon: Droplet, fill: "rgba(9,30,36,.82)", tone: st === "on" ? "#fff" : st === "fault" ? "#ff8b8b" : "#aab9c0" },
    { value: `${Math.round(p.fieldWater)}`, unit: "%", label: "Field water", icon: Droplet, fill: "rgba(24,92,196,.92)" },
    { value: pressureOf(p).toFixed(1), unit: "bar", label: "Pressure", icon: Gauge, fill: "rgba(20,84,70,.9)" },
  ];
  const right: Seg[] = [
    { value: `${p.wind}`, unit: "km/h", label: "Wind gusts", icon: Wind, fill: "rgba(36,44,46,.88)" },
    { value: `${alerts}`, label: alerts === 1 ? "Alert" : "Alerts", icon: TriangleAlert, fill: "rgba(9,30,36,.82)", tone: alerts ? "#ffc247" : "#fff", onClick: onAlerts },
    { value: `${applicationOf(p)}`, unit: "mm", label: "Application", icon: Leaf, fill: "rgba(24,92,196,.92)" },
  ];

  // speed dial: ticks over the top from -125 to +125 degrees, 0 to 60 percent
  const MAX = 60, A0 = -125, A1 = 125;
  const ang = (v: number) => -90 + A0 + ((A1 - A0) * v) / MAX;
  const ticks = Array.from({ length: 31 }, (_, i) => i * 2);
  const power = st === "fault" ? "#ff5a6a" : st === "on" ? "#2bff6a" : "#6f8790";
  const [px1, py1] = pt(CX, CY, 76, ang(p.speed));
  const [px2, py2] = pt(CX, CY, 96, ang(p.speed) - 3.2);
  const [px3, py3] = pt(CX, CY, 96, ang(p.speed) + 3.2);

  return (
    <div className={phone ? "cl-wrap phone" : "cl-wrap"}>
    <svg className="cl" viewBox={phone ? `${CX - 120} 0 240 ${H}` : `0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Pivot status and speed">
      {!phone && <Widget side="L" segs={left} />}
      {!phone && <Widget side="R" segs={right} />}

      {/* link down to the span and the field */}
      <line x1={CX} y1={CY + 98} x2={CX} y2={H} className="link" />

      <text x={CX} y={20} textAnchor="middle" className="cl-dial-t">SPEED <tspan className="cl-dial-v">{p.speed}%</tspan></text>
      {ticks.map((v) => {
        const major = v % 10 === 0;
        const [x0, y0] = pt(CX, CY, major ? 80 : 84, ang(v));
        const [x1, y1] = pt(CX, CY, 92, ang(v));
        return <line key={v} x1={x0} y1={y0} x2={x1} y2={y1} className={`tick ${v <= p.speed ? "on" : ""}`} strokeWidth={major ? 2.2 : 1.2} />;
      })}
      <path d={`M${px1} ${py1}L${px2} ${py2}L${px3} ${py3}Z`} className="needle" />

      {/* speed down / up */}
      {([["dn", 150, 210, ChevronLeft, -2], ["up", -30, 30, ChevronRight, 2]] as const).map(([k, a0, a1, Icon, d]) => {
        const [x, y] = pt(CX, CY, 56, (a0 + a1) / 2);
        return (
          <g key={k} className={`cl-btn ${canTune ? "" : "off"}`} role="button" tabIndex={0} aria-disabled={!canTune} aria-label={d < 0 ? "Slower" : "Faster"} onClick={() => canTune && onSpeed(p.speed + d)} onKeyDown={(e) => { if (canTune && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSpeed(p.speed + d); } }}>
            <title>{canTune ? (d < 0 ? "Slower" : "Faster") : "Supervisor role required"}</title>
            <path d={annular(CX, CY, 38, 76, a0, a1)} />
            <Icon x={x - 11} y={y - 11} width={22} height={22} stroke="#dff7ee" strokeWidth={2.2} />
          </g>
        );
      })}

      {/* power button */}
      <g className={`cl-power ${st}`} role="button" tabIndex={0} aria-pressed={p.running} aria-disabled={st === "fault"} aria-label={st === "fault" ? "Pivot faulted" : p.running ? "Stop pivot" : "Start pivot"} onClick={onToggle} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}>
        {st === "on" && <circle cx={CX} cy={CY} r={34} className="halo" />}
        <circle cx={CX} cy={CY} r={33} fill="rgba(4,20,18,.95)" stroke={power} strokeWidth={4} />
        <Power x={CX - 15} y={CY - 15} width={30} height={30} stroke={power} strokeWidth={2.4} />
      </g>
    </svg>
    {phone && <Tiles segs={[...left, ...right]} />}
    </div>
  );
}
