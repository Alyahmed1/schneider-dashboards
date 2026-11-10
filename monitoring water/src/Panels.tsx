import { CalendarClock, Container, Droplet, Droplets, Lock, Moon, Sun, Waves, Waypoints } from "lucide-react";
import { actual, avg, hhmm, planned, type PivotState } from "./model";

/** the three panels of the right column: moisture, storage and water consumption (which replaces the electricity price of the reference) */

export function Moisture({ m, limit, lock, onAdjust }: { m: number[]; limit: number; lock: string; onAdjust: () => void }) {
  const a = Math.round(avg(m));
  return (
    <section className="pn mo" style={{ ["--i" as string]: 1 }}>
      <h3><Droplets className="sym" size={18} />Moisture levels</h3>
      <div className="mo-grid">
        {m.map((v, i) => {
          const r = Math.round(v);
          const lvl = r < limit ? "low" : r < limit + 12 ? "mid" : "ok";
          const Icon = r < limit ? Sun : r >= 50 ? Droplets : Droplet;
          return (
            <div key={i} className="mo-col" title={`M${i + 1}: ${r}%`}>
              <span>M{i + 1}</span>
              <div className="mo-bar"><i className={lvl} style={{ height: `${Math.min(100, (v / 70) * 100)}%`, animationDelay: `${i * 60}ms` }} /><u style={{ bottom: `${(limit / 70) * 100}%` }} /></div>
              <Icon size={16} className={`mo-ic ${lvl}`} />
              <b>{r}%</b>
            </div>
          );
        })}
        <div className="mo-avg"><Droplet size={20} /><span>Avg.</span><b>{a}%</b></div>
      </div>
      <button className="btn" onClick={onAdjust} disabled={!!lock} title={lock}>{lock ? <Lock size={16} /> : <Waypoints size={17} />}Adjust irrigation forecast</button>
    </section>
  );
}

const TANKS = [{ n: "Tank 1", cap: 4000 }, { n: "Tank 2", cap: 3000 }, { n: "Tank 3", cap: 2500 }];
export function Storage({ s, lock, onAdjust }: { s: number[]; lock: string; onAdjust: () => void }) {
  return (
    <section className="pn st" style={{ ["--i" as string]: 2 }}>
      <h3><Container className="sym" size={18} />Storage levels</h3>
      <div className="st-grid">
        {TANKS.map((t, i) => (
          <div key={t.n} className="st-col" title={`${t.n}: ${Math.round(s[i])}%`}>
            <div className="st-tank">
              <i style={{ height: `${s[i]}%`, animationDelay: `${i * 120}ms` }} className={s[i] < 35 ? "low" : ""} />
              <b>{Math.round(s[i])}%</b>
            </div>
            <span>{t.n}</span>
            <em>{Math.round((s[i] / 100) * t.cap).toLocaleString("en-US")} m³</em>
          </div>
        ))}
      </div>
      <button className="btn" onClick={onAdjust} disabled={!!lock} title={lock}>{lock ? <Lock size={16} /> : <Waves size={17} />}Adjust pumping schedule</button>
    </section>
  );
}

const MAXY = 160;
export function Consumption({ p, clock, lock, onAdjust }: { p: PivotState; clock: number; lock: string; onAdjust: () => void }) {
  const pl = planned(p), ac = actual(p, clock);
  const now = Math.floor(clock / 60);
  const used = Math.round(p.usedToday);
  const plan = pl.reduce((s, v) => s + v, 0);
  return (
    <section className="pn wc" style={{ ["--i" as string]: 3 }}>
      <div className="pn-h">
        <h3><Droplets className="sym" size={18} />Water consumption</h3>
        <div className="wc-tot"><b>{used.toLocaleString("en-US")}</b> / {plan.toLocaleString("en-US")} m³</div>
      </div>
      <div className="wc-chart">
        <div className="wc-y">{[MAXY, 120, 80, 40, 0].map((v) => <span key={v}>{v}</span>)}</div>
        <div className="wc-plot">
          <div className="wc-band day" style={{ left: `${(6 / 24) * 100}%`, width: `${(12 / 24) * 100}%` }}><Sun size={16} /></div>
          <div className="wc-band night" style={{ left: 0, width: `${(6 / 24) * 100}%` }}><Moon size={16} /></div>
          <div className="wc-band night" style={{ left: `${(18 / 24) * 100}%`, width: `${(6 / 24) * 100}%` }}><Moon size={16} /></div>
          <div className="wc-bars">
            {pl.map((v, h) => {
              const a = ac[h];
              return (
                <div key={h} className={`wc-col ${h === now ? "now" : ""}`} title={`${String(h).padStart(2, "0")}:00  ${a ?? v} m³/h${a == null ? " (planned)" : ""}`}>
                  {a == null ? <i className="plan" style={{ height: `${(v / MAXY) * 100}%` }} /> : <i className="act" style={{ height: `${(a / MAXY) * 100}%`, animationDelay: `${h * 18}ms` }} />}
                </div>
              );
            })}
          </div>
          <div className="wc-now" style={{ left: `${(clock / 1440) * 100}%` }} title={`Now ${hhmm(clock)}`} />
        </div>
        <div className="wc-x">{["00", "06", "12", "18", "24"].map((t) => <span key={t}>{t}</span>)}</div>
      </div>
      <button className="btn" onClick={onAdjust} disabled={!!lock} title={lock}>{lock ? <Lock size={16} /> : <CalendarClock size={17} />}Adjust schedule</button>
    </section>
  );
}
