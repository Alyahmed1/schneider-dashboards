import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CountUp, Replay, Tip } from "./ui";

const PIE = ["var(--teal)", "var(--blue)", "var(--aqua)", "var(--warn)"];

/** semicircle gauge: empty until the tab has opened, then the arc grows, same as the other rings */
export function Semi({ value, max, unit, digits = 0, grow, label }: { value: number; max: number; unit?: string; digits?: number; grow: boolean; label?: string }) {
  const len = Math.PI * 36;
  const p = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  return (
    <div className="bd-semi">
      <svg viewBox="0 0 100 64" aria-hidden>
        <path className="bg" d="M14 52 A36 36 0 0 1 86 52" />
        <path className="fg" d="M14 52 A36 36 0 0 1 86 52" strokeDasharray={`${grow ? p * len : 0} ${len}`} />
      </svg>
      <div className="bd-semi-n">
        <b><CountUp value={value} decimals={digits} /></b>
        {unit && <span>{unit}</span>}
      </div>
      <div className="bd-scale"><i>0</i>{label && <em>{label}</em>}<i>{max}</i></div>
    </div>
  );
}

type RingTone = "teal" | "bad" | "blue" | "live";

/** three-quarter ring: actual, target, a live estimate, or an empty meter */
export function Ring({ value, max, grow, tone = "teal", mode = "value", digits = 0, unit, caption }: { value?: number; max: number; grow: boolean; tone?: RingTone; mode?: "value" | "empty" | "live"; digits?: number; unit?: string; caption: string }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const p = Math.max(0, Math.min(1, max === 0 ? 0 : (value ?? 0) / max));
  const shown = mode === "live" ? arc : mode === "empty" ? 0 : p * arc;
  return (
    <figure className={`bd-ring tone-${tone} mode-${mode}`}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle className="bg" cx="50" cy="50" r={r} strokeDasharray={`${arc} ${circ}`} transform="rotate(135 50 50)" />
        {mode !== "empty" && <circle className="fg" cx="50" cy="50" r={r} strokeDasharray={`${grow ? shown : 0} ${circ}`} transform="rotate(135 50 50)" />}
      </svg>
      <figcaption>
        {mode === "empty" ? <b className="miss">No reading</b> : mode === "live" ? <b>Live</b> : <b><CountUp value={value ?? 0} decimals={digits} /></b>}
        {mode === "value" && unit && <small>{unit}</small>}
      </figcaption>
      <span>{caption}</span>
    </figure>
  );
}

export function Donut({ value, label, grow }: { value: number; label: string; grow: boolean }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, value / 100));
  return (
    <div className="bd-donut">
      <svg viewBox="0 0 42 42" aria-hidden>
        <circle className="bg" cx="21" cy="21" r={r} />
        <circle className="fg" cx="21" cy="21" r={r} strokeDasharray={`${grow ? p * c : 0} ${c}`} transform="rotate(-90 21 21)" />
      </svg>
      <b><CountUp value={value} decimals={0} />%</b>
      <span>{label}</span>
    </div>
  );
}

/** same pie entrance as Home (the svg uses the hm-pie animation) */
export function Pie({ items }: { items: { name: string; value: number }[] }) {
  const total = items.reduce((s, x) => s + x.value, 0) || 1;
  let a0 = -Math.PI / 2;
  return (
    <div className="hm-pie">
      <svg viewBox="0 0 100 100" aria-hidden>
        {items.map((x, i) => {
          const a1 = a0 + (x.value / total) * Math.PI * 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const d = `M50 50 L${(50 + 46 * Math.cos(a0)).toFixed(2)} ${(50 + 46 * Math.sin(a0)).toFixed(2)} A46 46 0 ${large} 1 ${(50 + 46 * Math.cos(a1)).toFixed(2)} ${(50 + 46 * Math.sin(a1)).toFixed(2)}Z`;
          a0 = a1;
          return <path key={x.name} d={d} fill={PIE[i % PIE.length]} />;
        })}
      </svg>
      <ul>
        {items.map((x, i) => <li key={x.name}><i style={{ background: PIE[i % PIE.length] }} /><span>{x.name}</span><b>{x.value}</b></li>)}
      </ul>
    </div>
  );
}

export function HBars({ rows, max, grow }: { rows: { name: string; value: number; digits?: number }[]; max: number; grow: boolean }) {
  return (
    <div className="bd-hbars">
      {rows.map((r, i) => (
        <div key={r.name} className="bd-hbar" style={{ ["--n" as string]: i }}>
          <span>{r.name}</span>
          <div><i style={{ width: `${grow ? Math.max(1, (r.value / max) * 100) : 0}%` }} /></div>
          <b>{r.value.toLocaleString("en-US", { maximumFractionDigits: r.digits ?? 0, minimumFractionDigits: r.digits ?? 0 })}</b>
        </div>
      ))}
    </div>
  );
}

export function Trend({ data, lines, unit }: { data: Record<string, string | number>[]; lines: { key: string; name: string; color: string; dash?: string }[]; unit: string }) {
  return (
    <Replay className="bd-chart">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -6, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="t" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} width={36} />
          <Tooltip content={<Tip unit={unit} />} cursor={{ stroke: "var(--teal)", strokeOpacity: 0.3 }} />
          {lines.map((l) => (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeDasharray={l.dash} strokeWidth={1.6} dot={false} isAnimationActive animationDuration={1100} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Replay>
  );
}
