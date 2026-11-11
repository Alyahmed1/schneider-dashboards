import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Scale, TrendingUp, Trophy } from "lucide-react";
import { ALERTS, BUDGET_USED, MINISTRIES, MINISTRY_SCORE, type Go, type MinistryId } from "./data";
import { COMPARE_SERIES, OPS, SCORE_CHANGE, WATER_HANDLED } from "./ministryData";
import MinistryIcon from "./MinistryIcon";
import { CompareChart, Panel, StatusChip } from "./parts";

type Measure = keyof typeof COMPARE_SERIES;
type Row = { key: string; label: string; val?: (id: MinistryId) => number; best?: "high" | "low"; text: (id: MinistryId) => React.ReactNode };

const sites = (id: MinistryId) => MINISTRIES.find((m) => m.id === id)!.rows.reduce((n, r) => n + Number(r.sites.replace(/,/g, "")), 0);
const inUse = (id: MinistryId) => { const r = MINISTRIES.find((m) => m.id === id)!.rows; return Math.round(r.reduce((n, x) => n + x.pct, 0) / r.length); };
const running = (id: MinistryId) => { const o = OPS[id]; return Math.round((o.running / (o.running + o.standby + o.fault)) * 100); };
const alerts = (id: MinistryId) => ALERTS.filter((a) => a.ministry === id).length;

const ROWS: Row[] = [
  { key: "score", label: "Score", val: (id) => MINISTRY_SCORE[id].score, best: "high", text: (id) => <b>{MINISTRY_SCORE[id].score}<small> / 100</small></b> },
  { key: "status", label: "Status", text: (id) => <StatusChip status={MINISTRY_SCORE[id].status} /> },
  { key: "change", label: "Score this month", val: (id) => SCORE_CHANGE[id], best: "high", text: (id) => <b>{SCORE_CHANGE[id] > 0 ? "+" : SCORE_CHANGE[id] < 0 ? "−" : ""}{Math.abs(SCORE_CHANGE[id])}</b> },
  { key: "running", label: "Running now", val: running, best: "high", text: (id) => <b>{running(id)}%</b> },
  { key: "alerts", label: "Open alerts", val: alerts, best: "low", text: (id) => <b>{alerts(id)}</b> },
  { key: "water", label: "Water handled", text: (id) => <b>{WATER_HANDLED[id].toFixed(1)}<small> M m³/day</small></b> },
  { key: "budget", label: "Budget used", text: (id) => <b>{BUDGET_USED[id]}%</b> },
  { key: "inuse", label: "Average in use", text: (id) => <b>{inUse(id)}%</b> },
  { key: "sites", label: "Sites and systems", text: (id) => <b>{sites(id).toLocaleString("en-US")}</b> },
];

/** is this ministry the best in this row? (ties all count) */
function isBest(r: Row, id: MinistryId) {
  if (!r.val || !r.best) return false;
  const v = MINISTRIES.map((m) => r.val!(m.id));
  const top = r.best === "high" ? Math.max(...v) : Math.min(...v);
  return r.val(id) === top;
}

/** the four ministries side by side: the same numbers in the same order, so they can be compared at a glance */
export default function MinistriesView({ go }: { go: Go }) {
  const [measure, setMeasure] = useState<Measure>("score");
  const ser = COMPARE_SERIES[measure];
  return (
    <motion.div className="mv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <header className="x-hero">
        <div className="x-hero-t"><h2>Ministries View</h2><p>The four ministries side by side · click a ministry name to open its page</p></div>
        <span className="mc-key"><Trophy size={14} /> = best in that row</span>
      </header>

      <div className="mc">
        <Panel icon={Scale} title="Side by side" hint="same numbers, same order" i={0}>
          <div className="mc-table" role="table" aria-label="Ministries compared">
            <div className="mc-r head" role="row">
              <span />
              {MINISTRIES.map((m) => (
                <button key={m.id} className="mc-h" style={{ ["--accent" as string]: m.accent }} onClick={() => go("ministry", m.id)} aria-label={`Open ${m.name}`}>
                  <MinistryIcon m={m} size={40} /><b>{m.short}</b><em>Open <ChevronRight size={12} /></em>
                </button>
              ))}
            </div>
            {ROWS.map((r) => (
              <div key={r.key} className="mc-r" role="row">
                <span className="mc-l">{r.label}</span>
                {MINISTRIES.map((m) => {
                  const best = isBest(r, m.id);
                  return <span key={m.id} className={`mc-c ${best ? "best" : ""}`} style={{ ["--accent" as string]: m.accent }}>{r.text(m.id)}{best && <Trophy size={13} className="mc-t" aria-label="Best in this row" />}</span>;
                })}
              </div>
            ))}
          </div>
        </Panel>

        <Panel icon={TrendingUp} title="Over the last 12 months" hint={ser.unit} i={1}>
          <div className="mc-chart">
            <div className="mp-chips" role="group" aria-label="Measure">
              {(Object.keys(COMPARE_SERIES) as Measure[]).map((k) => <button key={k} className={measure === k ? "on" : ""} aria-pressed={measure === k} onClick={() => setMeasure(k)}>{COMPARE_SERIES[k].label}</button>)}
            </div>
            <ul className="mc-legend">{MINISTRIES.map((m) => <li key={m.id}><i style={{ background: m.accent }} />{m.short}</li>)}</ul>
            <CompareChart key={measure} lines={MINISTRIES.map((m) => ({ id: m.id, name: m.short, color: m.accent, data: ser.data[m.id] }))} unit={ser.unit} decimals={ser.decimals} />
          </div>
        </Panel>
      </div>
    </motion.div>
  );
}
