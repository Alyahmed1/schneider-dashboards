import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Coins, Droplets, ShieldCheck, Wrench, Zap, type LucideIcon } from "lucide-react";
import type { Kpi } from "./data";
import { CountUp, Replay, rise } from "./ui";
import type { Go, TabId } from "./App";

interface Cfg { icon: LucideIcon; accent: string; to: TabId; goal: string; fill: (k: Kpi) => number; ok: (k: Kpi) => boolean; text: (k: Kpi) => string }
const clamp = (v: number) => Math.max(4, Math.min(100, v));

/** icon, colour, goal and where a click leads, for each of the five Overview numbers */
const CFG: Record<string, Cfg> = {
  water: {
    icon: Droplets, accent: "#0e8f8a", to: "production", goal: "daily target",
    fill: (k) => clamp(100 + k.delta), ok: (k) => k.delta >= 0,
    text: (k) => (k.delta >= 0 ? "On target" : `${Math.abs(k.delta).toFixed(1)}% below target`),
  },
  energy: {
    icon: Zap, accent: "#e8a317", to: "electrical", goal: "budget 3.30",
    fill: (k) => clamp((3.3 / k.value) * 100), ok: (k) => k.value <= 3.3,
    text: (k) => (k.value <= 3.3 ? `${(3.3 - k.value).toFixed(2)} under budget` : `${(k.value - 3.3).toFixed(2)} over budget`),
  },
  cost: {
    icon: Coins, accent: "#7a5af0", to: "insights", goal: "budget 25.0",
    fill: (k) => clamp((25 / k.value) * 100), ok: (k) => k.value <= 25,
    text: (k) => (k.value <= 25 ? `${(25 - k.value).toFixed(1)} LE under budget` : `${(k.value - 25).toFixed(1)} LE over budget`),
  },
  avail: {
    icon: ShieldCheck, accent: "#1fa971", to: "insights", goal: "goal 98%",
    fill: (k) => clamp((k.value / 98) * 100), ok: (k) => k.value >= 98,
    text: (k) => (k.value >= 98 ? "On target" : `${(98 - k.value).toFixed(1)} pts below target`),
  },
  wo: {
    icon: Wrench, accent: "#1f6fd1", to: "maintenance", goal: "limit 12",
    fill: (k) => clamp((12 / Math.max(1, k.value)) * 100), ok: (k) => k.value <= 12,
    text: (k) => (k.value <= 12 ? "Within the limit" : `${Math.round(k.value - 12)} over the limit`),
  },
};

/** one Overview number: icon, big value, trend, a bar against its goal, and a click-through to the related tab */
export default function KpiTile({ k, i, go, hero }: { k: Kpi; i: number; go: Go; hero?: boolean }) {
  const c = CFG[k.id];
  const good = k.goodWhenDown ? k.delta <= 0 : k.delta >= 0;
  const Arrow = k.delta >= 0 ? ArrowUpRight : ArrowDownRight;
  const Icon = c.icon;
  const ok = c.ok(k);
  const stroke = hero ? "#ffffff" : c.accent;
  return (
    <motion.button className={`kt ${hero ? "kt-hero" : ""}`} style={{ ["--ac" as string]: c.accent }} onClick={() => go(c.to)} aria-label={`${k.label}: open ${c.to}`} {...rise(i)}>
      <span className="kt-line" aria-hidden />
      <div className="kt-head">
        <span className="kt-ico"><Icon size={22} strokeWidth={2} /></span>
        <div className="kt-lab"><b>{k.label}</b><small>{k.note}</small></div>
        <span className={`delta ${good ? "up" : "down"}`}><Arrow size={13} /><CountUp value={Math.abs(k.delta)} decimals={1} />%</span>
      </div>
      <div className="kt-val"><b><CountUp value={k.value} decimals={k.decimals} />{k.suffix}</b><span>{k.unit}</span></div>
      <div className="kt-goal">
        <div className="kt-bar"><motion.i className={ok ? "" : "off"} initial={{ width: 0 }} whileInView={{ width: `${c.fill(k)}%` }} viewport={{ once: false }} transition={{ duration: 1, delay: 0.15 + i * 0.05, ease: [0.22, 1, 0.36, 1] }} /></div>
        <div className="kt-status">
          {ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          <b>{c.text(k)}</b>
          <em>{c.goal}</em>
        </div>
      </div>
      <Replay className="kt-spark">
        <ResponsiveContainer>
          <AreaChart data={k.spark.map((v, n) => ({ n, v }))} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={`kt-${k.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} fill={`url(#kt-${k.id})`} animationDuration={1100} />
          </AreaChart>
        </ResponsiveContainer>
      </Replay>
      <ArrowUpRight className="kt-go" size={16} aria-hidden />
    </motion.button>
  );
}
