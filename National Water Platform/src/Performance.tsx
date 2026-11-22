import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Landmark, MapPinned, Target, Zap } from "lucide-react";
import { BUDGET_USED, EXEC_KPIS, EXEC_TREND, KPI_TREND, MINISTRIES, MINISTRY_SCORE, NATIONAL_KPIS, type Go, type Kpi, type Status } from "./data";
import { SCORE_CHANGE } from "./ministryData";
import { GOV } from "./live";
import { STATIONS, stationStats } from "./stations";
import { BarList, Panel, Ring, StatusChip } from "./parts";
import "./pages.css";

type Range = 3 | 6 | 12;
const statusOf = (p: number): Status => (p >= 90 ? "good" : p >= 75 ? "watch" : "bad");

function Spark({ data, tone }: { data: number[]; tone: string }) {
  const lo = Math.min(...data), hi = Math.max(...data), span = hi - lo || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 92 + 2},${24 - ((v - lo) / span) * 20}`).join(" ");
  return <svg width="96" height="28" viewBox="0 0 96 28" aria-hidden><polyline points={pts} fill="none" stroke={tone} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /><circle cx={pts.split(" ").pop()!.split(",")[0]} cy={pts.split(" ").pop()!.split(",")[1]} r="3" fill={tone} /></svg>;
}

const fmt = (k: Kpi) => `${k.prefix ?? ""}${k.cur ? `${k.cur} ` : ""}${k.value.toFixed(k.decimals)}${k.unit === "%" ? "%" : ` ${k.unit}`}`;

/** the 6 governorates with no station on the map yet: simulated scores so the list covers all 27 */
const EXTRA: Record<string, number> = { Dakahlia: 91, "Kafr El Sheikh": 86, Monufia: 89, "Beni Suef": 82, Sohag: 78, "North Sinai": 74 };

/** average station health score of each governorate (stations on the map), plus the 6 without a station, all 27 ranked */
function governorates() {
  const by: Record<string, number[]> = {};
  STATIONS.forEach((s) => { const g = GOV[s.id] ?? "Egypt"; (by[g] ??= []).push(stationStats(s).score); });
  const real = Object.entries(by).map(([name, v]) => ({ name, score: Math.round(v.reduce((a, b) => a + b, 0) / v.length), n: v.length }));
  const extra = Object.entries(EXTRA).map(([name, score]) => ({ name, score, n: 0 }));
  return [...real, ...extra].sort((a, b) => b.score - a.score);
}

export default function Performance({ go }: { go: Go }) {
  const [range, setRange] = useState<Range>(12);
  const rows = useMemo(() => [
    ...NATIONAL_KPIS.map((k) => ({ k, t: KPI_TREND[k.id] })),
    ...EXEC_KPIS.map((k) => ({ k, t: EXEC_TREND[k.id] })),
  ], []);
  const gov = useMemo(governorates, []);
  const ranked = [...MINISTRIES].sort((a, b) => MINISTRY_SCORE[b.id].score - MINISTRY_SCORE[a.id].score);

  return (
    <motion.div className="pg" style={{ gridTemplateRows: "80px 1fr" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <header className="x-hero">
        <div className="x-hero-t"><h2>Performance</h2><p>Are we hitting the targets, and who is behind? Trends against targets</p></div>
        <div className="x-tools">
          <div className="x-seg" role="group" aria-label="Trend period">
            {([3, 6, 12] as Range[]).map((r) => <button key={r} className={range === r ? "on" : ""} aria-pressed={range === r} onClick={() => setRange(r)}>{r} months</button>)}
          </div>
        </div>
      </header>

      <div className="pg-grid" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <div className="pg-grid" style={{ gridTemplateRows: "1fr 214px" }}>
          <Panel icon={Target} title="Scorecard against targets" hint="water and money indicators" i={0}>
            <div className="pg-scroll">
              <table className="pg-table pf">
                <thead><tr><th>Indicator</th><th>Now</th><th>Change</th><th>Trend</th><th>Target</th><th>Progress</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.map(({ k, t }) => {
                    const s = t.series.slice(-range);
                    const ch = s[0] ? ((s[s.length - 1] - s[0]) / s[0]) * 100 : 0;
                    const st = statusOf(t.progress);
                    const tone = st === "good" ? "var(--green)" : st === "watch" ? "var(--amber)" : "var(--red)";
                    return (
                      <tr key={k.id} className="click" onClick={() => go("executive")}>
                        <td><b>{k.label}</b></td><td>{fmt(k)}</td>
                        <td><span className="pf-ch">{ch >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{k.unit === "%" ? `${Math.abs(s[s.length - 1] - s[0]).toFixed(0)} pts` : `${Math.abs(ch).toFixed(1)}%`}</span></td>
                        <td><Spark data={s} tone="var(--ac)" /></td>
                        <td>{t.target}</td>
                        <td><span className="pf-bar"><u><s style={{ width: `${t.progress}%`, background: tone }} /></u><em>{t.progress}%</em></span></td>
                        <td><StatusChip status={st} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel icon={Zap} title="Energy and cost per m³, by source" hint="simulated" i={1}>
            <div className="pf-two">
              <div><h5>Energy, kWh per m³</h5><BarList items={[{ name: "Desalination", value: 3.4, label: "3.4" }, { name: "Wells", value: 0.7, label: "0.7" }, { name: "River", value: 0.5, label: "0.5" }, { name: "Reuse", value: 0.4, label: "0.4" }]} max={3.6} color="linear-gradient(90deg, var(--amber), var(--amber-2))" /></div>
              <div><h5>Cost, EGP per m³ · average 4.8</h5><BarList items={[{ name: "Desalination", value: 14, label: "14" }, { name: "River", value: 4.2, label: "4.2" }, { name: "Wells", value: 3.6, label: "3.6" }, { name: "Reuse", value: 1.6, label: "1.6" }]} max={15} color="linear-gradient(90deg, var(--ac), var(--cyan))" /></div>
            </div>
          </Panel>
        </div>

        <div className="pg-grid" style={{ gridTemplateRows: "auto 1fr" }}>
          <Panel icon={Landmark} title="Ministry ranking" hint="score · change · budget used" i={2}>
            <ul className="pf-rank">
              {ranked.map((m, n) => {
                const sc = MINISTRY_SCORE[m.id], d = SCORE_CHANGE[m.id];
                return (
                  <li key={m.id}>
                    <button onClick={() => go("ministry", m.id)}>
                      <b className="pf-n">{n + 1}</b>
                      <Ring value={sc.score} status={sc.status} size={42} />
                      <span className="pf-nm"><b style={{ color: m.accent }}>{m.short}</b><em>{sc.issue}</em></span>
                      <span className={`pf-d ${d > 0 ? "up" : d < 0 ? "down" : ""}`}>{d > 0 ? <ArrowUp size={12} /> : d < 0 ? <ArrowDown size={12} /> : null}{d === 0 ? "0" : Math.abs(d)}</span>
                      <span className="pf-bud">{BUDGET_USED[m.id]}%<i>budget</i></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel icon={MapPinned} title="All governorates" hint={`${gov.length} ranked by average station health`} i={3}>
            <ol className="pf-gov27">
              {gov.map((g, n) => {
                const tone = g.score >= 85 ? "var(--green)" : g.score >= 75 ? "var(--amber)" : "var(--red)";
                return (
                  <li key={g.name}>
                    <b className="pf-gn">{n + 1}</b>
                    <span className="pf-gname">{g.name}</span>
                    <span className="pf-gbar"><s style={{ width: `${g.score}%`, background: tone }} /></span>
                    <strong style={{ color: tone }}>{g.score}</strong>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>
      </div>
    </motion.div>
  );
}
