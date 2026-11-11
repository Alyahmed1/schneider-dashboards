import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, AppWindow, ArrowLeft, CircleCheck, ExternalLink, Gauge, LayoutDashboard, Lightbulb, ListChecks, MapPin, Maximize2, TrendingUp, ArrowUpRight,
} from "lucide-react";
import {
  ATTENTION, MINISTRY_BY_ID, MINISTRY_SCORE, type Go, type MinistryId, type Tile,
} from "./data";
import { MINISTRY_PAGE, statusColor, type Dash, type Site } from "./ministryData";
import { CountUp } from "./ui";
import { SEV_ICON } from "./Header";
import MinistryIcon from "./MinistryIcon";
import { Panel, Ring, StatusChip, TrendChart, ease, rise } from "./parts";
import Operations from "./Ops";

type TabKey = "overview" | "operations" | "sites" | "dashboards";
const TAB_ICON = { overview: LayoutDashboard, operations: Activity, sites: MapPin, dashboards: AppWindow } as const;
const TAB_LABEL: Record<TabKey, string> = { overview: "Overview", operations: "Operations", sites: "Sites", dashboards: "Dashboards" };
const TAB_HINT: Record<TabKey, string> = { overview: "The big picture", operations: "What is happening now", sites: "Every site, one list", dashboards: "Open a live dashboard" };

function TileCard({ t, i }: { t: Tile; i: number }) {
  const Icon = t.icon;
  return (
    <motion.div className="mp-tile" {...rise(i)}>
      <span className="mp-tile-h"><i className="f-ico"><Icon size={15} strokeWidth={2.2} /></i><em>{t.label}</em></span>
      <b>{t.prefix}<CountUp value={t.value} decimals={t.decimals ?? 0} />{t.suffix}{t.unit && <small> {t.unit}</small>}</b>
    </motion.div>
  );
}

function Overview({ id, go }: { id: MinistryId; go: Go }) {
  const m = MINISTRY_BY_ID[id];
  const pg = MINISTRY_PAGE[id];
  const attn = ATTENTION.filter((a) => a.ministry === id);
  const totalSites = m.rows.reduce((n, r) => n + Number(r.sites.replace(/,/g, "")), 0);
  return (
    <div className="mp-over">
      <div className="mp-tiles">{[...m.tiles, ...pg.extra].map((t, i) => <TileCard key={t.label} t={t} i={i} />)}</div>
      <div className="mp-cols">
        <Panel icon={Gauge} title="Stations by type" hint={`${totalSites.toLocaleString("en-US")} sites`} i={0}>
          <ul className="mp-types">
            {m.rows.map((r) => {
              const RI = r.icon;
              return (
                <li key={r.label}>
                  <i className="f-ico big"><RI size={20} strokeWidth={2} /></i>
                  <span className="mp-types-t"><b>{r.label}</b><em>{r.cap}</em></span>
                  <span className="mp-types-n"><b>{r.sites}</b><em>sites</em></span>
                  <span className="mp-types-u"><u><s style={{ width: `${r.pct}%` }} /></u><em>{r.pct}% {m.colHead.toLowerCase()}</em></span>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel icon={TrendingUp} title={pg.trend.title} hint={pg.trend.sub} i={1}>
          <div className="mp-chart"><TrendChart series={pg.trend.series} unit={pg.trend.unit} decimals={pg.trend.decimals} color={m.accent} refLine={pg.trend.ref} names={[pg.trend.title, ""]} /></div>
        </Panel>
        <Panel icon={ListChecks} title="Needs attention" hint={attn.length ? `${attn.length} open` : "all clear"} i={2}>
          <ul className="mp-attn">
            {attn.map((a) => {
              const Icon = SEV_ICON[a.sev];
              return (
                <li key={a.id}><button onClick={() => go("alerts")}><span className={`sev ${a.sev}`}><Icon size={17} /></span><span className="x-attn-t"><b>{a.title}</b><em>{a.detail}</em></span></button></li>
              );
            })}
            {!attn.length && <li className="mp-clear"><CircleCheck size={18} /> No open alerts for this ministry</li>}
            {pg.insights.map((t) => <li key={t} className="mp-insight"><i className="x-ico sm"><Lightbulb size={15} strokeWidth={2} /></i><p>{t}</p></li>)}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Sites({ id, openDash }: { id: MinistryId; openDash: (d: string) => void }) {
  const pg = MINISTRY_PAGE[id];
  const types = useMemo(() => ["All", ...Array.from(new Set(pg.sites.map((s) => s.type)))], [pg]);
  const [type, setType] = useState("All");
  const rows: Site[] = pg.sites.filter((s) => type === "All" || s.type === type);
  const hasDash = (d?: string) => !!d && pg.dashboards.some((x) => x.id === d);
  return (
    <div className="mp-sites">
      <div className="mp-chips" role="group" aria-label="Filter by type">
        {types.map((t) => (
          <button key={t} className={type === t ? "on" : ""} aria-pressed={type === t} onClick={() => setType(t)}>
            {t}<em>{t === "All" ? pg.sites.length : pg.sites.filter((s) => s.type === t).length}</em>
          </button>
        ))}
      </div>
      <Panel icon={MapPin} title="Sites" hint={`${rows.length} shown`} i={0}>
        <div className="mp-table" role="table">
          <div className="mp-tr head" role="row"><span>Site</span><span>Type</span><span>Governorate</span><span>Capacity</span><span>In use</span><span>Status</span><span /></div>
          <div className="mp-tbody">
            {rows.map((s) => (
              <div key={s.name} className="mp-tr" role="row">
                <b>{s.name}</b><span>{s.type}</span><span>{s.gov}</span><span>{s.cap}</span>
                <span className="m-use"><u><s style={{ width: `${s.load}%`, background: statusColor(s.status) }} /></u><em>{s.load}%</em></span>
                <StatusChip status={s.status} />
                {hasDash(s.dash) ? <button className="mp-open" onClick={() => openDash(s.dash!)} aria-label={`Open the dashboard for ${s.name}`}><ArrowUpRight size={16} /> Dashboard</button> : <span />}
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Embed({ d, onBack }: { d: Dash; onBack: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <motion.div className="mp-embed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="mp-embed-bar">
        <button onClick={onBack}><ArrowLeft size={16} /> All dashboards</button>
        <b>{d.title}</b>
        <span className="mp-url">{d.url.replace("https://", "")}</span>
        <a href={d.url} target="_blank" rel="noopener noreferrer"><Maximize2 size={15} /> Open in full screen</a>
      </div>
      <div className="mp-frame">
        {!loaded && <div className="mp-loading"><span /> Loading {d.title}…</div>}
        <iframe src={d.url} title={d.title} allow="fullscreen" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} />
      </div>
    </motion.div>
  );
}

function Dashboards({ id, embed, setEmbed, goOps }: { id: MinistryId; embed: string | null; setEmbed: (d: string | null) => void; goOps: () => void }) {
  const m = MINISTRY_BY_ID[id];
  const list = MINISTRY_PAGE[id].dashboards;
  const cur = list.find((d) => d.id === embed);
  if (cur) return <Embed d={cur} onBack={() => setEmbed(null)} />;
  if (!list.length) {
    return (
      <div className="mp-empty">
        <i><AppWindow size={34} strokeWidth={1.6} /></i>
        <h3>No separate dashboard yet</h3>
        <p>The live boards for this ministry are built into the platform. Open Operations to see them.</p>
        <button onClick={goOps}><Activity size={16} /> Open Operations</button>
      </div>
    );
  }
  return (
    <div className={`mp-dash n${list.length}`}>
      {list.map((d, i) => {
        const Icon = d.icon;
        return (
          <motion.article key={d.id} className="mp-card" style={{ ["--accent" as string]: m.accent, ["--accent2" as string]: m.accent2 }} {...rise(i)} whileHover={{ y: -4 }}>
            <i className="mp-card-ico"><Icon size={34} strokeWidth={1.8} /></i>
            <h3>{d.title}</h3>
            <p>{d.blurb}</p>
            <div className="mp-tags">{d.tags.map((t) => <span key={t}>{t}</span>)}</div>
            <div className="mp-card-btns">
              <button className="primary" onClick={() => setEmbed(d.id)}><AppWindow size={16} /> Open here</button>
              <a href={d.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> New tab</a>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}

export default function Ministry({ id, go }: { id: MinistryId; go: Go }) {
  const m = MINISTRY_BY_ID[id];
  const pg = MINISTRY_PAGE[id];
  const sc = MINISTRY_SCORE[id];
  const tabs: TabKey[] = ["overview", "operations", "sites", "dashboards"];
  const [tab, setTab] = useState<TabKey>("overview");
  const [embed, setEmbed] = useState<string | null>(null);
  const openDash = (d: string) => { setEmbed(d); setTab("dashboards"); };
  return (
    <motion.div className="mp" style={{ ["--accent" as string]: m.accent, ["--accent2" as string]: m.accent2 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <header className="mp-head" style={{ backgroundImage: `linear-gradient(90deg, rgba(10,8,44,.96) 28%, rgba(10,8,44,.55)), url(${m.photo})` }}>
        <MinistryIcon m={m} size={56} />
        <div className="mp-head-t"><h2>{m.name}</h2><p>{pg.tagline}</p></div>
        <button className="mp-back" onClick={() => go("ministries")}><ArrowLeft size={15} /> All ministries</button>
        <div className="mp-score"><StatusChip status={sc.status} /><Ring value={sc.score} status={sc.status} size={54} /></div>
      </header>

      <div className="mp-tabs" role="tablist" aria-label="Ministry sections">
        {tabs.map((t) => {
          const Icon = TAB_ICON[t];
          return (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => { setTab(t); if (t !== "dashboards") setEmbed(null); }}>
              <Icon size={16} /><span className="mp-tab-t"><b>{TAB_LABEL[t]}</b><small>{TAB_HINT[t]}</small></span>{t === "dashboards" && pg.dashboards.length > 0 && <em>{pg.dashboards.length}</em>}
            </button>
          );
        })}
      </div>

      <div className="mp-body">
        <AnimatePresence mode="wait">
          <motion.div key={`${tab}-${embed ?? ""}`} className="mp-pane" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease }}>
            {tab === "overview" && <Overview id={id} go={go} />}
            {tab === "operations" && <Operations id={id} />}
            {tab === "sites" && <Sites id={id} openDash={openDash} />}
            {tab === "dashboards" && <Dashboards id={id} embed={embed} setEmbed={setEmbed} goOps={() => setTab("operations")} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
