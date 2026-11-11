import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { INSIGHT_ICON, MINISTRIES, NATIONAL_KPIS, OUTCOMES, type Go, type Ministry, type MinistryId } from "./data";
import { CountUp } from "./ui";
import EgyptMap from "./EgyptMap";
import MinistryIcon from "./MinistryIcon";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (i: number) => ({ initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.65, delay: 0.1 + i * 0.07, ease } });

function MinistryCard({ m, i, hover, setHover, go }: { m: Ministry; i: number; hover: MinistryId | null; setHover: (id: MinistryId | null) => void; go: Go }) {
  const Insight = INSIGHT_ICON;
  return (
    <motion.button className={`mcard ${hover === m.id ? "hot" : ""}`} style={{ ["--accent" as string]: m.accent, ["--accent2" as string]: m.accent2 }} {...rise(2 + i)} whileHover={{ y: -3 }}
      onClick={() => go("ministry", m.id)} onMouseEnter={() => setHover(m.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(m.id)} onBlur={() => setHover(null)}
      aria-label={`Open ${m.name}`}>
      <header>
        <MinistryIcon m={m} size={40} />
        <h3>{m.name}</h3>
        <ChevronRight size={22} className="m-go" />
      </header>
      <div className="m-tiles">
        {m.tiles.map((t) => {
          const TI = t.icon;
          return (
            <div key={t.label} className="m-tile">
              <span className="m-tile-h"><i className="f-ico"><TI size={14} strokeWidth={2.2} /></i><em>{t.label}</em></span>
              <b>{t.prefix}<CountUp value={t.value} decimals={t.decimals ?? 0} />{t.suffix}{t.unit && <small> {t.unit}</small>}</b>
            </div>
          );
        })}
      </div>
      <div className="m-table" role="table" aria-label={`${m.short} top stations by type`}>
        <div className="m-row head" role="row"><span>Type</span><span>Sites</span><span>Capacity</span><span>{m.colHead}</span></div>
        {m.rows.slice(0, 2).map((r) => {
          const RI = r.icon;
          return (
            <div key={r.label} className="m-row" role="row">
              <span className="m-type"><i className="f-ico sm"><RI size={13} strokeWidth={2.2} /></i>{r.label}</span>
              <b>{r.sites}</b>
              <span className="m-cap">{r.cap}</span>
              <span className="m-use"><u><s style={{ width: `${r.pct}%` }} /></u><em>{r.pct}%</em></span>
            </div>
          );
        })}
      </div>
      <footer><Insight size={14} />{m.insight}</footer>
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
              <span className="kpi-ico" style={{ animationDelay: `${n * 0.4}s` }}><Icon size={34} strokeWidth={1.7} /></span>
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
        <EgyptMap hover={hover} setHover={setHover} onOpen={(id) => go("ministry", id)} />
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
