import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Boxes, Cog, Factory, FlaskConical, LayoutDashboard, Menu, Truck, Workflow, Zap } from "lucide-react";
import { AREAS, RANGES, type Area, type Filters, type Range } from "./data";
import { Segmented } from "./ui";
import { LiveCountdown, useAlerts } from "./live";
import type { Go, NavOpts, TabId } from "./nav";
import Overview from "./Overview";
import Process from "./Process";
import FactoryProcess from "./FactoryProcess";
import Utilities from "./Utilities";
import Quality from "./Quality";
import Equipment from "./Equipment";
import Logistics from "./Logistics";
import Alerts from "./Alerts";

interface TabMeta { label: string; title: string; sub: string; area: boolean }
const META: Record<TabId, TabMeta> = {
  overview: { label: "Overview", title: "Overview", sub: "Plant-wide performance at a glance", area: true },
  process: { label: "Milling Process", title: "Milling Process", sub: "Alumina preparation, stage by stage", area: true },
  factory: { label: "Factory Process", title: "Factory Process", sub: "Carbon plant, potlines, casthouse and dispatch across the whole smelter", area: true },
  alerts: { label: "Alerts", title: "Alerts", sub: "Production, utilities (power and water), quality and equipment alarms", area: true },
  quality: { label: "Quality", title: "Quality", sub: "Metal purity, grades and laboratory results", area: true },
  equipment: { label: "Equipment", title: "Equipment", sub: "Asset health, downtime and maintenance", area: true },
  logistics: { label: "Logistics", title: "Logistics", sub: "Raw materials, stock and shipments", area: false },
  utilities: { label: "Utilities", title: "Utilities", sub: "Power and water supply for the complex", area: true },
};
const MAIN: { id: TabId; icon: typeof Zap }[] = [
  { id: "overview", icon: LayoutDashboard }, { id: "factory", icon: Factory }, { id: "process", icon: Workflow },
  { id: "quality", icon: FlaskConical }, { id: "equipment", icon: Cog }, { id: "logistics", icon: Truck },
  { id: "utilities", icon: Zap }, { id: "alerts", icon: BellRing },
];

type Density = "Comfort" | "Compact";
const DENSITIES: Density[] = ["Comfort", "Compact"];

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return <>{now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · {now.toLocaleTimeString("en-GB")}</>;
}

export default function App() {
  const [tab, setTab] = useState<TabId>("overview");
  const [opts, setOpts] = useState<NavOpts>({});
  const [navKey, setNavKey] = useState(0); // remount a page when it is opened with preset filters
  const [range, setRange] = useState<Range>("7D");
  const [area, setArea] = useState<Area>("All plant");
  const [open, setOpen] = useState(false);
  const [density, setDensity] = useState<Density>(() => {
    try { return localStorage.getItem("density") === "Comfort" ? "Comfort" : "Compact"; } catch { return "Compact"; }
  });
  useEffect(() => {
    document.documentElement.dataset.density = density.toLowerCase();
    try { localStorage.setItem("density", density); } catch { /* storage unavailable */ }
  }, [density]);
  const [done, setDone] = useState<Set<string>>(new Set());

  const meta = META[tab];
  const f: Filters = { range, area: meta.area ? area : "All plant" };
  const allAlerts = useAlerts(f);
  const alertCount = allAlerts.filter((a) => a.sev === "Critical" && !done.has(a.id)).length;

  const markDone = (ids: string[]) => setDone((prev) => new Set([...prev, ...ids]));
  const go: Go = (id, o = {}) => {
    setTab(id); setOpts(o); setNavKey((k) => k + 1); setOpen(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="shell">
      <div className={`scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src="/logos/misr-logo.png" alt="Misr Aluminium logo" />
          <div><div className="brand-name">Misr Aluminium</div><div className="brand-sub">مصر للألومنيوم</div></div>
        </div>
        <div className="nav-label">Dashboards</div>
        {MAIN.map((t) => (
          <button key={t.id} className={`nav-item ${tab === t.id ? "active" : ""}`} onClick={() => go(t.id)}>
            <t.icon size={18} />{META[t.id].label}
            {t.id === "alerts" && alertCount > 0 && <span className="nav-badge">{alertCount}</span>}
          </button>
        ))}

        <div className="side-foot">
          <Boxes size={16} style={{ color: "var(--molten)", marginBottom: 6 }} />
          <b>Nag Hammadi smelter</b>
          3 potlines · 360 pots<br />Capacity 320 kt / year
        </div>
      </aside>

      <div className="main">
        <header className="titlebar">
          <div className="aveva-strip">
            <div className="aveva-left">
              <span className="hide-sm">Industrial Operations Platform</span>
            </div>
            <div className="aveva-right">
              <LiveCountdown />
              <div className="live"><i className="dot" /><Clock /></div>
            </div>
          </div>
          <div className="title-row">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
              <div>
                <h1 className="page-title">{meta.title}</h1>
                <p className="page-sub">{meta.sub}</p>
              </div>
            </div>
            <div className="filters">
              <Segmented value={density} options={DENSITIES} onChange={setDensity} />
              <Segmented value={range} options={RANGES} onChange={setRange} />
              {meta.area && (
                <select className="select" value={area} onChange={(e) => setArea(e.target.value as Area)} aria-label="Plant area">
                  {AREAS.map((a) => <option key={a}>{a}</option>)}
                </select>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          <AnimatePresence mode="wait">
            <motion.div key={tab} className="content" style={{ padding: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {tab === "overview" && <Overview f={f} go={go} done={done} markDone={markDone} />}
              {tab === "process" && <Process f={f} />}
              {tab === "factory" && <FactoryProcess key={navKey} f={f} initialStage={opts.stage} />}
              {tab === "alerts" && <Alerts key={navKey} f={f} done={done} markDone={markDone} initialGroup={opts.group} initialSub={opts.sub} />}
              {tab === "quality" && <Quality f={f} />}
              {tab === "equipment" && <Equipment f={f} />}
              {tab === "logistics" && <Logistics f={f} />}
              {tab === "utilities" && <Utilities key={navKey} f={f} initial={opts.util} />}
            </motion.div>
          </AnimatePresence>
          <p className="footer">Simulated data for demonstration · Misr Aluminium Smart Plant</p>
        </main>
      </div>
    </div>
  );
}
