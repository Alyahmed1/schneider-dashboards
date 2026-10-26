import { useMemo, useState } from "react";
import { useStoryCmd } from "./storytour";
import { Activity, Database, Gauge, HardDrive, ShieldCheck, Smartphone, type LucideIcon } from "lucide-react";
import { CATALOGUE, LAYERS, SERVICES, SOURCES } from "./platformdata";
import type { TabId } from "./data";
import { useTick, wobble } from "./live";
import { CountUp, Panel, REDUCE, fmt, useGrow } from "./ui";

// diagram geometry (viewBox 1100 x 530)
const SRC_X = 10, SRC_W = 156, EDGE_X = [222, 352, 482, 612, 742], CORE_W = 92, SVC_X = 900, SVC_W = 190;
const srcY = (i: number) => 22 + i * 62;
const coreY = 70, coreH = 390, midY = coreY + coreH / 2;
const svcY = (i: number) => 20 + i * 50;
const edgeJoin = (i: number) => coreY + 36 + i * 45;

const dots = (d: string, n: number, dur: number, key: string) => REDUCE ? null : Array.from({ length: n }, (_, k) => (
  <circle key={`${key}${k}`} r="3.4" className="pk"><animateMotion dur={`${dur}s`} begin={`${(k * dur) / n}s`} repeatCount="indefinite" path={d} /></circle>
));

/** Platform: the digital data platform that connects every source to every service */
export default function Platform({ go }: { go: (tab: TabId) => void }) {
  const t = useTick();
  const grow = useGrow(250);
  const [sel, setSel] = useState<string>("lake");
  const [future, setFuture] = useState<Record<string, boolean>>({});
  useStoryCmd((c, a) => {
    if (c === "pf:select" && a) setSel(a);
    else if (c === "pf:future" && a) { setFuture((f) => ({ ...f, [a]: true })); setSel(a); }
  });
  const total = SOURCES.reduce((s, x, i) => s + wobble(x.rate, i + 41, t, 0.01), 0);
  const gb = SOURCES.reduce((s, x) => s + x.gb, 0);
  const services = SERVICES.filter((s) => !s.future || future[s.id]);
  const chosen = useMemo(() => {
    const src = SOURCES.find((s) => s.id === sel), lay = LAYERS.find((l) => l.id === sel), svc = SERVICES.find((s) => s.id === sel);
    return { src, lay, svc };
  }, [sel]);

  const kpis: { icon: LucideIcon; label: string; v: number; d: number; s: string }[] = [
    { icon: Activity, label: "Messages per second", v: total, d: 0, s: "" },
    { icon: HardDrive, label: "New data per day", v: gb, d: 1, s: " GB" },
    { icon: Smartphone, label: "Devices online", v: 4820, d: 0, s: "" },
    { icon: Gauge, label: "API response, p95", v: wobble(84, 2, t, 0.02), d: 0, s: " ms" },
    { icon: ShieldCheck, label: "Data quality", v: 98.6, d: 1, s: "%" },
    { icon: Database, label: "Platform uptime", v: 99.97, d: 2, s: "%" },
  ];

  const onKey = (id: string) => (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(id); } };

  return (
    <div className="pf-grid">
      <div className="ut-kpis">
        {kpis.map((k, i) => (
          <div className="kpi" key={k.label} style={{ ["--n" as string]: i }}>
            <k.icon size={16} /><span>{k.label}</span><b><CountUp value={k.v} decimals={k.d} suffix={k.s} ms={700} /></b>
          </div>
        ))}
      </div>

      <Panel title="From sensor to service" className="pf-diagram" i={0} aside={<span className="loc-tag">reference architecture · sample rates</span>}>
        <div className="pf-scroll"><svg className="pf" viewBox="0 0 1100 530" role="img" aria-label="Data flows from eight sources through edge, stream, data platform, AI models and an API to the city services">
          <g className="pf-cols" aria-hidden>
            <text x={SRC_X} y="12">SOURCES</text><text x={EDGE_X[0]} y="58">PLATFORM</text><text x={SVC_X} y="12">SERVICES</text>
          </g>

          {/* source to edge */}
          {SOURCES.map((s, i) => {
            const d = `M${SRC_X + SRC_W} ${srcY(i) + 22} C${SRC_X + SRC_W + 30} ${srcY(i) + 22}, ${EDGE_X[0] - 30} ${edgeJoin(i)}, ${EDGE_X[0]} ${edgeJoin(i)}`;
            return <g key={s.id} className={`pf-flow ${sel === s.id ? "on" : ""}`}><path d={d} />{dots(d, 1 + Math.round(s.rate / 350), 3.4 - s.rate / 600, s.id)}</g>;
          })}
          {/* the pipeline */}
          {EDGE_X.slice(0, -1).map((x, i) => {
            const d = `M${x + CORE_W} ${midY} L${EDGE_X[i + 1]} ${midY}`;
            return <g key={x} className="pf-flow strong"><path d={d} />{dots(d, 3, 1.6, `c${i}`)}</g>;
          })}
          {/* api to services */}
          {services.map((s, i) => {
            const d = `M${EDGE_X[4] + CORE_W} ${midY} C${EDGE_X[4] + CORE_W + 40} ${midY}, ${SVC_X - 40} ${svcY(i) + 19}, ${SVC_X} ${svcY(i) + 19}`;
            return <g key={s.id} className={`pf-flow ${s.future ? "future" : ""} ${sel === s.id ? "on" : ""}`}><path d={d} />{dots(d, 2, 2.8, s.id)}</g>;
          })}

          {SOURCES.map((s, i) => (
            <g key={s.id} className={`pf-node src ${sel === s.id ? "sel" : ""}`} transform={`translate(${SRC_X} ${srcY(i)})`} tabIndex={0} role="button" aria-label={s.name} aria-pressed={sel === s.id} onClick={() => setSel(s.id)} onKeyDown={onKey(s.id)} style={{ ["--n" as string]: i }}>
              <rect width={SRC_W} height="44" rx="8" /><text x="10" y="19" className="t1">{s.name}</text><text x="10" y="35" className="t2">{fmt(Math.round(wobble(s.rate, i + 41, t, 0.01)))} msg/s</text>
            </g>
          ))}
          {LAYERS.map((l, i) => (
            <g key={l.id} className={`pf-node core ${sel === l.id ? "sel" : ""}`} transform={`translate(${EDGE_X[i]} ${coreY})`} tabIndex={0} role="button" aria-label={l.name} aria-pressed={sel === l.id} onClick={() => setSel(l.id)} onKeyDown={onKey(l.id)} style={{ ["--n" as string]: i + 4 }}>
              <rect width={CORE_W} height={coreH} rx="12" /><text x={CORE_W / 2} y={coreH / 2 - 4} textAnchor="middle" className="t1">{l.short}</text>
              <text x={CORE_W / 2} y={coreH / 2 + 14} textAnchor="middle" className="t2">{l.id === "lake" ? "lake + warehouse" : l.id === "ai" ? "models" : l.id === "api" ? "gateway" : l.id === "bus" ? "bus" : "gateways"}</text>
            </g>
          ))}
          {services.map((s, i) => (
            <g key={s.id} className={`pf-node svc ${s.future ? "future" : ""} ${sel === s.id ? "sel" : ""}`} transform={`translate(${SVC_X} ${svcY(i)})`} tabIndex={0} role="button" aria-label={s.name} aria-pressed={sel === s.id} onClick={() => setSel(s.id)} onKeyDown={onKey(s.id)} style={{ ["--n" as string]: i + 9 }}>
              <rect width={SVC_W} height="38" rx="8" /><text x="12" y="24" className="t1">{s.name}</text>
            </g>
          ))}
        </svg></div>
        <p className="map-note">Packets are drawn in proportion to each source's rate. Click any box to see what it carries.</p>
      </Panel>

      <div className="side">
        <Panel title={chosen.src?.name ?? chosen.lay?.name ?? chosen.svc?.name ?? "Details"} i={1}>
          {chosen.src && <div className="pf-detail">
            <p>{chosen.src.sub}.</p>
            <div className="zd-tiles">
              <div><b>{fmt(Math.round(wobble(chosen.src.rate, SOURCES.indexOf(chosen.src) + 41, t, 0.01)))}</b><span>messages / s</span></div>
              <div><b>{chosen.src.gb}</b><span>GB per day</span></div>
              <div><b>{chosen.src.latency}</b><span>to the platform</span></div>
              <div><b>{chosen.src.quality}%</b><span>data quality</span></div>
            </div>
            <p className="why"><b>Protocol:</b> {chosen.src.proto}. <b>Feeds:</b></p>
            <div className="zd-serves">{chosen.src.feeds.map((f) => <button key={f} className="chip" onClick={() => go(f)}>{f === "home" ? "Home" : f[0].toUpperCase() + f.slice(1)}</button>)}</div>
          </div>}
          {chosen.lay && <div className="pf-detail"><p>{chosen.lay.does}</p><p className="why"><b>How it could be built:</b> {chosen.lay.tech}.</p></div>}
          {chosen.svc && <div className="pf-detail"><p>{chosen.svc.text}</p>{chosen.svc.tab ? <button className="primary" onClick={() => go(chosen.svc!.tab!)}>Open {chosen.svc.name}</button> : <p className="why">A future service: it plugs into the City API and reads the same data, with no new pipeline.</p>}</div>}
        </Panel>

        <Panel title="Plug in a future service" i={2}>
          <p className="pf-hint">The brief's platform "enables future city services". Switch one on and watch it connect to the same API.</p>
          <div className="zd-serves">
            {SERVICES.filter((s) => s.future).map((s) => (
              <button key={s.id} className={`chip ${future[s.id] ? "on" : ""}`} aria-pressed={!!future[s.id]} onClick={() => { setFuture((f) => ({ ...f, [s.id]: !f[s.id] })); setSel(s.id); }}>{s.name}</button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Data catalogue" className="pf-cat" i={3} aside={<span className="loc-tag">one definition of every dataset</span>}>
        <div className="cat" role="table">
          <div className="cat-row head" role="row"><span>Dataset</span><span>Source</span><span>Rows per day</span><span>Freshness</span><span>Quality</span><span>Used by</span></div>
          {CATALOGUE.map((c, i) => {
            const fresh = wobble(c.fresh, i + 71, t, 0.05);
            const tone = c.fresh > 3600 ? "good" : fresh < 5 ? "good" : fresh < 10 ? "warn" : "bad";
            return (
              <div className="cat-row" role="row" key={c.name}>
                <span className="nm"><b>{c.name}</b></span><span>{c.source}</span>
                <span>{c.rows >= 1 ? `${c.rows.toFixed(1)} M` : c.rows >= 0.001 ? `${Math.round(c.rows * 1000)} k` : "static"}</span>
                <span className={`pill ${tone}`}>{c.fresh > 3600 ? "daily" : `${fresh.toFixed(1)} s`}</span>
                <span className="hb"><em><u style={{ width: grow ? `${c.quality}%` : 0, background: c.quality > 98 ? "var(--good)" : "var(--warn)" }} /></em>{c.quality}</span>
                <span>{c.used}</span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
