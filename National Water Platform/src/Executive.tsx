import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, ReferenceDot, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { ArrowDown, ArrowUp, ChevronRight, FileText, Lightbulb, ListChecks, MapPinned, Printer, Radio, Target, Trophy, X } from "lucide-react";
import {
  ALERTS, ATTENTION, INSIGHTS, EXEC_TREND, MINISTRIES, MINISTRY_BY_ID, MINISTRY_SCORE, MONTHS, EXEC_KPIS, OUTCOMES, OUTCOME_SCORE, STATUS_LABEL,
  outcomeStatus, type Go,
} from "./data";
import { CountUp } from "./ui";
import { SEV_ICON } from "./Header";
import RealMap from "./RealMap";
import { STATIONS } from "./stations";
import { Panel, ease, rise } from "./parts";

type Range = 3 | 6 | 12;
const TODAY = "10 November 2026";

/** progress towards the target, as a glowing ring */
function KRing({ pct, tone }: { pct: number; tone: string }) {
  const C = 2 * Math.PI * 19;
  return (
    <svg className="x-kring" width="50" height="50" viewBox="0 0 50 50" style={{ ["--tone" as string]: tone }} aria-label={`${pct}% of target`}>
      <circle cx="25" cy="25" r="19" className="bg" />
      <circle cx="25" cy="25" r="19" className="fg" strokeDasharray={`${(C * pct) / 100} ${C}`} transform="rotate(-90 25 25)" />
      <text x="25" y="29" textAnchor="middle">{pct}%</text>
    </svg>
  );
}

function KpiCard({ k, i, range, go }: { k: (typeof EXEC_KPIS)[number]; i: number; range: Range; go: Go }) {
  const t = EXEC_TREND[k.id];
  const Icon = k.icon;
  const data = t.series.slice(-range).map((v, n) => ({ m: MONTHS[12 - range + n], v }));
  const last = data[data.length - 1];
  const gid = `g-${k.id}`;
  return (
    <motion.button className="x-kpi rich" style={{ ["--tone" as string]: k.tone }} {...rise(i)} whileHover={{ y: -3 }} onClick={() => go("performance")} aria-label={`${k.label}. Open Performance`}>
      <span className="x-kpi-h"><i className="x-ico"><Icon size={18} strokeWidth={1.9} /></i><em>{k.label}</em></span>
      <span className="x-kpi-v">
        <span className="x-kpi-n">{k.cur && <small className="x-cur">{k.cur}</small>}<b>{k.prefix}<CountUp value={k.value} decimals={k.decimals} /></b><small>{k.unit}</small></span>
        <KRing pct={t.progress} tone={k.tone} />
      </span>
      <span className="x-spark">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 190, height: 60 }}>
          <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 2 }}>
            <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={k.tone} stopOpacity=".55" /><stop offset="1" stopColor={k.tone} stopOpacity="0" /></linearGradient></defs>
            <YAxis hide domain={["dataMin - 0.3", "dataMax + 0.3"]} />
            <Tooltip cursor={{ stroke: k.tone, strokeOpacity: 0.4 }} contentStyle={{ background: "#14113a", border: "1px solid #5b4bd6", borderRadius: 8, fontSize: 12, padding: "4px 8px" }} labelStyle={{ color: "#c9c5f5" }} itemStyle={{ color: "#fff" }}
              formatter={(v) => [k.unit === "%" ? `${v}%` : `${k.cur ? `${k.cur} ` : ""}${v} ${k.unit}`, k.label]} />
            <Area type="monotone" dataKey="v" stroke={k.tone} strokeWidth={2.2} fill={`url(#${gid})`} animationDuration={900} />
            <ReferenceDot x={last.m} y={last.v} r={4.5} fill="#fff" stroke={k.tone} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </span>
      <span className="x-kpi-f">
        <span className="x-delta">{k.down ? <ArrowDown size={12} /> : <ArrowUp size={12} />}{k.delta}</span>
        <em><Target size={11} /> Target {t.target}</em>
      </span>
    </motion.button>
  );
}

/** the one-page brief: shown on screen, and it is the only thing that prints */
function Brief({ onClose }: { onClose: () => void }) {
  return createPortal(
    <motion.div className="brief-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div className="brief-sheet" role="dialog" aria-label="Cabinet brief" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, ease }}>
        <div className="brief-actions">
          <button onClick={() => window.print()}><Printer size={16} /> Print or save as PDF</button>
          <button className="ghost" onClick={onClose} aria-label="Close"><X size={16} /> Close</button>
        </div>
        <div className="brief-head">
          <div><h1>Egypt National Water Platform</h1><p className="brief-sub">Cabinet brief · {TODAY}</p></div>
          <img className="brief-logo" src="/img/schneider-green.png" alt="Schneider Electric" />
        </div>

        <h2>Money indicators (EGP)</h2>
        <table>
          <thead><tr><th>Indicator</th><th>Now</th><th>Change</th><th>Target</th><th>Progress</th></tr></thead>
          <tbody>
            {EXEC_KPIS.map((k) => (
              <tr key={k.id}><td>{k.label}</td><td>{k.cur ? `${k.cur} ` : ""}{k.value.toFixed(k.decimals)}{k.unit === "%" ? "%" : ` ${k.unit}`}</td><td>{k.delta}</td><td>{EXEC_TREND[k.id].target}</td><td>{EXEC_TREND[k.id].progress}%</td></tr>
            ))}
          </tbody>
        </table>

        <h2>Ministries</h2>
        <table>
          <thead><tr><th>Ministry</th><th>Score</th><th>Status</th><th>Top issue</th></tr></thead>
          <tbody>
            {MINISTRIES.map((m) => { const s = MINISTRY_SCORE[m.id]; return <tr key={m.id}><td>{m.name}</td><td>{s.score}</td><td>{STATUS_LABEL[s.status]}</td><td>{s.issue}</td></tr>; })}
          </tbody>
        </table>

        <h2>Needs attention</h2>
        <ul>{ATTENTION.map((a) => <li key={a.id}><b>{a.title}.</b> {a.detail}</li>)}</ul>

        <h2>Insights</h2>
        <ul>{INSIGHTS.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="brief-note">All figures are simulated for demonstration.</p>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/** the latest events and insights, scrolling along the bottom */
function Ticker() {
  const items = [
    ...ALERTS.map((a) => ({ key: a.id, sev: a.sev as string, text: a.text, tag: MINISTRY_BY_ID[a.ministry].short, color: MINISTRY_BY_ID[a.ministry].accent, ago: a.ago })),
    ...INSIGHTS.map((t, n) => ({ key: `i${n}`, sev: "tip", text: t, tag: "Insight", color: "#a78bfa", ago: "" })),
  ];
  const run = [...items, ...items];
  return (
    <motion.div className="x-ticker" {...rise(9)} aria-label="Latest events and insights">
      <span className="x-live"><Radio size={15} /> LIVE</span>
      <div className="x-track">
        <div className="x-run">
          {run.map((it, n) => {
            const Icon = it.sev === "tip" ? Lightbulb : SEV_ICON[it.sev as keyof typeof SEV_ICON];
            return (
              <span key={`${it.key}-${n}`} className={`x-item ${it.sev}`}>
                <i><Icon size={15} /></i>{it.text}<em style={{ ["--c" as string]: it.color }}>{it.tag}</em>{it.ago && <small>{it.ago}</small>}
              </span>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default function Executive({ go }: { go: Go }) {
  const [range, setRange] = useState<Range>(12);
  const [brief, setBrief] = useState(false);
  const openAttention = (a: (typeof ATTENTION)[number]) => (a.to === "ministry" ? go("ministry", a.ministry) : go(a.to));
  return (
    <motion.div className="exec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <header className="x-hero">
        <div className="x-hero-t"><h2>Executive View</h2><p>The national picture on one screen · as of {TODAY}</p></div>
        <div className="x-tools">
          <div className="x-seg" role="group" aria-label="Trend period">
            {([3, 6, 12] as Range[]).map((r) => <button key={r} className={range === r ? "on" : ""} aria-pressed={range === r} onClick={() => setRange(r)}>{r} months</button>)}
          </div>
          <button className="x-brief" onClick={() => setBrief(true)}><FileText size={17} /> Cabinet brief</button>
        </div>
      </header>

      <section className="x-kpis" aria-label="National key numbers">
        {EXEC_KPIS.map((k, i) => <KpiCard key={k.id} k={k} i={i} range={range} go={go} />)}
      </section>

      <section className="x-mid">
        <Panel icon={MapPinned} title="Station health on the map" hint="every station, by health" i={0}>
          <div className="x-mapbody"><RealMap mode="health" go={go} /></div>
        </Panel>

        <Panel icon={ListChecks} title="Needs attention" hint={`${STATIONS.filter((x) => x.status === "bad").length} behind · ${STATIONS.filter((x) => x.status === "watch").length} watch`} i={1}>
          <ul className="x-attn">
            {ATTENTION.slice(0, 5).map((a) => {
              const Icon = SEV_ICON[a.sev];
              const m = MINISTRY_BY_ID[a.ministry];
              return (
                <li key={a.id}>
                  <button onClick={() => openAttention(a)}>
                    <span className={`sev ${a.sev}`}><Icon size={17} /></span>
                    <span className="x-attn-t"><b>{a.title}</b><em>{a.detail}</em></span>
                    <span className="x-own" style={{ ["--accent" as string]: m.accent }}>{m.short}</span>
                    <ChevronRight size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel icon={Trophy} title="National outcomes" hint="score against target" i={2}>
          <ul className="x-out">
            {OUTCOMES.map((o) => {
              const sc = OUTCOME_SCORE[o.id];
              const st = outcomeStatus(sc.score, sc.target);
              const Icon = o.icon;
              return (
                <li key={o.id}>
                  <button onClick={() => go("performance")} aria-label={`${o.label}: ${sc.score} against a target of ${sc.target}`}>
                    <Icon size={17} className={`o-ico ${st}`} />
                    <span className="x-out-l">{o.label}</span>
                    <span className="x-bar"><u><s className={st} style={{ width: `${sc.score}%` }} /></u><i style={{ left: `${sc.target}%` }} title={`Target ${sc.target}`} /></span>
                    <b className={st}>{sc.score}</b>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </section>

      <Ticker />

      <AnimatePresence>{brief && <Brief onClose={() => setBrief(false)} />}</AnimatePresence>
    </motion.div>
  );
}
