import { useMemo } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Leaf, Target } from "lucide-react";
import { BUCKET, compact, qualityOk, rng, type Filters, type Kpi } from "./data";
import { CHEMICALS, co2Series, GOALS, goalProgress, GRID_CO2, MARINE, PLANT_KW, areaShare } from "./step3";
import { axis, C, Card, Chip, CountUp, gridProps, KpiCard, Legend, Replay, rise } from "./ui";
import { useTick, wobble } from "./live";

export default function Sustainability({ f }: { f: Filters }) {
  const t = useTick();
  const k = areaShare(f);
  const series = useMemo(() => co2Series(f), [f]);
  const grid = series.reduce((s, p) => s + p.grid, 0);
  const avoided = series.reduce((s, p) => s + p.avoided, 0);
  const sp = (seed: number, base: number) => { const r = rng(seed); return Array.from({ length: 14 }, () => base * (0.94 + r() * 0.12)); };
  const brine = wobble(6120 * k, 8, t, 0.004);
  const kpis: Kpi[] = [
    { id: "co2m3", label: "CO₂ per m³", value: wobble(1.06, 1, t, 0.004), decimals: 2, unit: "kg/m³", delta: -3.2, goodWhenDown: true, note: `grid ${GRID_CO2} kg per kWh`, spark: sp(1, 1.06) },
    { id: "ren", label: "Solar share", value: wobble(25.9, 2, t, 0.006), decimals: 1, unit: "%", delta: 2.1, note: "target 40% by 2028", spark: sp(2, 25.9) },
    { id: "saved", label: "CO₂ avoided by solar", value: avoided, decimals: avoided >= 1000 ? 0 : 1, unit: "tonnes", delta: 5.4, note: "this period", spark: sp(3, 30) },
    { id: "rec", label: "Water recovery", value: wobble(45.2, 4, t, 0.003), decimals: 1, unit: "%", delta: 0.8, note: "less brine per m³", spark: sp(4, 45.2) },
    { id: "brine", label: "Brine returned to sea", value: brine, decimals: 0, unit: "m³/h", delta: -0.6, goodWhenDown: true, note: "salinity 68 g/L", spark: sp(5, 6120) },
  ];
  const fmtTon = compact(grid);

  return (
    <>
      <motion.div className="banner slim" {...rise(0)}>
        <img src="/night.jpg" alt="Desalination plant at night beside a calm sea" />
        <div className="banner-text">
          <span className="banner-tag"><Leaf size={13} /> Operating responsibly</span>
          <h2>Cleaner water, every cubic metre</h2>
          <p>{fmtTon} tonnes of CO₂ emitted this period, {compact(avoided)} avoided by solar. All marine limits are met.</p>
        </div>
      </motion.div>

      <div className="grid g-kpi">
        {kpis.map((x, i) => <KpiCard key={x.id} k={x} i={i} hero={i === 0} />)}
      </div>

      <div className="grid g-21">
        <Card title="CO₂ emissions" sub={`Tonnes ${BUCKET[f.range]} · power from the grid vs avoided by solar`} i={1}
          right={<Legend items={[{ name: "From grid", color: "#8aa1a8" }, { name: "Avoided by solar", color: C.sun }]} />}>
          <Replay className="chart-h">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: -6, right: 6, top: 8 }}>
                <defs>
                  <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8aa1a8" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#8aa1a8" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="sG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.sun} stopOpacity={0.65} />
                    <stop offset="100%" stopColor={C.sun} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} width={44} tickFormatter={(v: number) => compact(v)} />
                <Tooltip cursor={{ stroke: C.teal, strokeOpacity: 0.25 }} content={({ active, label, payload }) => active && payload?.length ? (
                  <div className="tip"><div className="tip-t">{label}</div>{payload.map((p) => <div key={String(p.name)} className="tip-r"><i style={{ background: p.color }} />{p.name}<b>{Number(p.value).toFixed(1)} t</b></div>)}</div>
                ) : null} />
                <Area type="monotone" stackId="c" dataKey="grid" name="From grid" stroke="#8aa1a8" strokeWidth={2} fill="url(#gG)" animationDuration={1200} />
                <Area type="monotone" stackId="c" dataKey="avoided" name="Avoided by solar" stroke={C.sun} strokeWidth={2} fill="url(#sG)" animationDuration={1300} />
              </AreaChart>
            </ResponsiveContainer>
          </Replay>
          <p className="foot-note">Plant demand is about {compact(PLANT_KW * k)} kW. Every kWh that comes from the sun instead of the grid saves {GRID_CO2} kg of CO₂.</p>
        </Card>

        <Card title="Our goals" sub="Progress from the 2024 starting point" i={2}>
          <ul className="goals">
            {GOALS.map((g, n) => {
              const p = goalProgress(g);
              return (
                <li key={g.name}>
                  <div className="g-top"><b>{g.name}</b><span><Target size={12} /> {g.target} {g.unit} by {g.year}</span></div>
                  <div className="bar big"><motion.i initial={{ width: 0 }} whileInView={{ width: `${p}%` }} viewport={{ once: false }} transition={{ duration: 1, delay: n * 0.12, ease: "easeOut" }} style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.aqua})` }} /></div>
                  <div className="g-bot"><span>Now <b><CountUp value={g.now} decimals={g.digits} /> {g.unit}</b></span><em><CountUp value={p} />% there</em></div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid g-12">
        <Card title="Sea water protection" sub="Brine outfall readings against the permit" i={3}
          right={<Chip tone={MARINE.every(qualityOk) ? "good" : "bad"}>{MARINE.every(qualityOk) ? "All within permit" : "Check outfall"}</Chip>}>
          <ul className="bench qual">
            {MARINE.map((q, n) => {
              const v = wobble(q.value, n + 11, t, 0.01);
              const pos = Math.max(2, Math.min(98, ((v - q.min) / (q.max - q.min)) * 100));
              const ok = qualityOk({ ...q, value: v });
              const oneSided = q.min === 0;
              return (
                <motion.li key={q.name} {...rise(n)}>
                  <div className="b-name"><b>{q.name}</b><small>{oneSided ? `allowed up to ${q.max} ${q.unit}` : `allowed ${q.min} to ${q.max} ${q.unit}`}</small></div>
                  <div className="b-track" role="img" aria-label={`${q.name}: ${v.toFixed(q.digits)} ${q.unit}, ${ok ? "within" : "outside"} the permit`}>
                    <span className="b-zone" style={{ background: oneSided ? "linear-gradient(90deg, #dcf1e4 0%, #dcf1e4 68%, #fbf0c2 88%, #fde6e9 100%)" : "linear-gradient(90deg, #fde6e9, #fbf0c2 16%, #dcf1e4 34%, #dcf1e4 66%, #fbf0c2 84%, #fde6e9)" }} />
                    <span className="q-end l">{q.min}</span>
                    <span className="q-end r">{q.max}</span>
                    <motion.span className="b-us" initial={{ left: "2%" }} whileInView={{ left: `${pos}%` }} viewport={{ once: false }} transition={{ duration: 1.1, delay: n * 0.06, ease: [0.22, 1, 0.36, 1] }} style={{ borderColor: ok ? C.good : C.bad }} />
                  </div>
                  <div className="b-val"><b><CountUp value={v} decimals={q.digits} /></b><small>{q.unit}</small></div>
                  <Chip tone={ok ? "good" : "bad"}>{ok ? "Within limit" : "Out of limit"}</Chip>
                </motion.li>
              );
            })}
          </ul>
        </Card>

        <Card title="Chemicals used" sub="Grams per m³ of water, against target" i={4}>
          <ul className="chems">
            {CHEMICALS.map((c, n) => {
              const used = wobble(c.use, n + 21, t, 0.01);
              const over = used > c.target;
              return (
                <li key={c.name}>
                  <span>{c.name}</span>
                  <div className="bar"><motion.i initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, (used / (c.target * 1.25)) * 100)}%` }} viewport={{ once: false }} transition={{ duration: 0.8, delay: n * 0.07 }} style={{ background: over ? C.warn : C.teal }} /><s style={{ left: `${(1 / 1.25) * 100}%` }} title={`Target ${c.target}`} /></div>
                  <b><CountUp value={used} decimals={1} /> <em>g</em></b>
                </li>
              );
            })}
          </ul>
          <p className="foot-note">The tick on each bar marks the target.</p>
        </Card>
      </div>
    </>
  );
}
