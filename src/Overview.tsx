import { useMemo } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, MapPin } from "lucide-react";
import { alarms, BUCKET, compact, membraneScore, overviewKpis, PLANT, productionSeries, RANGE_LABEL, stages, trains, type Alarm, type Filters } from "./data";
import type { WorkOrder } from "./cmms";
import { useAlarmLog } from "./AlarmsContext";
import { axis, C, Card, Chip, CountUp, gridProps, KpiCard, Legend, Replay, rise, Tip, TONE_COLOR } from "./ui";
import { useTick, wobble } from "./live";
import type { Go } from "./App";

const SEV_ICON = { Critical: AlertTriangle, Warning: AlertTriangle, Info: Info } as const;
const SEV_COLOR: Record<Alarm["sev"], string> = { Critical: C.bad, Warning: C.warn, Info: C.blue };
const KPI_WOBBLE: Record<string, number> = { water: 0.0015, energy: 0.004, cost: 0.004, avail: 0.0008, wo: 0 };

export default function Overview({ f, go, wos }: { f: Filters; go: Go; wos: WorkOrder[] }) {
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
    <>
      <motion.div className="banner" {...rise(0)}>
        <motion.img src="/plant.jpg" alt="Seawater reverse osmosis plant at sunset" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} />
        <div className="banner-text">
          <span className="banner-tag"><MapPin size={13} /> Red Sea coast · Egypt</span>
          <p>{PLANT.name} · {PLANT.capacity.toLocaleString("en-US")} m³/day capacity. {critical ? `${critical} item needs attention today.` : "All systems normal."}</p>
          <div className="banner-pills">
            <Chip tone={critical ? "bad" : "good"}>{critical ? `${critical} critical alarm` : "All normal"}</Chip>
            <Chip tone="mute">{RANGE_LABEL[f.range]} · {f.area}</Chip>
          </div>
        </div>
      </motion.div>

      <div className="grid g-kpi">
        {kpis.map((k, i) => <KpiCard key={k.id} k={k} i={i + 1} hero={i === 0} />)}
      </div>

      <div className="grid g-21">
        <Card title="Water produced" sub={`Cubic metres ${BUCKET[f.range]} · ${RANGE_LABEL[f.range]}`} i={2}
          right={<Legend items={[{ name: "Actual", color: C.teal }, { name: "Target", color: "#9aa9ae", dashed: true }]} />}>
          <Replay className="chart-h">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: -6, right: 6, top: 8 }}>
                <defs>
                  <linearGradient id="prodG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.aqua} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={C.aqua} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} width={46} tickFormatter={(v: number) => compact(v)} domain={domain} />
                <Tooltip content={<Tip unit="m³" />} cursor={{ stroke: C.teal, strokeOpacity: 0.25 }} />
                <Area type="monotone" dataKey="actual" name="Actual" stroke={C.teal} strokeWidth={2.4} fill="url(#prodG)" animationDuration={1400} />
                <Line type="monotone" dataKey="target" name="Target" stroke="#9aa9ae" strokeDasharray="5 5" dot={false} strokeWidth={1.6} animationDuration={1400} />
              </AreaChart>
            </ResponsiveContainer>
          </Replay>
        </Card>

        <Card title="Alarms" sub="Newest first, linked to a work order" i={3}
          right={<button className="link" onClick={() => go("maintenance")}>Work orders <ArrowRight size={13} /></button>}>
          <ul className="alarms">
            {list.map((a, n) => {
              const I = SEV_ICON[a.sev];
              return (
                <motion.li key={a.id} {...rise(n)}>
                  <span className={`al-ico ${a.sev === "Critical" ? "pulse" : ""}`} style={{ color: SEV_COLOR[a.sev], background: `${SEV_COLOR[a.sev]}1a` }}><I size={16} /></span>
                  <div>
                    <b>{a.text}</b>
                    <span>{a.where} · {a.time}</span>
                  </div>
                  {a.wo && <button className="wo-link" onClick={() => go("maintenance")}>{a.wo}</button>}
                </motion.li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid g-12">
        <Card title="Plant flow" sub="Tap any step to follow the water" i={4}
          right={<button className="link" onClick={() => go("production")}>Open production <ArrowRight size={13} /></button>}>
          <div className="mini-flow">
            {flow.map((s, n) => (
              <motion.button key={s.id} className="mini-step" onClick={() => go("production")} {...rise(n)}>
                <i className={`dot dot-${s.tone}`} />
                <b>{s.name}</b>
                <span><CountUp value={wobble(s.flow, n + 1, t, 0.004)} /> m³/h</span>
              </motion.button>
            ))}
          </div>
        </Card>

        <Card title="Membrane health" sub="Fouling is the biggest cost driver in RO" i={5}>
          <div className="health">
            <div className="ring" style={{ ["--p" as string]: `${score}%` }}><b><CountUp value={score} /></b><span>/100</span></div>
            <div className="health-rows">
              {tr.map((x) => (
                <div key={x.name} className="h-row">
                  <span>{x.name}</span>
                  <div className="bar"><motion.i initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, x.fouling * 2.5)}%` }} viewport={{ once: false }} transition={{ duration: 0.9, ease: "easeOut" }} style={{ background: TONE_COLOR[x.tone] }} /></div>
                  <em><CountUp value={x.fouling} />% fouled</em>
                </div>
              ))}
              <p className="h-note"><CheckCircle2 size={14} /> Next cleaning: {worst.name} in {worst.nextCipDays} days</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
