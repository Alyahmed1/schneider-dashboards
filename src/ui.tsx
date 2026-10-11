import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ───────── helpers ───────── */

export type Tone = "ok" | "watch" | "alert" | "info" | "violet";
export type Accent = "green" | "blue" | "purple" | "red" | "cyan" | "amber";

export const palette = {
  blue: "#2f9bff",
  cyan: "#27d7ff",
  green: "#2fe08a",
  purple: "#9b5cff",
  red: "#ff4d6a",
  amber: "#ffb52e",
};

export function live(value: number, tick: number, salt: number, amp = 0.025) {
  return value * (1 + Math.sin(tick * 1.3 + salt * 1.7) * amp + Math.cos(tick * 0.7 + salt) * amp * 0.5);
}

export function fmt(value: number, decimals = 0) {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function clock(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

export type Range = "24h" | "7d" | "30d";

export function rangeLabels(range: Range, now: Date): string[] {
  if (range === "24h") return ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"];
  const days = range === "7d" ? 7 : 6;
  const step = range === "7d" ? 1 : 5;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (days - 1 - i) * step);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  });
}

/** Deterministic wave + live jitter, so charts move on every tick. */
export function wave(i: number, n: number, base: number, amp: number, salt: number, tick: number, trend = 0) {
  const x = i / Math.max(1, n - 1);
  const v = base * (1 + Math.sin(x * 4.2 + salt) * amp + Math.cos(x * 9 + salt * 2) * amp * 0.4 + trend * x);
  return v * (1 + Math.sin(tick * 1.1 + i * 2 + salt) * 0.012);
}

export function useTick(ms = 3500) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return tick;
}

/* ───────── icons ───────── */

const circle = (cx: number, cy: number, r: number) => `M${cx} ${cy}m-${r} 0a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 -${r * 2} 0`;

const icons: Record<string, string[]> = {
  home: ["M3 11l9-8 9 8", "M5 10v10h14V10", "M10 20v-6h4v6"],
  camera: ["M4 7h3l2-2h6l2 2h3v12H4z", circle(12, 13, 3.5)],
  shield: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"],
  shieldcheck: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", "M8.5 12l2.5 2.5 4.5-5"],
  signal: [circle(12, 11, 1.3), "M12 12.5V21", "M8.3 7.3a5.2 5.2 0 0 0 0 7.4", "M15.7 7.3a5.2 5.2 0 0 1 0 7.4", "M5.4 4.4a9.3 9.3 0 0 0 0 13.2", "M18.6 4.4a9.3 9.3 0 0 1 0 13.2"],
  crane: ["M3 21h18", "M6 21V7", "M3 7h17", "M6 3l13 4", "M16 7v8", "M14 15h4v3h-4z"],
  monitor: ["M3 4h18v12H3z", "M8 20h8", "M12 16v4", "M6 12l3-3 3 2 4-4"],
  truck: ["M2 6h12v10H2z", "M14 9h4l3 3v4h-7z", circle(6, 18, 1.8), circle(17, 18, 1.8)],
  warehouse: ["M3 10l9-6 9 6v10H3z", "M8 20v-7h8v7", "M8 16h8"],
  gear: [circle(12, 12, 3), "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"],
  bolt: ["M13 2L4 14h7l-1 8 9-12h-7z"],
  drop: ["M12 3s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10z"],
  chip: ["M7 7h10v10H7z", "M10 10h4v4h-4z", "M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"],
  leaf: ["M5 19c0-9 5-14 15-14 0 10-5 15-14 15", "M5 19l8-8"],
  bell: ["M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z", "M10 21h4"],
  clock: [circle(12, 12, 9), "M12 7v5l3 2"],
  device: ["M7 3h10v18H7z", "M11 18h2"],
  gauge: ["M4 17a8 8 0 1 1 16 0", "M12 17l4-5"],
  download: ["M12 4v12", "M7 11l5 5 5-5", "M5 20h14"],
  upload: ["M12 20V8", "M7 13l5-5 5 5", "M5 4h14"],
  check: ["M5 12l5 5 9-10"],
  swap: ["M4 8h14l-3-3", "M20 16H6l3 3"],
  warn: ["M12 3l10 18H2z", "M12 10v5", "M12 18v.5"],
  info: [circle(12, 12, 9), "M12 11v6", "M12 7.5v.5"],
  wrench: ["M15 4a4.5 4.5 0 0 0-4 6L4 17l3 3 7-7a4.5 4.5 0 0 0 6-4l-3 3-3-1-1-3z"],
  ban: [circle(12, 12, 9), "M6 6l12 12"],
  car: ["M3 15h18v4H3z", "M5 15l2-6h10l2 6", circle(7, 19, 1.2), circle(17, 19, 1.2)],
  gate: ["M3 21V8M21 21V8M3 8h18M7 8v13M12 8v13M17 8v13"],
  activity: ["M3 12h4l3-8 4 16 3-8h4"],
  server: ["M4 4h16v6H4z", "M4 14h16v6H4z", "M8 7h.5M8 17h.5"],
  thermo: ["M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z"],
  bars: ["M5 20V10M12 20V4M19 20v-7"],
  doc: ["M6 3h9l4 4v14H6z", "M9 12h7M9 16h7"],
  user: [circle(12, 8, 4), "M4 21a8 8 0 0 1 16 0"],
  box: ["M3 7l9-4 9 4v10l-9 4-9-4z", "M3 7l9 4 9-4", "M12 11v10"],
  sun: [circle(12, 12, 4), "M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"],
  cloud: ["M7 18a4 4 0 1 1 1-7.9A5 5 0 0 1 18 11a3.5 3.5 0 0 1 0 7z"],
  ship: ["M3 17l2 4h14l2-4z", "M6 17V9h12v8", "M9 9V5h6v4"],
  pin: ["M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z", circle(12, 9, 2.5)],
  down: ["M6 9l6 6 6-6"],
  arrowright: ["M5 12h14", "M13 6l6 6-6 6"],
  up: ["M12 19V5", "M6 11l6-6 6 6"],
  dn: ["M12 5v14", "M6 13l6 6 6-6"],
  calendar: ["M4 6h16v14H4z", "M4 10h16", "M8 3v4M16 3v4"],
  tank: ["M5 6c0-1.5 3-3 7-3s7 1.5 7 3v12c0 1.5-3 3-7 3s-7-1.5-7-3z", "M5 6c0 1.5 3 3 7 3s7-1.5 7-3"],
  list: ["M8 6h12M8 12h12M8 18h12", "M4 6h.5M4 12h.5M4 18h.5"],
  wifi: ["M2 9a15 15 0 0 1 20 0", "M5 12.5a10.5 10.5 0 0 1 14 0", "M8.5 16a5.5 5.5 0 0 1 7 0", circle(12, 19, 1)],
  scan: ["M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4", "M4 12h16"],
  cog: [circle(12, 12, 3), "M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"],
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths = icons[name] ?? icons.info;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/* ───────── layout atoms ───────── */

export function Panel({
  title,
  icon,
  right,
  children,
  className = "",
}: {
  title: string;
  icon?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-head">
        <h2>
          {icon ? <Icon name={icon} size={17} /> : null}
          {title}
        </h2>
        <div className="panel-right">{right}</div>
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function LiveBadge() {
  return (
    <span className="live-badge">
      <i /> Live
    </span>
  );
}

export function ViewAll({ label = "View All", onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button type="button" className="view-all" onClick={onClick}>
      {label}
    </button>
  );
}

export function RangeSelect({ value, onChange }: { value: Range; onChange: (v: Range) => void }) {
  return (
    <label className="select">
      <select value={value} onChange={(e) => onChange(e.target.value as Range)}>
        <option value="24h">Last 24 hours</option>
        <option value="7d">Last 7 Days</option>
        <option value="30d">Last 30 Days</option>
      </select>
      <Icon name="down" size={14} />
    </label>
  );
}

export function PageTitle({ icon, title, subtitle, status = "All Systems Operational" }: { icon: string; title: string; subtitle: string; status?: string }) {
  return (
    <div className="page-title">
      <i className="pt-icon">
        <Icon name={icon} size={30} />
      </i>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <span className="pt-status">
        <i /> {status}
      </span>
    </div>
  );
}

/* ───────── KPI ───────── */

export type KpiDef = {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  delta: number;
  lowerIsBetter?: boolean;
  icon: string;
  accent: Accent;
  note?: string;
};

function Spark({ seed, good }: { seed: number; good: boolean }) {
  const pts = Array.from({ length: 10 }, (_, i) => `${i * 7},${20 - Math.sin(seed * 0.7 + i * 0.9) * 5 - i * 0.9}`).join(" ");
  return (
    <svg className="spark" viewBox="0 0 63 26" aria-hidden>
      <polyline points={pts} fill="none" stroke={good ? palette.green : palette.red} strokeWidth="1.8" />
    </svg>
  );
}

export function KpiRow({ items, tick, spark = false }: { items: KpiDef[]; tick: number; spark?: boolean }) {
  return (
    <div className="kpis">
      {items.map((k, i) => {
        const dec = k.decimals ?? 0;
        let v = live(k.value, tick, i + 1, dec > 0 ? 0.004 : 0.012);
        if (k.suffix?.includes("%")) v = Math.min(100, v);
        const good = k.delta === 0 ? true : k.lowerIsBetter ? k.delta < 0 : k.delta > 0;
        const dJ = k.delta + Math.sin(tick + i) * 0.04;
        return (
          <article className={`kpi a-${k.accent}`} key={k.label}>
            <i className="kpi-ico">
              <Icon name={k.icon} size={spark ? 22 : 30} />
            </i>
            <div className="kpi-main">
              <span className="kpi-label">{k.label}</span>
              <strong>
                {k.prefix}
                {fmt(v, dec)}
                {k.suffix ? <small>{k.suffix}</small> : null}
                {k.note ? <em className="kpi-note">{k.note}</em> : null}
              </strong>
              <span className={`kpi-delta ${good ? "up" : "down"}`}>
                <Icon name={k.delta >= 0 ? "up" : "dn"} size={12} />
                {k.delta > 0 ? "+" : ""}
                {fmt(dJ, 1)}% <b>vs. yesterday</b>
              </span>
            </div>
            {spark ? <Spark seed={k.value + i} good={good} /> : null}
          </article>
        );
      })}
    </div>
  );
}

/* ───────── events ───────── */

export type EventRow = {
  title: string;
  detail: string;
  detail2?: string;
  time: string;
  tone: Tone;
  icon?: string;
  badge?: string;
};

const toneIcon: Record<Tone, string> = { ok: "check", watch: "warn", alert: "warn", info: "info", violet: "cog" };

export function EventList({ rows, max = 6, compact = false, inline = false }: { rows: EventRow[]; max?: number; compact?: boolean; inline?: boolean }) {
  return (
    <ul className={`ev-list ${compact ? "compact" : ""} ${inline ? "inline" : ""}`}>
      {rows.slice(0, max).map((r, i) => (
        <li key={`${r.title}-${r.time}-${i}`} className={i === 0 ? "fresh" : ""}>
          <i className={`ev-ico t-${r.tone}`}>
            <Icon name={r.icon ?? toneIcon[r.tone]} size={compact ? 14 : 20} />
          </i>
          <div className="ev-text">
            <strong>{r.title}</strong>
            <span>{r.detail}</span>
            {r.detail2 ? <span>{r.detail2}</span> : null}
          </div>
          <div className="ev-side">
            <time>{r.time}</time>
            {r.badge ? <b className={`badge t-${r.tone}`}>{r.badge}</b> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Adds a fresh event from a pool every few seconds. */
export function useFeed(initial: EventRow[], pool: Omit<EventRow, "time">[], every = 6500) {
  const [rows, setRows] = useState(initial);
  const n = useRef(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = pool[n.current++ % pool.length];
      setRows((cur) => [{ ...next, time: clock(new Date()) }, ...cur].slice(0, 12));
    }, every);
    return () => window.clearInterval(id);
  }, [pool, every]);
  return rows;
}

/* ───────── charts ───────── */

const axis = { fill: "#8fb3d9", fontSize: 11 };
const tip = {
  contentStyle: { background: "#08183a", border: "1px solid rgba(80,160,255,.35)", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#9fc6ff" },
};

export function DualArea({
  data,
  aName,
  bName,
  aColor = palette.cyan,
  bColor = palette.purple,
  domain,
  ticks,
  type = "area",
  rightAxis = false,
  rightDomain,
  rightTicks,
  pct = false,
}: {
  data: { x: string; a: number; b?: number }[];
  aName: string;
  bName?: string;
  aColor?: string;
  bColor?: string;
  domain?: [number, number];
  ticks?: number[];
  type?: "area" | "line";
  rightAxis?: boolean;
  rightDomain?: [number, number];
  rightTicks?: number[];
  pct?: boolean;
}) {
  const id = `g${aColor.replace("#", "")}${bColor.replace("#", "")}`;
  return (
    <div className="chart">
      <div className="legend">
        <span>
          <i style={{ background: aColor }} /> {aName}
        </span>
        {bName ? (
          <span>
            <i style={{ background: bColor }} /> {bName}
          </span>
        ) : null}
      </div>
      <div className="chart-plot">
        <ResponsiveContainer width="100%" height="100%">
          {type === "area" ? (
            <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={aColor} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={aColor} stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={bColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={bColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(120,170,255,.14)" />
              <XAxis dataKey="x" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} domain={domain} ticks={ticks} width={44} />
              <Tooltip {...tip} />
              <Area type="monotone" dataKey="a" name={aName} stroke={aColor} strokeWidth={2.2} fill={`url(#${id}a)`} animationDuration={900} dot={{ r: 3, fill: aColor, strokeWidth: 0 }} />
              {bName ? (
                <Area type="monotone" dataKey="b" name={bName} stroke={bColor} strokeWidth={2.2} fill={`url(#${id}b)`} animationDuration={900} dot={{ r: 3, fill: bColor, strokeWidth: 0 }} />
              ) : null}
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 6, right: rightAxis ? 0 : 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(120,170,255,.14)" />
              <XAxis dataKey="x" tick={axis} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={axis} axisLine={false} tickLine={false} domain={domain} ticks={ticks} width={44} tickFormatter={pct ? (v) => `${v}%` : undefined} />
              {rightAxis ? <YAxis yAxisId="r" orientation="right" tick={axis} axisLine={false} tickLine={false} width={34} domain={rightDomain} ticks={rightTicks} /> : null}
              <Tooltip {...tip} />
              <Line yAxisId="l" type="monotone" dataKey="a" name={aName} stroke={aColor} strokeWidth={2.2} dot={{ r: 3, fill: aColor, strokeWidth: 0 }} animationDuration={900} />
              {bName ? (
                <Line yAxisId={rightAxis ? "r" : "l"} type="monotone" dataKey="b" name={bName} stroke={bColor} strokeWidth={2.2} dot={{ r: 3, fill: bColor, strokeWidth: 0 }} animationDuration={900} />
              ) : null}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Bars({ data, color = palette.blue, color2, names }: { data: { x: string; a: number; b?: number }[]; color?: string; color2?: string; names?: [string, string?] }) {
  return (
    <div className="chart">
      {names ? (
        <div className="legend">
          <span>
            <i style={{ background: color }} /> {names[0]}
          </span>
          {names[1] ? (
            <span>
              <i style={{ background: color2 }} /> {names[1]}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="chart-plot">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(120,170,255,.12)" vertical={false} />
            <XAxis dataKey="x" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={40} />
            <Tooltip {...tip} cursor={{ fill: "rgba(80,160,255,.08)" }} />
            <Bar dataKey="a" fill={color} radius={[4, 4, 0, 0]} animationDuration={900} />
            {color2 ? <Bar dataKey="b" fill={color2} radius={[4, 4, 0, 0]} animationDuration={900} /> : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Donut({
  slices,
  center,
  sub,
  size = 150,
}: {
  slices: { name: string; value: number; color: string }[];
  center: string;
  sub?: string;
  size?: number;
}) {
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={slices} dataKey="value" innerRadius="70%" outerRadius="95%" stroke="none" paddingAngle={2} startAngle={90} endAngle={-270} animationDuration={900}>
            {slices.map((s) => (
              <Cell key={s.name} fill={s.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-mid">
        <strong>{center}</strong>
        {sub ? <span>{sub}</span> : null}
      </div>
    </div>
  );
}

export function Legend({ rows }: { rows: { name: string; value: string; color: string }[] }) {
  return (
    <ul className="leg-list">
      {rows.map((r) => (
        <li key={r.name}>
          <i style={{ background: r.color }} />
          <span>{r.name}</span>
          <b>{r.value}</b>
        </li>
      ))}
    </ul>
  );
}

export function MiniStats({ items }: { items: { icon: string; label: string; value: string; delta?: string; down?: boolean; accent?: Accent }[] }) {
  return (
    <div className="mini-stats">
      {items.map((m) => (
        <div key={m.label} className={`mini a-${m.accent ?? "blue"}`}>
          <i>
            <Icon name={m.icon} size={20} />
          </i>
          <span>{m.label}</span>
          <strong>{m.value}</strong>
          {m.delta ? (
            <em className={m.down ? "down" : "up"}>
              <Icon name={m.down ? "dn" : "up"} size={11} /> {m.delta}
            </em>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Size of the biggest box with `ratio` that fits inside the element, measured so overlays can sit on the photo in % coordinates. */
function useFit(ratio: number, cover: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (!cw || !ch) return;
      const w = cover ? Math.max(cw, ch * ratio) : Math.min(cw, ch * ratio);
      setBox({ w, h: w / ratio });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio, cover]);
  return { ref, box };
}

/**
 * A photo shown whole (never cropped) and blended into the panel: a blurred copy of the same image fills the leftover space,
 * and `children` are positioned over the photo itself in % coordinates. `overlay` sits over the whole stage.
 */
export function Photo({
  src,
  ratio,
  zoom = 1,
  origin = "50% 50%",
  fade = false,
  mode = "cover",
  className = "",
  children,
  overlay,
}: {
  src: string;
  ratio: number;
  zoom?: number;
  origin?: string;
  fade?: boolean;
  mode?: "cover" | "contain" | "natural";
  className?: string;
  children?: ReactNode;
  overlay?: ReactNode;
}) {
  const { ref, box } = useFit(ratio, mode === "cover");
  if (mode === "natural") {
    return (
      <div className={`photo-stage natural ${className}`} style={{ aspectRatio: String(ratio) }}>
        <div className="photo-fit" style={{ width: "100%", height: "100%", transform: `scale(${zoom})`, transformOrigin: origin }}>
          <img src={src} alt="" draggable={false} />
          {children}
        </div>
        {overlay}
      </div>
    );
  }
  return (
    <div className={`photo-stage ${className}`} ref={ref}>
      {mode === "contain" ? <img className="photo-bg" src={src} alt="" aria-hidden draggable={false} /> : null}
      <div className={`photo-fit ${fade ? "fade" : ""}`} style={{ width: box.w, height: box.h, transform: `scale(${zoom})`, transformOrigin: origin }}>
        <img src={src} alt="" draggable={false} />
        {children}
      </div>
      {overlay}
    </div>
  );
}

/** Transparent clickable area sitting on a baked-in icon of a photo. */
export function Hot({ x, y, size = 46, label, tag, active = false, onClick }: { x: number; y: number; size?: number; label: string; tag?: string; active?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`hs ${active ? "on" : ""}`} style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }} onClick={onClick} title={label} aria-label={label}>
      <span />
      {tag ? <em className="hs-tag">→ {tag}</em> : null}
    </button>
  );
}

export function Bar2({ value, color = palette.blue }: { value: number; color?: string }) {
  return (
    <b className="bar2">
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </b>
  );
}
