import { useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { ChevronRight, ChevronsDown, ChevronsLeft, ChevronsRight, ChevronsUp } from "lucide-react";
import { CYCLE_FLOWS, CYCLE_STAGES, CYCLE_SUMMARY, KPI_TREND, MINISTRIES, MINISTRY_BY_ID, type CycleStage, type Go } from "./data";
import { CountUp } from "./ui";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (i: number) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, delay: 0.08 + i * 0.07, ease } });

/** a picture for each stage; Sources (trend line) and Storage (glass tank) are drawn in code */
const PICTURE: Record<string, string> = {
  treatment: "/img/cw-treatment.jpg", distribution: "/img/cw-distribution.jpg", users: "/img/cw-users.jpg",
  collection: "/img/cw-collection.jpg", wwtp: "/img/cw-wwtp.jpg", reuse: "/img/cw-reuse.jpg",
};

/** arrows between stages: double chevrons that pulse in the direction of the water, with the amount (M m3/day) */
function Pipe({ dir, label, hot, col, row }: { dir: "right" | "left" | "down" | "up"; label: string; hot: boolean; col: number; row: number }) {
  const Icon = { right: ChevronsRight, left: ChevronsLeft, down: ChevronsDown, up: ChevronsUp }[dir];
  return (
    <div className={`c-pipe ${dir} ${hot ? "hot" : ""}`} style={{ gridColumn: col, gridRow: row }} aria-hidden>
      <Icon size={32} strokeWidth={2.6} /><span>{label}</span>
    </div>
  );
}

/** the glass tank in the Storage card, filled to the reservoir level */
function Tank({ pct }: { pct: number }) {
  const top = 12 + (1 - pct / 100) * 70;
  return (
    <svg className="c-tank" viewBox="0 0 96 100" aria-label={`Reservoir ${pct}% full`}>
      <defs>
        <linearGradient id="tk-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7be8ff" /><stop offset="1" stopColor="#1c6fe0" /></linearGradient>
        <clipPath id="tk-c"><rect x="14" y="12" width="68" height="76" rx="9" /></clipPath>
      </defs>
      <ellipse cx="48" cy="92" rx="40" ry="6" className="tk-shadow" />
      <g clipPath="url(#tk-c)">
        <rect x="14" y="12" width="68" height="76" fill="rgba(34,211,238,0.08)" />
        <g className="tk-wave"><path d={`M-30 ${top} q 17 -7 34 0 t 34 0 t 34 0 t 34 0 t 34 0 V 100 H -30 Z`} fill="url(#tk-w)" opacity="0.92" /></g>
      </g>
      <rect x="14" y="12" width="68" height="76" rx="9" className="tk-glass" />
      <ellipse cx="48" cy="12" rx="34" ry="5" className="tk-rim" />
      <text x="48" y="56" textAnchor="middle" className="tk-n">{pct}%</text>
    </svg>
  );
}

/** the 12-month supply trend in the Sources card */
function Spark() {
  const data = KPI_TREND.supply.series.map((v, i) => ({ i, v }));
  return (
    <div className="c-spark" aria-hidden>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 150, height: 56 }}>
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs><linearGradient id="sp-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity=".55" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" /></linearGradient></defs>
          <YAxis hide domain={["dataMin - 0.4", "dataMax + 0.2"]} />
          <Area type="monotone" dataKey="v" stroke="#67e8f9" strokeWidth={2.4} fill="url(#sp-g)" animationDuration={1000} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** the glowing water drop in the middle, with ripples */
function Drop() {
  return (
    <div className="c-drop" aria-hidden>
      <i /><i /><i />
      <svg viewBox="0 0 80 100">
        <defs>
          <linearGradient id="dp-g" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor="#c9f6ff" /><stop offset="0.45" stopColor="#38bdf8" /><stop offset="1" stopColor="#2563eb" /></linearGradient>
        </defs>
        <path d="M40 4 C 52 24 70 42 70 62 a30 30 0 0 1 -60 0 C 10 42 28 24 40 4 Z" fill="url(#dp-g)" />
        <path d="M24 62 a16 16 0 0 0 12 15" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="30" cy="40" rx="5" ry="10" fill="rgba(255,255,255,.35)" transform="rotate(25 30 40)" />
      </svg>
    </div>
  );
}

function Node({ s, col, row, i, hot, setHot, go }: { s: CycleStage; col: number; row: number; i: number; hot: number | null; setHot: (n: number | null) => void; go: Go }) {
  const Icon = s.icon;
  const lead = MINISTRY_BY_ID[s.owners[0]];
  const pic = PICTURE[s.id];
  return (
    <motion.div className={`c-node ${hot === s.n ? "hot" : ""}`} style={{ gridColumn: col, gridRow: row }} {...rise(i)}
      role="button" tabIndex={0} aria-label={`Stage ${s.n}, ${s.title}. Open ${lead.short}`}
      onClick={() => go("ministry", s.open)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go("ministry", s.open); } }}
      onMouseEnter={() => setHot(s.n)} onMouseLeave={() => setHot(null)} onFocus={() => setHot(s.n)} onBlur={() => setHot(null)}>
      {pic && <div className="c-vis" style={{ backgroundImage: `url(${pic})` }} aria-hidden />}
      {s.id === "sources" && <div className="c-vis plain"><Spark /></div>}
      {s.id === "storage" && <div className="c-vis plain"><Tank pct={82} /></div>}
      <header>
        <i className="c-ico"><Icon size={24} strokeWidth={1.8} /></i>
        <div><h3>{s.title}</h3><em>{s.sub}</em></div>
        <span className="c-n">{s.n}</span>
      </header>
      <div className="c-owners">
        {s.owners.map((o) => { const m = MINISTRY_BY_ID[o]; return <span key={o} style={{ ["--c" as string]: m.accent }}>{m.short}</span>; })}
        <ChevronRight size={16} className="c-go" />
      </div>
      <div className="c-main"><b><CountUp value={s.main.value} decimals={s.main.decimals ?? 0} /></b><small>{s.main.unit}</small><em>{s.main.label}</em></div>
      <ul className="c-lines">
        {s.lines.map((l) => {
          const LI = l.icon;
          return (
            <li key={l.label}>
              <i><LI size={15} strokeWidth={1.9} /></i><span>{l.label}</span><b>{l.value}</b>
              <u><s className={l.warn ? "warn" : ""} style={{ width: `${l.pct}%` }} /></u>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

export default function Cycle({ go }: { go: Go }) {
  const [hot, setHot] = useState<number | null>(null);
  const S = CYCLE_STAGES, F = CYCLE_FLOWS;
  // top row runs left to right (1 to 4), the bottom row runs right to left (5 to 8)
  const isHot = (a: number, b: number) => hot === a || hot === b;
  const [a, b, c, d] = CYCLE_SUMMARY;
  const Pill = ({ p }: { p: (typeof CYCLE_SUMMARY)[number] }) => { const PI = p.icon; return <div className="c-pill"><i><PI size={20} strokeWidth={1.8} /></i><b>{p.value}</b><span>{p.label}</span></div>; };
  return (
    <motion.div className="cycle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <header className="c-hero">
        <div className="c-hero-t"><h2>Water Cycle</h2><p>From the Nile to the tap and back to the field · M m³/day · click a stage to open its ministry</p></div>
        <div className="c-legend">{MINISTRIES.map((m) => <span key={m.id} style={{ ["--c" as string]: m.accent }}>{m.short}</span>)}</div>
      </header>

      <div className="c-grid">
        {S.slice(0, 4).map((s, i) => <Node key={s.id} s={s} col={1 + i * 2} row={1} i={i} hot={hot} setHot={setHot} go={go} />)}
        <Pipe dir="right" label={F[0]} hot={isHot(1, 2)} col={2} row={1} />
        <Pipe dir="right" label={F[1]} hot={isHot(2, 3)} col={4} row={1} />
        <Pipe dir="right" label={F[2]} hot={isHot(3, 4)} col={6} row={1} />

        {/* the middle row: the loop going back up on the left, the totals around the drop, and the turn down on the right */}
        <Pipe dir="up" label={F[7]} hot={isHot(8, 1)} col={1} row={2} />
        <div className="c-sum" style={{ gridColumn: "2 / 7", gridRow: 2 }}>
          <div className="c-sum-l"><Pill p={a} /><Pill p={b} /></div>
          <div className="c-sum-m" />
          <div className="c-sum-r"><Pill p={c} /><Pill p={d} /></div>
        </div>
        <div className="c-drop-wrap" style={{ gridColumn: "2 / 7", gridRow: 2 }}><Drop /></div>
        <Pipe dir="down" label={F[3]} hot={isHot(4, 5)} col={7} row={2} />

        {[S[7], S[6], S[5], S[4]].map((s, i) => <Node key={s.id} s={s} col={1 + i * 2} row={3} i={4 + i} hot={hot} setHot={setHot} go={go} />)}
        <Pipe dir="left" label={F[6]} hot={isHot(7, 8)} col={2} row={3} />
        <Pipe dir="left" label={F[5]} hot={isHot(6, 7)} col={4} row={3} />
        <Pipe dir="left" label={F[4]} hot={isHot(5, 6)} col={6} row={3} />
      </div>
    </motion.div>
  );
}
