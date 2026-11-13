import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { MINISTRIES, NATIONAL_KPIS, OUTCOMES, type Go, type Ministry, type MinistryId } from "./data";
import { CountUp } from "./ui";
import RealMap from "./RealMap";
import MinistryIcon from "./MinistryIcon";
import { Semi } from "./gauges";
import { STATIONS } from "./stations";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (i: number) => ({ initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.65, delay: 0.1 + i * 0.07, ease } });

/** which two headline tiles each ministry card shows (the gauge already covers "in use") */
const PICK: Record<MinistryId, [number, number]> = { mwri: [0, 2], mhuuc: [0, 1], eeaa: [1, 2], moalr: [0, 1] };
function MinistryCard({ m, i, hover, setHover, go }: { m: Ministry; i: number; hover: MinistryId | null; setHover: (id: MinistryId | null) => void; go: Go }) {
  const usePct = Math.round(m.rows.reduce((a, r) => a + r.pct, 0) / m.rows.length);
  const tiles = PICK[m.id].map((n) => m.tiles[n]);
  const mine = STATIONS.filter((s) => s.ministry === m.id);
  const cnt = { good: mine.filter((s) => s.status === "good").length, watch: mine.filter((s) => s.status === "watch").length, bad: mine.filter((s) => s.status === "bad").length };
  return (
    <motion.button className={`mcard ${hover === m.id ? "hot" : ""}`} style={{ ["--accent" as string]: m.accent, ["--accent2" as string]: m.accent2 }} {...rise(2 + i)} whileHover={{ y: -3 }}
      onClick={() => go("ministry", m.id)} onMouseEnter={() => setHover(m.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(m.id)} onBlur={() => setHover(null)}
      aria-label={`Open ${m.name}`}>
      <header>
        <MinistryIcon m={m} size={40} />
        <h3>{m.name}</h3>
        <ChevronRight size={22} className="m-go" />
      </header>
      <div className="m-body">
        <div className="m-gauge"><h6>{m.colHead}</h6><Semi pct={usePct} tone={m.accent} label="average" size={150} /></div>
        <div className="m-two">
          {tiles.map((t) => {
            const TI = t.icon;
            return (
              <div key={t.label} className="m-big">
                <span className="m-big-h"><i className="f-ico"><TI size={15} strokeWidth={2.2} /></i><em>{t.label}</em></span>
                <b>{t.prefix}<CountUp value={t.value} decimals={t.decimals ?? 0} />{t.suffix}{t.unit && <small> {t.unit}</small>}</b>
              </div>
            );
          })}
        </div>
      </div>
      <div className="m-health" aria-label={`${cnt.good} of ${mine.length} stations on the map are on track`}>
        <span className="m-health-t">Stations on the map<b>{cnt.good} of {mine.length} on track</b></span>
        <div className="m-health-bar">
          {cnt.good > 0 && <s className="good" style={{ flexGrow: cnt.good }} />}
          {cnt.watch > 0 && <s className="watch" style={{ flexGrow: cnt.watch }} />}
          {cnt.bad > 0 && <s className="bad" style={{ flexGrow: cnt.bad }} />}
        </div>
      </div>
    </motion.button>
  );
}

export default function Home({ go, wide }: { go: Go; wide: boolean }) {
  const [hover, setHover] = useState<MinistryId | null>(null);
  const [left, right] = [MINISTRIES.filter((_, n) => n % 2 === 0), MINISTRIES.filter((_, n) => n % 2 === 1)];
  // top row = MWRI | MHUUC, second row = EEAA | MoALR, like the reference picture
  return (
    <div className={`home ${wide ? "wide" : ""}`}>
      <motion.section className="kpi-strip" {...rise(0)} aria-label="National key numbers">
        {NATIONAL_KPIS.map((k, n) => {
          const Icon = k.icon;
          return (
            <button key={k.id} className="kpi" style={{ ["--tone" as string]: k.tone }} onClick={() => go("executive")} aria-label={`${k.label}. Open the Executive View`}>
              <span className="kpi-ico" style={{ animationDelay: `${n * 0.4}s` }}><Icon size={40} strokeWidth={1.7} /></span>
              <span className="kpi-t">
                <em>{k.label}</em>
                <b>{k.prefix}<CountUp value={k.value} decimals={k.decimals} /> <small>{k.unit}</small>{k.sub && <i>{k.sub}</i>}</b>
                <span className={`kpi-d ${k.down ? "down" : "up"}`}>{k.down ? <ArrowDown size={13} /> : <ArrowUp size={13} />}{k.delta.startsWith("vs") ? "" : "+"}{k.delta}</span>
              </span>
            </button>
          );
        })}
      </motion.section>

      <div className="col col-l"><MinistryCard m={left[0]} i={0} hover={hover} setHover={setHover} go={go} /><MinistryCard m={left[1]} i={2} hover={hover} setHover={setHover} go={go} /></div>
      <motion.div className="map-col" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.25, ease }}>
        <RealMap hover={hover} setHover={setHover} go={go} wide={wide} />
      </motion.div>
      <div className="col col-r"><MinistryCard m={right[0]} i={1} hover={hover} setHover={setHover} go={go} /><MinistryCard m={right[1]} i={3} hover={hover} setHover={setHover} go={go} /></div>

      <motion.section className="outcomes" {...rise(6)} aria-label="Cross-ministry national outcomes">
        <button className="oc-title" onClick={() => go("performance")}><span>Cross-Ministry<br />National Outcomes</span><ChevronRight size={22} /></button>
        <div className="oc-list">
          {OUTCOMES.map((o) => {
            const Icon = o.icon;
            return <button key={o.id} onClick={() => go("performance")}><Icon size={30} strokeWidth={1.7} /><span>{o.label}</span></button>;
          })}
        </div>
      </motion.section>
    </div>
  );
}
