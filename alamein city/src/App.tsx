import { Suspense, lazy, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Building2, Car, FileSpreadsheet, Gauge, Map as MapIcon, Moon, Recycle, ShieldCheck, Sun, Users, Zap, type LucideIcon } from "lucide-react";
import { TAB_LABEL, ZONES, type TabId } from "./data";
import { useFilters, type Range, type ZoneFilter } from "./state";
import Cover from "./Cover";
import Overview from "./Overview";
import ErrorBoundary from "./ErrorBoundary";
import { Seg } from "./ui";

const MasterPlan = lazy(() => import("./MasterPlan"));
const Utilities = lazy(() => import("./Utilities"));
const Mobility = lazy(() => import("./Mobility"));
const Environment = lazy(() => import("./Environment"));
const Citizens = lazy(() => import("./Citizens"));
const Security = lazy(() => import("./Security"));
const Scope = lazy(() => import("./Scope"));
const Assistant = lazy(() => import("./Assistant"));
const preload = () => [import("./MasterPlan"), import("./Utilities"), import("./Mobility"), import("./Environment"), import("./Citizens"), import("./Security"), import("./Scope"), import("./Assistant")];

export type Theme = "light" | "dark";
const readTheme = (): Theme => { try { return localStorage.getItem("alamein-theme") === "dark" ? "dark" : "light"; } catch { return "light"; } };

const TABS: { id: TabId; icon: LucideIcon }[] = [
  { id: "overview", icon: Gauge }, { id: "plan", icon: MapIcon }, { id: "utilities", icon: Zap }, { id: "mobility", icon: Car }, { id: "environment", icon: Recycle },
  { id: "citizens", icon: Users }, { id: "security", icon: ShieldCheck }, { id: "scope", icon: FileSpreadsheet }, { id: "assistant", icon: Bot },
];
const RANGES: { id: Range; label: string }[] = [{ id: "24h", label: "24 h" }, { id: "7d", label: "7 days" }, { id: "30d", label: "30 days" }];

export default function App() {
  const [entered, setEntered] = useState(false);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [tab, setTab] = useState<TabId>("overview");
  const { zone, setZone, range, setRange } = useFilters();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("alamein-theme", theme); } catch { /* theme just is not remembered */ }
  }, [theme]);
  // the dashboard mounts a moment after "Enter dashboard", so every animation and count-up plays in front of the viewer
  useEffect(() => { const id = window.setTimeout(() => setReady(entered), entered ? 380 : 500); return () => window.clearTimeout(id); }, [entered]);
  useEffect(() => { if (ready) { const id = window.setTimeout(() => { void preload(); }, 500); return () => window.clearTimeout(id); } }, [ready]);
  useEffect(() => { document.title = entered ? `${TAB_LABEL[tab]} · New Alamein City COC` : "New Alamein City COC"; }, [tab, entered]);
  // a link ending in ?tab=scope opens straight on that tab, skipping the cover (handy for screenshots)
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && t in TAB_LABEL) { setTab(t as TabId); setEntered(true); }
  }, []);

  return (
    <div className="app">
      <AnimatePresence>{!entered && <Cover key="cover" onEnter={() => { setTab("overview"); setEntered(true); }} theme={theme} setTheme={setTheme} />}</AnimatePresence>
      {ready && <>
        <motion.div className="chrome" initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          <header className="topbar">
            <button className="brand" onClick={() => setEntered(false)} title="Back to the start screen" aria-label="New Alamein City, back to the start screen">
              <img className="brand-logo schneider" src="/schneider-logo-transparent.png" alt="Schneider Electric" />
              <img className="brand-logo aveva aveva-light" src="/aveva-logo-transparent.png" alt="AVEVA" />
              <img className="brand-logo aveva aveva-dark" src="/aveva-logo-white.png" alt="" aria-hidden />
              <span><b>New Alamein</b><i>City COC</i></span>
            </button>
            <nav className="tabs" aria-label="Sections">
              {TABS.map((t) => (
                <button key={t.id} className={t.id === tab ? "on" : ""} onClick={() => setTab(t.id)} aria-current={t.id === tab ? "page" : undefined} title={TAB_LABEL[t.id]}>
                  <t.icon size={16} /><span>{TAB_LABEL[t.id]}</span>
                </button>
              ))}
            </nav>
            <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </header>
          <div className="filters">
            <span className="crumbs"><Building2 size={13} /> New Alamein City <b>›</b> {TAB_LABEL[tab]}</span>
            <div className="filter-set">
              <label className="select"><span>Zone</span>
                <select value={zone} onChange={(e) => setZone(e.target.value as ZoneFilter)} aria-label="Filter by zone">
                  <option value="all">All city</option>{ZONES.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </label>
              <Seg label="Time range" value={range} options={RANGES} onChange={setRange} />

            </div>
          </div>
        </motion.div>

        <main className="page">
          <AnimatePresence mode="wait">
            <motion.div key={tab} className="page-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <ErrorBoundary key={tab}>
                <Suspense fallback={<div className="loading" aria-busy="true">Loading…</div>}>
                  {tab === "overview" ? <Overview go={setTab} /> : tab === "plan" ? <MasterPlan /> : tab === "utilities" ? <Utilities /> : tab === "mobility" ? <Mobility /> : tab === "environment" ? <Environment />
                    : tab === "citizens" ? <Citizens /> : tab === "security" ? <Security /> : tab === "scope" ? <Scope /> : <Assistant go={setTab} />}
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </>}
    </div>
  );
}
