import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { C, fmt, rangeLabel, stageData, stageStatus, STAGES, type Filters } from "./data";
import { axis, Card, chartAnim, Chip, CountUp, grid, Legend, Segmented, Tip, Replay } from "./ui";
import { jitter, useLiveRows, useTick } from "./live";

const SPEEDS = ["3s", "5s", "8s"] as const; // time spent on each stage during the auto tour

export default function Process({ f }: { f: Filters }) {
  const [sel, setSel] = useState(STAGES[0].id); // always opens on stage 1
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>("5s");
  const dwell = parseInt(speed) * 1000;
  const dir = useRef(1); // slide direction of the detail card
  const touchX = useRef<number | null>(null);
  const { tick } = useTick();
  const idx = STAGES.findIndex((s) => s.id === sel);
  const last = STAGES.length - 1;
  const goTo = useCallback((i: number) => {
    const n = Math.max(0, Math.min(last, i));
    setSel((cur) => { const c = STAGES.findIndex((s) => s.id === cur); dir.current = n >= c ? 1 : -1; return STAGES[n].id; });
  }, [last]);
  const next = () => goTo(idx + 1), prev = () => goTo(idx - 1);
  const togglePlay = () => { if (playing) { setPlaying(false); return; } if (idx === last) goTo(0); setPlaying(true); };

  // auto tour: advance after a short dwell, stop on the last stage
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => { if (idx < last) goTo(idx + 1); else setPlaying(false); }, dwell);
    return () => clearTimeout(t);
  }, [playing, idx, last, goTo, dwell]);

  // arrow keys step through the stages
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
      if (document.querySelector(".modal")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(idx + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(idx - 1); }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [idx, goTo]);

  const stage = STAGES[idx];
  const d = useMemo(() => stageData(stage, f), [stage, f]);
  const status = stageStatus(stage.id, f);
  const series = useLiveRows(d.series, "v", `stg${stage.id}`, 0.015, 1);
  const nodes = useMemo(() => STAGES.map((s) => ({ s, st: stageStatus(s.id, f), d: stageData(s, f) })), [f]);

  return (
    <>
      <Card title="Paint production flow" sub="Press Play for an automatic tour, use the arrows or the ← → keys, or tap a stage. A stopped stage cuts its line." i={0}
        right={
          <div className="tour">
            <button className="tour-btn" onClick={prev} disabled={idx === 0} aria-label="Previous stage"><ChevronLeft size={18} /></button>
            <button className="tour-play" onClick={togglePlay} aria-pressed={playing}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? "Pause" : idx === last ? "Replay tour" : "Play tour"}</button>
            <button className="tour-btn" onClick={next} disabled={idx === last} aria-label="Next stage"><ChevronRight size={18} /></button>
            <span className="tour-count">Stage {idx + 1} / {STAGES.length}</span>
            <Segmented value={speed} options={SPEEDS} onChange={setSpeed} label="Seconds per stage" />
          </div>
        }>
        <div className="flow" role="tablist" aria-label="Production stages">
          {nodes.map(({ s, st, d: sd }) => (
            <button key={s.id} role="tab" aria-selected={s.id === sel} className={`node ${st.tone} ${s.id === sel ? "on" : ""}`} onClick={() => goTo(STAGES.indexOf(s))}>
              <div className="node-n">{s.n}</div>
              <div className="node-t">{s.short}</div>
              <div className="node-v">{fmt(jitter(s.id, tick, sd.cur), 1)} {s.unit}</div>
            </button>
          ))}
        </div>
        <div className="tour-bar" aria-hidden>
          <i style={{ width: `${Math.min(100, ((idx + 1 + (playing && idx < last ? 1 : 0)) / STAGES.length) * 100)}%`, transition: playing ? `width ${dwell}ms linear` : "width .3s ease" }} />
        </div>
      </Card>

      <motion.div key={stage.id} className="card detail" initial={{ opacity: 0, x: dir.current * 36 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (touchX.current === null) return; const dx = e.changedTouches[0].clientX - touchX.current; touchX.current = null; if (Math.abs(dx) > 60) goTo(idx + (dx < 0 ? 1 : -1)); }}>
        <div className="detail-img"><img src={`/stages/${stage.img}.jpg`} alt={stage.name} /></div>
        <div className="detail-body">
          <div>
            <div className="stage-no">Stage {stage.n} of {STAGES.length}</div>
            <h3>{stage.name}</h3>
          </div>
          <p>{stage.blurb}</p>
          <div className="mini-stats">
            <div className="mini"><b><CountUp value={jitter(stage.id, tick, d.cur)} dp={1} /></b><span>{stage.flow} · {stage.unit}</span></div>
            <div className="mini"><b>{d.util.toFixed(0)}%</b><span>Utilisation</span></div>
            <div className="mini"><b>{d.wip}</b><span>Batches in progress</span></div>
            <div className="mini"><b>{d.yld.toFixed(1)}%</b><span>Stage yield</span></div>
          </div>
          <div><Chip tone={status.tone}>{status.st}</Chip></div>
        </div>
      </motion.div>

      <div className="grid g-21">
        <Card title={`${stage.flow}`} sub={`${stage.unit} · ${rangeLabel(f.range)} · ${f.line.toLowerCase()}`}
          right={<Legend items={[{ name: "Actual", color: C.yellow }, { name: "Plan", color: C.mute }]} />} i={2}>
          <Replay className="chart-h">
            <ResponsiveContainer>
              <AreaChart key={stage.id} data={series} margin={{ left: -10, right: 6, top: 8 }}>
                <defs>
                  <linearGradient id="stG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.yellow} stopOpacity={0.45} /><stop offset="100%" stopColor={C.yellow} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} width={44} domain={["auto", "auto"]} />
                <Tooltip content={<Tip unit={` ${stage.unit}`} />} />
                <Area dataKey="v" name="actual" stroke={C.yellow} strokeWidth={2.2} fill="url(#stG)" {...chartAnim} />
                <Line dataKey="plan" name="plan" stroke={C.mute} strokeDasharray="5 5" dot={false} {...chartAnim} />
              </AreaChart>
            </ResponsiveContainer>
          </Replay>
        </Card>

        <Card title="Process parameters" sub="Live value against target" i={3}>
          <div className="table-wrap">
            <table style={{ minWidth: 0 }}>
              <thead><tr><th>Parameter</th><th className="num">Value</th><th>State</th></tr></thead>
              <tbody>
                {d.params.map((p) => {
                  const v = jitter(stage.id + p.name, tick, p.value, 0.006);
                  return (
                    <tr key={p.name}>
                      <td><span className="strong">{p.name}</span><div className="kpi-note">Target {fmt(p.target, p.dp)} {p.unit}</div></td>
                      <td className="num">{fmt(v, p.dp)} {p.unit}</td>
                      <td><Chip tone={p.tone}>{p.tone === "good" ? "In spec" : "Drifting"}</Chip></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
