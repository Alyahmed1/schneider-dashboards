import { CountUp } from "./ui";
import { niceMax, tick } from "./charts";

/** gradients shared by the KPI boards (rendered once per board) */
export function KpDefs() {
  return (
    <svg className="kp-defs" aria-hidden focusable="false">
      <defs>
        <linearGradient id="kp-arc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#0a8f95" /><stop offset=".6" stopColor="#2bd4d0" /><stop offset="1" stopColor="#9ff6ee" /></linearGradient>
        <linearGradient id="kp-arc-warm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ff6a1f" /><stop offset="1" stopColor="#ffd06a" /></linearGradient>
        <linearGradient id="kp-arc-hot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ff3b4e" /><stop offset="1" stopColor="#ff9a2e" /></linearGradient>
        <linearGradient id="kp-arc-cool" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#1f6fd1" /><stop offset="1" stopColor="#6fc4ff" /></linearGradient>
        <linearGradient id="kp-bar" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#0a8f95" /><stop offset="1" stopColor="#7ff7ee" /></linearGradient>
        <pattern id="kp-hatch" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3.2" height="3.2" fill="rgba(58,160,255,.12)" /><rect width="1.5" height="3.2" fill="rgba(90,175,255,.85)" /></pattern>
        <linearGradient id="kp-pie-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7ff7ee" /><stop offset="1" stopColor="#0a8f95" /></linearGradient>
        <linearGradient id="kp-pie-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e6fbfd" /><stop offset="1" stopColor="#9fd9e3" /></linearGradient>
        <linearGradient id="kp-pie-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6fc4ff" /><stop offset="1" stopColor="#1f6fd1" /></linearGradient>
        <linearGradient id="kp-pie-d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd06a" /><stop offset="1" stopColor="#ff6a1f" /></linearGradient>
      </defs>
    </svg>
  );
}

type Tone = "teal" | "warm" | "hot" | "cool";
const GRAD: Record<Tone, string> = { teal: "kp-arc", warm: "kp-arc-warm", hot: "kp-arc-hot", cool: "kp-arc-cool" };
const TICKS = Array.from({ length: 11 }, (_, i) => i);

/** half-circle gauge that scales to the space it is given: glowing arc, tick marks, a bead that rides the arc */
export function Gauge({ value, max, unit, digits = 0, grow, tone = "teal", note }: { value: number; max: number; unit?: string; digits?: number; grow: boolean; tone?: Tone; note?: string }) {
  const len = Math.PI * 36;
  const p = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const shown = grow ? p : 0;
  return (
    <div className="kp-gw">
      <div className={`kp-g tone-${tone}`}>
        <svg viewBox="0 0 100 64" aria-hidden>
          {TICKS.map((i) => {
            const a = Math.PI - (i / 10) * Math.PI;
            const c = Math.cos(a), s = Math.sin(a);
            return <line key={i} className="tk" x1={50 + 41 * c} y1={52 - 41 * s} x2={50 + (i % 5 === 0 ? 45.5 : 43.6) * c} y2={52 - (i % 5 === 0 ? 45.5 : 43.6) * s} />;
          })}
          <path className="tr" d="M14 52 A36 36 0 0 1 86 52" />
          <path className="fg" d="M14 52 A36 36 0 0 1 86 52" stroke={`url(#${GRAD[tone]})`} strokeDasharray={`${shown * len} ${len}`} />
          <g className="bead" style={{ transform: `rotate(${shown * 180}deg)` }}><circle cx="14" cy="52" r="3.4" /></g>
        </svg>
        <div className="kp-gn">
          <b><CountUp value={value} decimals={digits} /></b>
          {unit && <span>{unit}</span>}
          {note && <em>{note}</em>}
        </div>
        <i className="kp-g0">0</i><i className="kp-g1">{max}</i>
      </div>
    </div>
  );
}

/** full ring with the value inside and a small up arrow, scales to its space */
export function Ring({ value, label, grow, tone = "teal" }: { value: number; label: string; grow: boolean; tone?: Tone }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, value / 100));
  return (
    <figure className="kp-ring">
      <div className="kp-rw">
        <div className="kp-r">
          <svg viewBox="0 0 42 42" aria-hidden>
            <circle className="tr" cx="21" cy="21" r={r} />
            <circle className="fg" cx="21" cy="21" r={r} stroke={`url(#${GRAD[tone]})`} strokeDasharray={`${grow ? p * c : 0} ${c}`} transform="rotate(-90 21 21)" />
          </svg>
          <div className="kp-rn"><b><CountUp value={value} decimals={0} />%</b><i aria-hidden /></div>
        </div>
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

type DialMode = "value" | "live" | "empty";

/** 270-degree dial with a scale around it, like the engineering displays: actual in orange/red, target in blue */
export function Dial({ value = 0, max, unit, caption, mode = "value", tone = "warm", grow, digits = 0 }: { value?: number; max: number; unit?: string; caption: string; mode?: DialMode; tone?: Tone; grow: boolean; digits?: number }) {
  const r = 34;
  const arc = 2 * Math.PI * r * 0.75;
  const m = niceMax(max);
  const p = mode === "value" ? Math.max(0, Math.min(1, value / m)) : 1;
  const pt = (a: number, rr: number) => [50 + rr * Math.cos((a * Math.PI) / 180), 52 + rr * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = pt(135, r), [x1, y1] = pt(405, r);
  const hatched = mode !== "value";
  const fmt = (v: number) => (m < 10 ? (+v.toFixed(1)).toString() : tick(v));
  return (
    <figure className={`kp-dial tone-${tone} mode-${mode}`}>
      <div className="kp-dw">
        <div className="kp-d">
          <svg viewBox="0 0 100 100" aria-hidden>
            {Array.from({ length: 31 }, (_, i) => {
              const a = 135 + (270 * i) / 30;
              const [ax, ay] = pt(a, 40.5), [bx, by] = pt(a, i % 6 === 0 ? 44 : 42.3);
              return <line key={i} className="tk" x1={ax} y1={ay} x2={bx} y2={by} />;
            })}
            {Array.from({ length: 6 }, (_, i) => {
              const [lx, ly] = pt(135 + 54 * i, 49);
              return <text key={i} className="sc" x={lx} y={ly + 1.6} textAnchor="middle">{fmt((m * i) / 5)}</text>;
            })}
            <path className="tr" d={`M${x0} ${y0} A${r} ${r} 0 1 1 ${x1} ${y1}`} />
            <path className={`fg ${hatched ? "hatch" : ""}`} d={`M${x0} ${y0} A${r} ${r} 0 1 1 ${x1} ${y1}`} stroke={hatched ? "url(#kp-hatch)" : `url(#${GRAD[tone]})`} strokeDasharray={`${(grow ? p : 0) * arc} ${arc + 4}`} />
          </svg>
          <div className="kp-dn">
            {mode === "value" ? <><b><CountUp value={value} decimals={digits} /></b>{unit && <span>{unit}</span>}</> : <b className="soft">{mode === "live" ? "Live" : "No reading"}</b>}
          </div>
        </div>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

const PIE_FILL = ["url(#kp-pie-a)", "url(#kp-pie-b)", "url(#kp-pie-c)", "url(#kp-pie-d)"];

/** pie with a glow, spins in when the tab opens, legend underneath */
export function KpPie({ items, unit }: { items: { name: string; value: number }[]; unit?: string }) {
  const total = items.reduce((s, x) => s + x.value, 0) || 1;
  let a0 = -Math.PI / 2;
  return (
    <div className="kp-pie">
      <div className="kp-pw">
        <svg viewBox="0 0 100 100" aria-hidden>
          {items.map((x, i) => {
            const a1 = a0 + (x.value / total) * Math.PI * 2;
            const large = a1 - a0 > Math.PI ? 1 : 0;
            const d = `M50 50 L${(50 + 46 * Math.cos(a0)).toFixed(2)} ${(50 + 46 * Math.sin(a0)).toFixed(2)} A46 46 0 ${large} 1 ${(50 + 46 * Math.cos(a1)).toFixed(2)} ${(50 + 46 * Math.sin(a1)).toFixed(2)}Z`;
            a0 = a1;
            return <path key={x.name} d={d} fill={PIE_FILL[i % PIE_FILL.length]} stroke="rgba(4,16,26,.8)" strokeWidth="1" />;
          })}
        </svg>
      </div>
      <ul>
        {items.map((x, i) => (
          <li key={x.name}><i style={{ background: i === 1 ? "#cfeff5" : i === 2 ? "#3aa0ff" : i === 3 ? "#ff9a2e" : "#2bd4d0" }} /><span>{x.name}</span><b>{+x.value.toFixed(1)}{unit ? ` ${unit}` : ""}</b></li>
        ))}
      </ul>
    </div>
  );
}
