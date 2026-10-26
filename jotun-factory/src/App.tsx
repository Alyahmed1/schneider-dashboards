import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BellRing, Cog, FlaskConical, LayoutDashboard, Menu, Moon, Sun, Truck, Undo2, Workflow, Wrench, Zap } from "lucide-react";
import { LINES, RANGES, SHIFTS, type Filters, type Line, type Range, type Shift } from "./data";
import { Segmented, Select } from "./ui";
import { LiveCountdown, useAlerts } from "./live";
import type { Go, NavOpts, TabId } from "./nav";
import Overview from "./Overview";
import Process from "./Process";
import Quality from "./Quality";
import Equipment from "./Equipment";
import Maintenance from "./Maintenance";
import Utilities from "./Utilities";
import Logistics from "./Logistics";
import Alerts, { type AlertStatus, type AlertStatusMap } from "./Alerts";

const META: Record<TabId, { label: string; title: string; sub: string; icon: typeof Zap }> = {
  overview: { label: "Overview", title: "Factory overview", sub: "Plant-wide performance at a glance", icon: LayoutDashboard },
  process: { label: "Production process", title: "Production process", sub: "From raw material intake to dispatch, stage by stage", icon: Workflow },
  quality: { label: "Batches & quality", title: "Batches & quality", sub: "QC results, first-pass yield and rework", icon: FlaskConical },
  equipment: { label: "Equipment", title: "Equipment", sub: "Asset health, downtime and maintenance", icon: Cog },
  maintenance: { label: "Maintenance", title: "Maintenance", sub: "Work orders, predicted service and spare parts", icon: Wrench },
  utilities: { label: "Utilities & energy", title: "Utilities & energy", sub: "Power, water, air, steam and emissions", icon: Zap },
  logistics: { label: "Inventory & logistics", title: "Inventory & logistics", sub: "Raw materials, warehouse and dispatch", icon: Truck },
  alerts: { label: "Alerts", title: "Alerts", sub: "Production, quality, equipment, utilities and safety events", icon: BellRing },
};
const GROUPS: { label: string; ids: TabId[] }[] = [
  { label: "Operations", ids: ["overview", "process", "quality", "equipment", "maintenance"] },
  { label: "Resources", ids: ["utilities", "logistics"] },
  { label: "Monitoring", ids: ["alerts"] },
];

const DENSITIES = ["Comfort", "Compact"] as const;

const store = {
  get: (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return <>{now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · {now.toLocaleTimeString("en-GB")}</>;
}

export default function App() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<TabId>("overview");
  const [opts, setOpts] = useState<NavOpts>({});
  const [navKey, setNavKey] = useState(0); // remount a page when it opens with preset filters
  const [range, setRange] = useState<Range>("7D");
  const [line, setLine] = useState<Line>("All lines");
  const [shift, setShift] = useState<Shift>("All shifts");
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => store.get("jotun-theme", "dark"));
  const [density, setDensity] = useState(() => store.get("jotun-density", "comfort"));
  const [status, setStatusMap] = useState<AlertStatusMap>({});
  const [toast, setToast] = useState<string[] | null>(null);
  const done = useMemo(() => new Set(Object.keys(status).filter((k) => status[k] === "done")), [status]);

  useEffect(() => { document.documentElement.dataset.theme = theme; store.set("jotun-theme", theme); }, [theme]);
  useEffect(() => { document.documentElement.dataset.density = density; store.set("jotun-density", density); }, [density]);
  useEffect(() => { // cursor-follow glow on cards
    const move = (e: PointerEvent) => {
      const c = (e.target as HTMLElement | null)?.closest?.(".card") as HTMLElement | null;
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", `${e.clientX - r.left}px`); c.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => document.removeEventListener("pointermove", move);
  }, []);

  const f: Filters = { range, line, shift };
  const alertCount = useAlerts(f).filter((a) => a.sev === "Critical" && !status[a.id]).length;
  const meta = META[tab];

  const setStatus = (ids: string[], s: AlertStatus) => {
    setStatusMap((p) => { const n = { ...p }; ids.forEach((i) => { if (s === "open") delete n[i]; else n[i] = s; }); return n; });
    setToast(s === "done" ? ids : null);
  };
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t); }, [toast]);
  const go: Go = (id, o = {}) => { setTab(id); setOpts(o); setNavKey((k) => k + 1); setOpen(false); window.scrollTo({ top: 0 }); };

  return (
    <div className="shell">
      <div className={`scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Main navigation">
        <div className="brand">
          <img className="brand-logo" src="/logos/jotun-plate.png" alt="Jotun" />
          <div className="brand-cap">Smart Factory · Paint production</div>
        </div>
        {GROUPS.map((g) => (
          <div key={g.label} style={{ display: "grid", gap: 2 }}>
            <div className="nav-label">{g.label}</div>
            {g.ids.map((id) => {
              const M = META[id];
              return (
                <button key={id} className={`nav-item ${tab === id ? "active" : ""}`} onClick={() => go(id)} aria-current={tab === id ? "page" : undefined}>
                  {tab === id && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 480, damping: 38 }} />}
                  <M.icon size={18} /><span>{M.label}</span>
                  {id === "alerts" && alertCount > 0 && <span className="nav-badge">{alertCount}</span>}
                </button>
              );
            })}
          </div>
        ))}
        <div className="side-actions">
          <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle light and dark theme" title="Theme">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
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
              <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
              <div>
                <h1 className="page-title">{meta.title}</h1>
                <p className="page-sub">{meta.sub}</p>
              </div>
            </div>
            <div className="filters">
              <Segmented value={density === "compact" ? "Compact" : "Comfort"} options={DENSITIES} onChange={(v) => setDensity(v.toLowerCase())} label="View density" />
              <Segmented value={range} options={RANGES} onChange={setRange} label="Time range" />
              <Select value={line} options={LINES} onChange={setLine} label="Product line" />
              <Select value={shift} options={SHIFTS} onChange={setShift} label="Shift" />
            </div>
          </div>
        </header>

        <main className="content">
          <AnimatePresence mode="wait">
            <motion.div key={tab + navKey} className="page"
              initial={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(10px)" }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(8px)" }}
              transition={{ duration: 0.22 }}>
              {tab === "overview" && <Overview f={f} go={go} done={done} setStatus={setStatus} />}
              {tab === "process" && <Process f={f} />}
              {tab === "quality" && <Quality f={f} go={go} />}
              {tab === "equipment" && <Equipment f={f} go={go} />}
              {tab === "maintenance" && <Maintenance f={f} go={go} />}
              {tab === "utilities" && <Utilities f={f} initial={opts.util} />}
              {tab === "logistics" && <Logistics f={f} />}
              {tab === "alerts" && <Alerts f={f} status={status} setStatus={setStatus} go={go} initialSev={opts.sev} />}
            </motion.div>
          </AnimatePresence>
          <p className="footer">Data for demonstration · Jotun Smart Factory</p>
          <AnimatePresence>
            {toast && (
              <motion.div className="toast" role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.2 }}>
                <span>{toast.length === 1 ? `${toast[0]} marked done` : `${toast.length} alerts marked done`}</span>
                <button onClick={() => setStatus(toast, "open")}><Undo2 size={14} />Undo</button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
