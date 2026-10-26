import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  Activity, ArrowDownRight, ArrowUpRight, Box, Check, Clock, Coins, Droplets, Factory, Flag, FlaskConical,
  Download, Gauge, Globe, List, Minus, Pause, Plug, Recycle, Search, Shield, Thermometer, TrendingUp, Truck, Wrench, Zap,
} from "lucide-react";
import type { Kpi, Tone } from "./data";

const ICONS: Record<string, typeof Zap> = {
  factory: Factory, zap: Zap, gauge: Gauge, bolt: Zap, plug: Plug, droplets: Droplets, activity: Activity, trending: TrendingUp,
  coins: Coins, recycle: Recycle, thermo: Thermometer, flask: FlaskConical, shield: Shield, check: Check, pause: Pause, flag: Flag,
  clock: Clock, wrench: Wrench, list: List, truck: Truck, box: Box, globe: Globe,
};

export const rise = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: i * 0.05, ease: [0.2, 0.8, 0.2, 1] as const },
});

export function Card({ title, sub, right, children, className = "", i = 0 }:
  { title?: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string; i?: number }) {
  return (
    <motion.section className={`card ${className}`} {...rise(i)}>
      {(title || right) && (
        <header className="card-head">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {sub && <p className="card-sub">{sub}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </motion.section>
  );
}

export function KpiCard({ k, i = 0 }: { k: Kpi; i?: number }) {
  const Icon = ICONS[k.icon] ?? Activity;
  const dir = Math.abs(k.delta) < 0.3 ? "flat" : k.delta > 0 ? "up" : "down";
  const goodDir = k.good ?? "up";
  const cls = dir === "flat" ? "flat" : dir === goodDir ? "up" : "down"; // green when movement is favourable
  const Arrow = dir === "flat" ? Minus : dir === "up" ? ArrowUpRight : ArrowDownRight;
  const id = `sp-${k.label.replace(/\W/g, "")}`;
  return (
    <motion.div className="card kpi" {...rise(i)}>
      <div className="kpi-top">
        <span>{k.label}</span>
        <span className="kpi-icon" style={{ color: k.color }}><Icon size={16} /></span>
      </div>
      <div className="kpi-val" key={k.value}>{k.value}<small>{k.unit}</small></div>
      <div className="kpi-foot">
        <div>
          <span className={`delta ${cls}`}><Arrow size={13} />{Math.abs(k.delta).toFixed(1)}%</span>
          <div style={{ color: "var(--dim)", fontSize: 11.5, marginTop: 2 }}>{k.note}</div>
        </div>
        <div className="spark">
          <ResponsiveContainer>
            <AreaChart data={k.spark.map((v, n) => ({ n, v }))} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={k.color} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={k.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area dataKey="v" type="monotone" stroke={k.color} strokeWidth={1.6} fill={`url(#${id})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

export const Chip = ({ tone, children }: { tone: Tone; children: ReactNode }) => <span className={`chip ${tone}`}>{children}</span>;

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o} className={o === value ? "on" : ""} onClick={() => onChange(o)} role="tab" aria-selected={o === value}>{o}</button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="search">
      <Search size={14} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

export function Bar({ pct, color }: { pct: number; color: string }) {
  return <div className="bar"><i style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} /></div>;
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return <div className="legend">{items.map((x) => <span key={x.name}><i style={{ background: x.color }} />{x.name}</span>)}</div>;
}

export const axis = { stroke: "#5d6a7c", fontSize: 11, tickLine: false, axisLine: false } as const;
export const grid = { stroke: "#222c3b", strokeDasharray: "3 4", vertical: false } as const;

export function Tip({ active, payload, label, unit = "" }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0a0d12", border: "1px solid #2e3a4d", borderRadius: 10, padding: "8px 12px", fontSize: 12, boxShadow: "0 12px 30px rgba(0,0,0,.5)" }}>
      {label && <div style={{ color: "#8896a9", marginBottom: 4 }}>{label}</div>}
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <i style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span style={{ color: "#8896a9", textTransform: "capitalize" }}>{p.name}</span>
          <b style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontWeight: 500, paddingLeft: 12 }}>{p.value.toLocaleString()}{unit}</b>
        </div>
      ))}
    </div>
  );
}

export type CsvSection = { title: string; rows: Record<string, string | number>[] };

export function downloadCsv(name: string, sections: CsvSection[]) {
  const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines: string[] = [];
  for (const sec of sections) {
    if (!sec.rows.length) continue;
    if (lines.length) lines.push("");
    lines.push(esc(sec.title));
    const cols = Object.keys(sec.rows[0]);
    lines.push(cols.map(esc).join(","));
    for (const r of sec.rows) lines.push(cols.map((c) => esc(r[c])).join(","));
  }
  const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export function ExportButton({ onClick, label = "Export CSV" }: { onClick: () => void; label?: string }) {
  return <button className="btn" onClick={onClick}><Download size={14} />{label}</button>;
}
