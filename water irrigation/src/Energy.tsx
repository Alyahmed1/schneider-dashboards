import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { budget, energyToday, FARM, fmt, loadProfile, monthly, TARIFF } from "./farm";
import { useTick, wobble } from "./live";
import { CountUp, Panel, Tip } from "./ui";

const BAND_C: Record<string, string> = { "Off-peak": "var(--good)", Standard: "var(--water)", Peak: "var(--warn)" };

/** Water & energy: three plain answers (water against the yearly limit, what the electricity costs today, what you could save) and two charts */
export default function Energy() {
  const t = useTick();
  const lp = useMemo(() => loadProfile(), []);
  const en = useMemo(() => energyToday(), []);
  const mo = useMemo(() => monthly(), []);
  const bud = useMemo(() => budget(), []);
  const usedM = bud.used / 1e6;
  const onTrack = bud.pct <= bud.yearGone;
  return (
    <div className="vw en">
      <div className="en-cards">
        <section className="big-card" style={{ ["--c" as string]: "var(--water)" }}>
          <h3>Water used this year</h3>
          <b><CountUp value={usedM} decimals={1} /><small>M m³ of {fmt(FARM.allocation / 1e6)} M allowed</small></b>
          <div className="meter" role="img" aria-label={`${fmt(bud.pct)}% of the yearly water allowance used, ${bud.yearGone}% of the year gone`}>
            <i style={{ width: `${bud.pct}%` }} /><u style={{ left: `${bud.yearGone}%` }} />
          </div>
          <p>{fmt(bud.pct)}% used and {bud.yearGone}% of the year gone. {onTrack ? "You are on track." : "You are using water faster than planned."}</p>
        </section>
        <section className="big-card" style={{ ["--c" as string]: "var(--amber)" }}>
          <h3>Electricity today</h3>
          <b><CountUp value={wobble(en.cost, 2, t, 0.004)} decimals={0} /><small>LE</small></b>
          <p>{fmt(wobble(en.kwh, 1, t, 0.004))} kWh at an average of {fmt(en.avgRate, 2)} LE per kWh. Pumping uses almost all of it.</p>
        </section>
        <section className="big-card" style={{ ["--c" as string]: "var(--good)" }}>
          <h3>You could save</h3>
          <b><CountUp value={en.shiftSaving} decimals={0} /><small>LE a day</small></b>
          <p>{fmt(en.peakShare * 100)}% of the pumping happens at the dearest hours (17:00 to 22:00). Moving half of it to the night saves about {fmt((en.shiftSaving * 365) / 1000)} k LE a year.</p>
        </section>
      </div>

      <Panel title="When the pumps use power today" className="en-load" i={1}
        right={<span className="pm-leg">{TARIFF.slice(0, 3).map((b, i) => <span key={i} className="key"><i style={{ background: BAND_C[b.name] }} />{b.name} {fmt(b.rate, 2)} LE</span>)}</span>}>
        <div className="chart">
          <ResponsiveContainer>
            <BarChart data={lp} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="h" stroke="var(--muted)" fontSize={13} tickLine={false} axisLine={false} interval={2} tickFormatter={(v: number) => `${String(v).padStart(2, "0")}:00`} />
              <YAxis stroke="var(--muted)" fontSize={13} tickLine={false} axisLine={false} width={64} tickCount={5} unit=" kW" />
              <Tooltip content={<Tip unit="kW" />} cursor={{ fill: "var(--tint)" }} />
              <Bar dataKey="kw" name="Power" isAnimationActive animationDuration={900}>
                {lp.map((p) => <Cell key={p.h} fill={BAND_C[p.band]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="how">Each bar is one hour. Orange hours cost the most per kWh, green hours the least.</p>
      </Panel>

      <Panel title="Water used each month" className="en-year" i={2}
        right={<span className="pm-leg"><span className="key"><i style={{ background: "var(--water)" }} />Used</span><span className="key"><i style={{ background: "var(--warn)" }} />Plan</span></span>}>
        <div className="chart">
          <ResponsiveContainer>
            <ComposedChart data={mo} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="t" stroke="var(--muted)" fontSize={13} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted)" fontSize={13} tickLine={false} axisLine={false} width={64} tickCount={5} unit=" k" />
              <Tooltip content={<Tip unit="k m³" />} cursor={{ fill: "var(--tint)" }} />
              <Bar dataKey="used" name="Used" fill="var(--water)" barSize={26} isAnimationActive animationDuration={900} />
              <Line type="monotone" dataKey="plan" name="Plan" stroke="var(--warn)" strokeWidth={3} dot={{ r: 4, fill: "var(--warn)" }} isAnimationActive animationDuration={900} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="how">Thousands of m³ per month. The orange line is the plan; bars under it mean water was saved.</p>
      </Panel>
    </div>
  );
}
