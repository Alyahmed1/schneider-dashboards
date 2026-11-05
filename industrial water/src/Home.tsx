import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, CheckCircle2 } from "lucide-react";
import { dayFlow, KPIS, SEGMENTS, spark } from "./data";
import { C, CountUp } from "./ui";
import { useTick, wobble } from "./live";
import { AREA_NAME, useStore, type Area as AreaId } from "./store";
import Backdrop from "./Backdrop";
import type { Go } from "./App";

const stagger = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.04 + i * 0.06, ease: [0.22, 1, 0.36, 1] as const } });

/** memo: the page re-renders every 2 s for the live numbers, and the charts must not restart their draw-in each time */
const Spark = memo(function Spark({ seed, color }: { seed: number; color: string }) {
  const data = useMemo(() => spark(seed), [seed]);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sg${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin - 6", "dataMax + 6"]} />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} fill={`url(#sg${seed})`} isAnimationActive animationDuration={1400} />
      </AreaChart>
    </ResponsiveContainer>
  );
});

const Balance = memo(function Balance({ data }: { data: ReturnType<typeof dayFlow> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.aqua} stopOpacity={0.4} /><stop offset="100%" stopColor={C.aqua} stopOpacity={0} /></linearGradient>
          <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.good} stopOpacity={0.35} /><stop offset="100%" stopColor={C.good} stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid stroke="var(--line-2)" vertical={false} />
        <XAxis dataKey="h" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} interval={3} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 4, color: "var(--ink)", fontSize: 12 }} />
        <Area type="monotone" dataKey="intake" name="Intake" stroke={C.aqua} strokeWidth={2} fill="url(#gi)" animationDuration={1600} />
        <Area type="monotone" dataKey="reused" name="Reused" stroke={C.good} strokeWidth={2} fill="url(#gr)" animationDuration={1900} />
      </AreaChart>
    </ResponsiveContainer>
  );
});

const SIMS: { area: AreaId; id: string; label: string }[] = [
  { area: "process", id: "storm", label: "Storm" },
  { area: "mmm", id: "rain", label: "Heavy rain" },
  { area: "cpg", id: "cip", label: "CIP fault" },
];

export default function Home({ go }: { go: Go }) {
  const t = useTick();
  const flow = useMemo(dayFlow, []);
  const { alarms, scn, setScn } = useStore();
  const critical = alarms.filter((a) => a.sev === "bad").length;
  const perArea = (a: AreaId) => alarms.filter((x) => x.area === a).length;

  return (
    <div className="home">
      <Backdrop src="/process.jpg" />
      <div className="home-in">
        <section className="kpis" aria-label="Key figures">
          {KPIS.map((k, i) => {
            const isAlarm = k.id === "alarms";
            const base = isAlarm ? alarms.length : k.id === "quality" ? 99.2 - 0.5 * critical : k.value;
            const v = base * (isAlarm ? 1 : wobble(t, k.wobble, k.seed));
            const color = isAlarm && alarms.length ? C.warn : C.aqua;
            return (
              <motion.article key={k.id} className="kpi" {...stagger(i)} whileHover={{ y: -3 }}>
                <div className="kpi-top">
                  <span className="kpi-label">{k.label}</span>
                  {isAlarm
                    ? <span className={`delta ${alarms.length ? "down" : "up"}`}>{alarms.length ? `${critical} critical` : "all clear"}</span>
                    : <span className={`delta ${k.good ? "up" : "down"}`}>{k.delta > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{Math.abs(k.delta)}%</span>}
                </div>
                <div className="kpi-val"><b><CountUp value={v} decimals={k.decimals} /></b><span>{k.unit}</span></div>
                <div className="kpi-note">{isAlarm ? (alarms.length ? "pick a tab to see where" : "all three areas normal") : k.note}</div>
                <div className="kpi-spark"><Spark seed={k.seed} color={color} /></div>
              </motion.article>
            );
          })}
        </section>

        <section className="seg-row" aria-label="Views">
          {SEGMENTS.map((s, i) => {
            const n = perArea(s.id);
            return (
              <motion.button key={s.id} className="seg-card" onClick={() => go(s.id)} {...stagger(i + 6)} whileHover={{ y: -4 }}>
                <img src={s.img} alt="" />
                <div className="seg-shade" />
                <span className={`seg-alert ${n ? "on" : ""}`}>{n ? `${n} alarm${n > 1 ? "s" : ""}` : "all clear"}</span>
                <div className="seg-body">
                  <span className="seg-tag">{s.tag}</span>
                  <h3>{s.title}</h3>
                  <p>{s.blurb}</p>
                  <div className="seg-stats">{s.stat.map((x) => <div key={x.u}><b>{x.v}</b><span>{x.u}</span></div>)}</div>
                  <span className="seg-go">Open <ArrowRight size={14} /></span>
                </div>
              </motion.button>
            );
          })}
        </section>

        <section className="two">
          <motion.div className="card" {...stagger(9)}>
            <div className="card-h">
              <div><h3>Water balance, last 24 hours</h3><p>m³ per hour taken in and reused on site</p></div>
              <div className="legend"><span><i style={{ background: C.aqua }} />Intake</span><span><i style={{ background: C.good }} />Reused</span></div>
            </div>
            <div className="chart-h"><Balance data={flow} /></div>
          </motion.div>

          <motion.div className="card" {...stagger(10)}>
            <div className="card-h">
              <div><h3>Needs attention</h3><p>{alarms.length ? `${alarms.length} open across ${AREA_NAME.process}, ${AREA_NAME.mmm} and ${AREA_NAME.cpg}` : "Open alarms across all three areas"}</p></div>
              <button className="link" onClick={() => go("alarms")}>All alarms <ArrowRight size={13} /></button>
            </div>
            {alarms.length === 0 ? (
              <div className="all-clear">
                <CheckCircle2 size={22} />
                <div className="txt"><b>All systems normal</b><span>Try a scenario and watch the alarms appear:</span></div>
                <div className="sims">
                  {SIMS.map((s) => <button key={s.id} onClick={() => setScn(s.area, s.id)}>{s.label}</button>)}
                </div>
              </div>
            ) : (
              <ul className="alarms">
                {alarms.slice(0, 3).map((a) => (
                  <li key={a.id} onClick={() => go(a.area)} className="click">
                    <span className={`al-ico ${a.sev}`}><AlertTriangle size={16} /></span>
                    <div><b>{a.title}</b><span>{a.where}</span></div>
                    <em>{a.value}</em>
                  </li>
                ))}
              </ul>
            )}
            {Object.values(scn).some((s) => s !== "normal") && alarms.length > 3 && <p className="more">+ {alarms.length - 3} more in Alarms</p>}
          </motion.div>
        </section>
      </div>
    </div>
  );
}
