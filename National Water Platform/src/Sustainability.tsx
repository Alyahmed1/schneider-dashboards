import { motion } from "framer-motion";
import { Cloud, Flame, Leaf, Recycle, Sprout, Sun, Users } from "lucide-react";
import type { Go } from "./data";
import { useWob } from "./live";
import { BarList, Panel, TrendChart, rise } from "./parts";
import { CountUp } from "./ui";
import "./pages.css";

const ease = [0.22, 1, 0.36, 1] as const;

/** half-circle gauge: the arc shows progress to the target, the middle shows the value itself */
function Goal({ value, target, progress, label, tone, icon: Icon }: { value: string; target: string; progress: number; label: string; tone: string; icon: typeof Leaf }) {
  return (
    <motion.div className="su-goal" style={{ ["--tone" as string]: tone }} {...rise(0)}>
      <h4><Icon size={16} /> {label}</h4>
      <div className="wc-semi" style={{ width: 188 }}>
        <svg viewBox="0 0 120 70" aria-hidden>
          <path d="M10 62 A50 50 0 0 1 110 62" className="bg" pathLength={1} />
          <motion.path d="M10 62 A50 50 0 0 1 110 62" className="fg" pathLength={1} initial={{ pathLength: 0 }} animate={{ pathLength: progress / 100 }} transition={{ duration: 1.1, ease }} />
        </svg>
        <b className="su-v">{value}</b>
        <span>Target {target}</span>
      </div>
    </motion.div>
  );
}

/** where today's CO2 savings come from (t/day); they add up to 310 */
const SOURCES = [{ name: "Smart irrigation", v: 120 }, { name: "Water reuse", v: 90 }, { name: "Biogas from sludge", v: 50 }, { name: "Solar pumping", v: 30 }, { name: "Leak repair", v: 20 }];

export default function Sustainability({ go }: { go: Go }) {
  const co2 = Math.round(useWob(310, "su-co2", 0.012, 0));
  const total = SOURCES.reduce((a, s) => a + s.v, 0);
  const tiles = [
    { Icon: Cloud, label: "CO₂ avoided", node: <><CountUp value={co2} /><small>t/day</small></>, sub: "+8% on last month" },
    { Icon: Sprout, label: "Fertilizer made from sludge", node: <><CountUp value={1890} /><small>t/day</small></>, sub: "45% of 4,200 t/day of sludge" },
    { Icon: Flame, label: "Biogas energy", node: <><CountUp value={0.12} decimals={2} /><small>GWh/day</small></>, sub: "14% of the sector's use" },
    { Icon: Users, label: "Water per person", node: <><CountUp value={152} /><small>L/day</small></>, sub: "17.5 M m³/day for 115 M people" },
  ];

  return (
    <motion.div className="pg" style={{ gridTemplateRows: "80px 112px 236px 1fr" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <header className="x-hero">
        <div className="x-hero-t"><h2>Sustainability</h2><p>Are we meeting our green goals? Reuse, efficiency and emissions against the 2030 targets</p></div>
        <div className="x-tools"><button className="x-brief" onClick={() => go("cycle")}><Recycle size={17} /> See the reuse flows</button></div>
      </header>

      <section className="pg-kpis su-tiles" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {tiles.map((t, i) => (
          <motion.div key={t.label} className="pg-kpi good" {...rise(i)}>
            <i className="x-ico"><t.Icon size={19} /></i>
            <span className="t"><em>{t.label}</em><b>{t.node}</b><span className="sub">{t.sub}</span></span>
          </motion.div>
        ))}
      </section>

      <section className="su-goals" aria-label="Goals">
        <Goal icon={Recycle} label="Water reuse" value="23%" target="30%" progress={77} tone="var(--cyan)" />
        <Goal icon={Sprout} label="Irrigation efficiency" value="+15%" target="+20%" progress={75} tone="var(--green)" />
        <Goal icon={Cloud} label="Sector emissions" value="−12%" target="−20%" progress={60} tone="var(--amber)" />
        <Goal icon={Sun} label="Renewable energy share" value="18%" target="35%" progress={51} tone="var(--ac)" />
      </section>

      <div className="pg-grid" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
        <Panel icon={Cloud} title="CO₂ avoided" hint="t per day, last 12 months" i={0}>
          <div className="mp-chart"><TrendChart series={[190, 200, 215, 225, 235, 245, 255, 265, 278, 290, 300, co2]} unit="t/day" decimals={0} color="#34d399" names={["CO₂ avoided", ""]} /></div>
        </Panel>
        <Panel icon={Leaf} title="Where the savings come from" hint={`adds up to ${total} t/day`} i={1}>
          <div className="pg-center"><div style={{ padding: "6px 16px" }}><BarList items={SOURCES.map((s) => ({ name: s.name, value: s.v, label: `${s.v}` }))} max={130} color="linear-gradient(90deg, var(--green), var(--cyan))" /></div></div>
        </Panel>
      </div>

    </motion.div>
  );
}
