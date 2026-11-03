import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt } from "./farm";
import { FRESH_VALUE, gwDay, reuseYtd, TREAT_COST } from "./grey";
import { CountUp, Panel, Tip } from "./ui";

/** Grey Water · Reuse & savings: three plain answers (how much is reused, what it saves, where today's water goes) and one chart */
export default function GreyReuse() {
  const day = useMemo(() => gwDay(), []);
  const ytd = useMemo(() => reuseYtd(), []);
  const made = ytd.reduce((s, m) => s + m.gen, 0);
  const reused = ytd.reduce((s, m) => s + m.reused, 0);
  const rate = (reused / made) * 100;
  const saved = reused * FRESH_VALUE, cost = reused * TREAT_COST, net = saved - cost;
  const more = made * 0.96 - reused;
  const uses = [
    { n: "Landscape", v: day.landscape, c: "var(--water)" },
    { n: "Farm fodder", v: day.farm, c: "var(--teal)" },
    { n: "Overflow", v: day.overflow, c: "var(--bad)" },
  ];
  const top = Math.max(day.gen, ...uses.map((u) => u.v), 1);
  return (
    <div className="vw gr">
      <div className="en-cards">
        <section className="big-card" style={{ ["--c" as string]: "var(--teal)" }}>
          <h3>Grey water reused this year</h3>
          <b><CountUp value={rate} decimals={0} /><small>% of what is made</small></b>
          <p>{fmt(reused)} of {fmt(made)} m³ went back to the gardens and the farm instead of down the drain.</p>
        </section>
        <section className="big-card" style={{ ["--c" as string]: "var(--good)" }}>
          <h3>Money saved this year</h3>
          <b><CountUp value={net / 1000} decimals={0} /><small>k LE</small></b>
          <p>Fresh water not pumped is worth {fmt(saved / 1000)} k LE. Treating the grey water cost {fmt(cost / 1000)} k LE.</p>
        </section>
        <section className="big-card" style={{ ["--c" as string]: "var(--water)" }}>
          <h3>Today</h3>
          <b><CountUp value={day.gen} decimals={0} /><small>m³ made</small></b>
          <p>{fmt(day.landscape + day.farm)} m³ was reused and {fmt(day.overflow)} m³ overflowed to the sewer.</p>
        </section>
      </div>

      <Panel title="Made and reused, month by month" className="gr-year" i={1}
        right={<span className="pm-leg"><span className="key"><i style={{ background: "var(--muted)", opacity: 0.6 }} />Made</span><span className="key"><i style={{ background: "var(--teal)" }} />Reused</span></span>}>
        <div className="chart">
          <ResponsiveContainer>
            <BarChart data={ytd} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={3}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="t" stroke="var(--muted)" fontSize={13} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted)" fontSize={13} tickLine={false} axisLine={false} width={56} tickCount={5} />
              <Tooltip content={<Tip unit="m³" />} cursor={{ fill: "var(--tint)" }} />
              <Bar dataKey="gen" name="Made" fill="var(--muted)" fillOpacity={0.55} barSize={16} isAnimationActive animationDuration={900} />
              <Bar dataKey="reused" name="Reused" fill="var(--teal)" barSize={16} isAnimationActive animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="how">Cubic metres per month. The green bar is almost as tall as the grey one, so very little is wasted.</p>
      </Panel>

      <Panel title="Where today's water goes" className="gr-split" i={2}>
        <ul className="uses">
          {uses.map((u) => (
            <li key={u.n}>
              <span>{u.n}</span><b>{fmt(u.v)} <small>m³</small></b>
              <div className="bar"><i style={{ width: `${(u.v / top) * 100}%`, background: u.c }} /></div>
            </li>
          ))}
        </ul>
        <p className="tip-box"><b>Reuse a little more.</b> Raising the reuse rate to 96% would save about {fmt((more * (FRESH_VALUE - TREAT_COST)) / 1000, 1)} k LE a year. Sample prices.</p>
      </Panel>
    </div>
  );
}
