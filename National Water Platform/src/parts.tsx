import { motion } from "framer-motion";
import { Area, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MONTHS, STATUS_LABEL, type Status } from "./data";

export const ease = [0.22, 1, 0.36, 1] as const;
export const rise = (i: number) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, delay: 0.05 + i * 0.06, ease } });

/** a small ring with the score in the middle */
export function Ring({ value, status, size = 46 }: { value: number; status: Status; size?: number }) {
  const C = 2 * Math.PI * 17;
  return (
    <svg className={`x-ring ${status}`} width={size} height={size} viewBox="0 0 46 46" aria-label={`Score ${value} out of 100`}>
      <circle cx="23" cy="23" r="17" className="bg" />
      <circle cx="23" cy="23" r="17" className="fg" strokeDasharray={`${(C * value) / 100} ${C}`} transform="rotate(-90 23 23)" />
      <text x="23" y="27.500" textAnchor="middle">{value}</text>
    </svg>
  );
}

export function StatusChip({ status, text }: { status: Status; text?: string }) {
  return <span className={`x-chip ${status}`}>{text ?? STATUS_LABEL[status]}</span>;
}

/** a glass panel with a title bar */
export function Panel({ icon: Icon, title, hint, children, i = 0, className = "" }: { icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; title: string; hint?: string; children: React.ReactNode; i?: number; className?: string }) {
  return (
    <motion.section className={`x-panel ${className}`} {...rise(6 + i)}>
      <header><i className="x-ico sm"><Icon size={15} strokeWidth={2} /></i><h3>{title}</h3>{hint && <span>{hint}</span>}</header>
      {children}
    </motion.section>
  );
}

const tip = { background: "#14113a", border: "1px solid #5b4bd6", borderRadius: 8, fontSize: 12, padding: "4px 8px" };
const axis = { fill: "#b9b5ea", fontSize: 11 };

/** 12 months of one line (filled), an optional second line to compare with, and an optional dashed reference line */
export function TrendChart({ series, compare, names, unit, decimals = 0, color = "#8b5cf6", color2 = "#22d3ee", refLine, compact = false, labels }: {
  series: number[]; compare?: number[]; names?: [string, string]; unit: string; decimals?: number; color?: string; color2?: string; refLine?: { label: string; value: number }; compact?: boolean; labels?: string[];
}) {
  const data = series.map((v, i) => ({ m: (labels ?? MONTHS)[i], v, c: compare?.[i] }));
  const all = [...series, ...(compare ?? []), ...(refLine ? [refLine.value] : [])];
  const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.18 || 1;
  const id = `tc-${color.replace("#", "")}`;
  const fmt = (n: number) => `${n.toFixed(decimals)}${unit === "%" ? "%" : ""}`;
  return (
    <div className="trend">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 420, height: 300 }}>
        <ComposedChart data={data} margin={{ top: 12, right: 14, bottom: 0, left: 0 }}>
          <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".5" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
          <CartesianGrid stroke="rgba(139,120,255,.14)" vertical={false} />
          <XAxis dataKey="m" tick={axis} tickLine={false} axisLine={false} interval={compact ? 2 : 0} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={42} domain={[lo - pad, hi + pad]} tickFormatter={(n) => fmt(Number(n))} />
          <Tooltip contentStyle={tip} labelStyle={{ color: "#c9c5f5" }} itemStyle={{ color: "#fff" }} cursor={{ stroke: color, strokeOpacity: 0.4 }}
            formatter={(v, k) => [`${fmt(Number(v))}${unit === "%" ? "" : ` ${unit}`}`, k === "c" ? (names?.[1] ?? "Compare") : (names?.[0] ?? "Value")]} />
          {refLine && <ReferenceLine y={refLine.value} stroke="#fbbf24" strokeDasharray="5 5" label={{ value: refLine.label, fill: "#fcd34d", fontSize: 11, position: "insideTopRight" }} />}
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2.4} fill={`url(#${id})`} animationDuration={900} />
          {compare && <Line type="monotone" dataKey="c" stroke={color2} strokeWidth={2.2} strokeDasharray="6 4" dot={false} animationDuration={900} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** horizontal bars with a label and a value */
export function BarList({ items, max, color = "linear-gradient(90deg,#6d4aff,#22d3ee)" }: { items: { name: string; value: number; label: string }[]; max: number; color?: string }) {
  return (
    <ul className="barlist">
      {items.map((it) => (
        <li key={it.name}>
          <span>{it.name}</span>
          <u><s style={{ width: `${(it.value / max) * 100}%`, background: color }} /></u>
          <b>{it.label}</b>
        </li>
      ))}
    </ul>
  );
}

/** several lines on one chart, one per ministry */
export function CompareChart({ lines, unit, decimals = 0 }: { lines: { id: string; name: string; color: string; data: number[] }[]; unit: string; decimals?: number }) {
  const data = MONTHS.map((m, i) => { const o: Record<string, number | string> = { m }; lines.forEach((l) => { o[l.id] = l.data[i]; }); return o; });
  const all = lines.flatMap((l) => l.data);
  const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.15 || 1;
  return (
    <div className="trend">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 360 }}>
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(139,120,255,.14)" vertical={false} />
          <XAxis dataKey="m" tick={axis} tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={44} domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]} tickFormatter={(n) => Number(n).toFixed(decimals)} />
          <Tooltip contentStyle={tip} labelStyle={{ color: "#c9c5f5" }} itemStyle={{ color: "#fff" }} formatter={(v, k) => [`${Number(v).toFixed(decimals)} ${unit}`, String(k)]} />
          {lines.map((l) => <Line key={l.id} type="monotone" dataKey={l.id} name={l.name} stroke={l.color} strokeWidth={2.6} dot={false} activeDot={{ r: 5 }} animationDuration={900} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
