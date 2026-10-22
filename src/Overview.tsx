import { useMemo } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, MapPin } from "lucide-react";
import { alarms, BUCKET, compact, membraneScore, overviewKpis, PLANT, productionSeries, RANGE_LABEL, RANGES, stages, trains, type Alarm, type Filters, type Range } from "./data";
import type { WorkOrder } from "./cmms";
import { useAlarmLog } from "./AlarmsContext";
import { axis, C, Chip, CountUp, gridProps, Legend, Replay, rise, Segmented, Tip, TONE_COLOR } from "./ui";
import KpiTile from "./KpiTiles";
import { useTick, wobble } from "./live";
import type { Go } from "./App";

const SEV_ICON = { Critical: AlertTriangle, Warning: AlertTriangle, Info: Info } as const;
const SEV_COLOR: Record<Alarm["sev"], string> = { Critical: C.bad, Warning: C.warn, Info: C.blue };
const KPI_WOBBLE: Record<string, number> = { water: 0.0015, energy: 0.004, cost: 0.004, avail: 0.0008, wo: 0 };

/** Overview: the whole plant on one screen, no scrolling */
export default function Overview({ f, setRange, go, wos }: { f: Filters; setRange: (r: Range) => void; go: Go; wos: WorkOrder[] }) {
  const t = useTick();
  const series = useMemo(() => productionSeries(f), [f]);
  const { done: alarmsDone } = useAlarmLog();
  const list = useMemo(() => alarms(f).filter((a) => !alarmsDone[a.id]), [f, alarmsDone]);
  const base = useMemo(() => overviewKpis(f, wos), [f, wos]);
  const kpis = base.map((k, i) => ({ ...k, value: wobble(k.value, i + 1, t, KPI_WOBBLE[k.id]) }));
  const flow = useMemo(() => stages(f), [f]);
  const tr = trains(f);
  const score = membraneScore(f);
  const worst = [...tr].sort((a, b) => a.nextCipDays - b.nextCipDays)[0];
  const lo = Math.min(...series.map((p) => p.actual)), hi = Math.max(...series.map((p) => p.target));
  const pad = (hi - lo) * 0.15;
  const domain: [number, number] = [Math.floor((lo - pad) / 1000) * 1000, Math.ceil((hi + pad) / 1000) * 1000];
  const critical = list.filter((a) => a.sev === "Critical").length;

  return (
    <div className="cc">
      <motion.div className="cc-hero" {...rise(0)}>
        <img src="/plant.jpg" alt="" aria-hidden />
        <div className="cc-hero-l">
          <h1>Overview</h1>
          <span><MapPin size={13} /> Red Sea coast · Egypt · {PLANT.name}</span>
        </div>
        <div className="cc-hero-m">
          <Chip tone={critical ? "bad" : "good"}>{critical ? `${critical} critical alarm` : "All normal"}</Chip>
          <p>{PLANT.capacity.toLocaleString("en-US")} m³/day capacity. {critical ? `${critical} item needs attention today.` : "All systems normal."}</p>
        </div>
        <div className="cc-hero-r"><Segmented<Range> label="Time range" value={f.range} options={RANGES} onChange={setRange} /></div>
      </motion.div>

      <div className="cc-kpis">
        {kpis.map((k, i) => <KpiTile key={k.id} k={k} i={i + 1} go={go} hero={i === 0} />)}
      </div>

      <div className="cc-mid">
        <motion.section className="card ins-card" {...rise(2)}>
          <header className="ins-ch">
            <div><h3>Water produced</h3><p>{`Cubic metres ${BUCKET[f.range]} · ${RANGE_LABEL[f.range]}`}</p></div>
            <Legend items={[{ name: "Actual", color: C.teal }, { name: "Target", color: "#9aa9ae", dashed: true }]} />
          </header>
          <Replay className="ins-chart">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: -6, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="prodG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.aqua} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={C.aqua} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} width={46} tickCount={4} tickFormatter={(v: number) => compact(v)} domain={domain} />
                <Tooltip content={<Tip unit="m³" />} cursor={{ stroke: C.teal, strokeOpacity: 0.25 }} />
                <Area type="monotone" dataKey="actual" name="Actual" stroke={C.teal} strokeWidth={2.4} fill="url(#prodG)" animationDuration={1400} />
                <Line type="monotone" dataKey="target" name="Target" stroke="#9aa9ae" strokeDasharray="5 5" dot={false} strokeWidth={1.6} animationDuration={1400} />
              </AreaChart>
            </ResponsiveContainer>
          </Replay>
        </motion.section>

        <motion.section className="card ins-card" {...rise(3)}>
          <header className="ins-ch">
            <div><h3>Alarms</h3><p>Newest first</p></div>
            <button className="link" onClick={() => go("alarms")}>All alarms <ArrowRight size={13} /></button>
          </header>
          <ul className="alarms cc-alarms">
            {list.slice(0, 3).map((a, n) => {
              const I = SEV_ICON[a.sev];
              return (
                <motion.li key={a.id} {...rise(n)}>
                  <span className={`al-ico ${a.sev === "Critical" ? "pulse" : ""}`} style={{ color: SEV_COLOR[a.sev], background: `${SEV_COLOR[a.sev]}1a` }}><I size={16} /></span>
                  <div>
                    <b>{a.text}</b>
                    <span>{a.where} · {a.time}</span>
                  </div>
                  {a.wo && <button className="wo-link" onClick={() => go("alarms", a.id)}>{a.wo}</button>}
                </motion.li>
              );
            })}
            {!list.length && <li className="b-empty">No active alarms</li>}
          </ul>
        </motion.section>

        <motion.section className="card ins-card" {...rise(4)}>
          <header className="ins-ch"><div><h3>Membrane health</h3><p>Fouling drives RO cost</p></div></header>
          <div className="health cc-health">
            <div className="ring" style={{ ["--p" as string]: `${score}%` }}><b><CountUp value={score} /></b><span>/100</span></div>
            <div className="health-rows">
              {tr.map((x) => (
                <div key={x.name} className="h-row">
                  <span>{x.name}</span>
                  <div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(100, x.fouling * 2.5)}%` }} transition={{ duration: 0.9, ease: "easeOut" }} style={{ background: TONE_COLOR[x.tone] }} /></div>
                  <em><CountUp value={x.fouling} />%</em>
                </div>
              ))}
              <p className="h-note"><CheckCircle2 size={14} /> Next cleaning: {worst.name} in {worst.nextCipDays} days</p>
            </div>
          </div>
        </motion.section>
      </div>

      <motion.section className="card cc-flow" {...rise(5)}>
        <div className="cc-flow-h"><b>Plant flow</b><button className="link" onClick={() => go("flow")}>Open operations <ArrowRight size={13} /></button></div>
        <div className="cc-steps">
          {flow.map((s, n) => (
            <button key={s.id} className="cc-step" onClick={() => go("production", s.id)} aria-label={`${s.name}, open in Production`}>
              <i className={`dot dot-${s.tone}`} />
              <b>{s.name}</b>
              <span><CountUp value={wobble(s.flow, n + 1, t, 0.004)} /> m³/h</span>
            </button>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
