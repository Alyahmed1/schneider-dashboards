import { useMemo } from "react";
import { motion } from "framer-motion";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { Award, Star } from "lucide-react";
import type { Filters } from "./data";
import { benchmarks, benchScore, benchTone, type Bench } from "./step3";
import { C, Card, Chip, CountUp, Replay, rise, TONE_COLOR } from "./ui";
import { useTick, wobble } from "./live";

const VERDICT = { good: "Near best", info: "Better than average", warn: "Below average", bad: "Behind" } as const;
const SHORT: Record<string, string> = { sec: "Energy", rec: "Recovery", av: "Availability", cost: "Cost", rej: "Rejection", life: "Membrane life", loss: "Water loss", co2: "CO₂" };
/** left = worse, right = better, so the bar always reads the same way */
const place = (b: Bench, v: number) => {
  const span = Math.abs(b.best - b.avg) * 2;
  const worst = b.lowerBetter ? b.avg + span / 2 : b.avg - span / 2;
  const best = b.lowerBetter ? b.avg - span / 2 : b.avg + span / 2;
  return Math.max(2, Math.min(98, ((v - worst) / (best - worst)) * 100));
};

export default function Benchmarks({ f }: { f: Filters }) {
  const t = useTick();
  const rows = useMemo(() => benchmarks(f), [f]);
  const scores = rows.map(benchScore);
  const overall = scores.reduce((s, x) => s + x, 0) / scores.length;
  const ahead = rows.filter((b) => benchScore(b) >= 50).length;
  const radar = rows.map((b, i) => ({ name: SHORT[b.id] ?? b.name, us: Math.round(scores[i]), avg: 50, best: 100 }));
  const gap = [...rows].sort((a, b) => benchScore(a) - benchScore(b))[0];

  return (
    <>
      <div className="grid g-21">
        <Card i={0} className="bench-hero">
          <div className="bh">
            <div className="ring lg" style={{ ["--p" as string]: `${overall}%` }}><b><CountUp value={overall} /></b><span>/100</span></div>
            <div>
              <span className="banner-tag"><Award size={14} /> Overall benchmark score</span>
              <h2>Ahead of the industry on {ahead} of {rows.length} measures</h2>
              <p>50 means the industry average and 100 means the best plant in the world. Biggest gap to close: <b>{gap.name.toLowerCase()}</b>.</p>
              <div className="banner-pills"><Chip tone="good">{overall >= 60 ? "Top third" : "Around average"}</Chip><Chip tone="mute">{f.area}</Chip></div>
            </div>
          </div>
        </Card>

        <Card title="How we compare" sub="Score per measure, 50 = industry average" i={1}
          right={<span className="legend"><span><i style={{ background: C.teal }} />Us</span><span><i style={{ background: "#c2cdd0" }} />Average</span></span>}>
          <Replay className="chart-h">
            <ResponsiveContainer>
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="#e3ded2" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10.5, fill: "#6b8089" }} />
                <Radar dataKey="best" stroke="none" fill="none" />
                <Radar dataKey="avg" name="Average" stroke="#b9c4c7" fill="#c2cdd0" fillOpacity={0.35} animationDuration={900} />
                <Radar dataKey="us" name="Us" stroke={C.teal} strokeWidth={2.2} fill={C.teal} fillOpacity={0.3} animationDuration={1300} />
              </RadarChart>
            </ResponsiveContainer>
          </Replay>
        </Card>
      </div>

      <Card title="Measure by measure" sub="Left is worse, right is better. The dark dot is our plant." i={2}
        right={<span className="legend"><span><i className="mk avg" />Industry average</span><span><i className="mk best" />Best in class</span></span>}>
        <ul className="bench">
          {rows.map((b, n) => {
            const tone = benchTone(b);
            const us = wobble(b.us, n + 5, t, 0.0004);
            return (
              <motion.li key={b.id} {...rise(n)}>
                <div className="b-name"><b>{b.name}</b><small>{b.lowerBetter ? "lower is better" : "higher is better"}</small></div>
                <div className="b-track" role="img" aria-label={`${b.name}: ${b.us.toFixed(b.digits)} ${b.unit}, average ${b.avg}, best ${b.best}`}>
                  <span className="b-zone" style={{ background: `linear-gradient(90deg, #fde6e9, #fbf0c2 50%, #dcf1e4)` }} />
                  <span className="b-mark avg" style={{ left: `${place(b, b.avg)}%` }}><small>{b.avg}</small></span>
                  <span className="b-mark best" style={{ left: `${place(b, b.best)}%` }}><Star size={11} fill="currentColor" /></span>
                  <motion.span className="b-us" initial={{ left: "2%" }} whileInView={{ left: `${place(b, b.us)}%` }} viewport={{ once: false }} transition={{ duration: 1.1, delay: n * 0.06, ease: [0.22, 1, 0.36, 1] }} style={{ borderColor: TONE_COLOR[tone === "info" ? "info" : tone] }} />
                </div>
                <div className="b-val"><b><CountUp value={us} decimals={b.digits} /></b><small>{b.unit}</small></div>
                <Chip tone={tone === "good" ? "good" : tone === "info" ? "info" : "warn"}>{VERDICT[tone]}</Chip>
              </motion.li>
            );
          })}
        </ul>
        <p className="foot-note">Industry figures are typical values for large sea-water RO plants. Replace them with your client's own references when available.</p>
      </Card>
    </>
  );
}
