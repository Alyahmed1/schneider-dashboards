import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Droplets, Hammer, Leaf, Moon, Sun, Waves, Workflow, Zap, Gauge, type LucideIcon } from "lucide-react";
import { AREAS, PLANT, RANGES, type Area, type Filters, type Range } from "./data";
import { Segmented } from "./ui";
import Overview from "./Overview";
import Production from "./Production";
import PlantFlow from "./PlantFlow";
import AlarmsPage from "./AlarmsPage";
import Electrical from "./Electrical";
import Maintenance from "./Maintenance";
import Insights from "./Insights";
import ErrorBoundary from "./ErrorBoundary";
import AvevaMark from "./Aveva";
import Cover from "./Cover";
import { useTick } from "./live";
import AlertsBell from "./AlertsBell";
import UserMenu from "./UserMenu";
import { WORK_ORDERS, type WorkOrder } from "./cmms";

export type TabId = "overview" | "flow" | "alarms" | "production" | "electrical" | "insights" | "maintenance";
export type Go = (tab: TabId, target?: string) => void;
export type Theme = "light" | "dark";

const readTheme = (): Theme => {
  try { return localStorage.getItem("aqua-theme") === "dark" ? "dark" : "light"; } catch { return "light"; }
};

const TABS: { id: TabId; label: string; icon: LucideIcon; sub: string }[] = [
  { id: "overview", label: "Overview", icon: Gauge, sub: "The whole plant at a glance" },
  { id: "flow", label: "Operations", icon: Workflow, sub: "The whole process, sea to network" },
  { id: "production", label: "Production", icon: Waves, sub: "Follow the water from sea to network" },
  { id: "electrical", label: "Electrical", icon: Zap, sub: "Single-line diagram and power use" },
  { id: "insights", label: "Insights", icon: Leaf, sub: "Sustainability, benchmarks and the cost of water" },
  { id: "maintenance", label: "Maintenance", icon: Hammer, sub: "Work orders and asset health (CMMS)" },
];

export default function App() {
  const [entered, setEntered] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("aqua-theme", theme); } catch { /* private window: theme just is not remembered */ }
  }, [theme]);
  // the dashboard mounts a moment after "Enter dashboard", so every animation and count-up plays in front of the viewer
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => { setReady(entered); if (entered) window.scrollTo(0, 0); }, entered ? 380 : 500);
    return () => window.clearTimeout(id);
  }, [entered]);
  const [tab, setTab] = useState<TabId>("overview");
  const [f, setF] = useState<Filters>({ range: "7D", area: "All plant" });
  const [wos, setWos] = useState<WorkOrder[]>(WORK_ORDERS);
  const [stageTarget, setStageTarget] = useState<string | undefined>(undefined);
  // the page layout class follows the tab that is on screen: the old tab keeps its own styles while it fades out
  const [shown, setShown] = useState<TabId>("overview");
  useEffect(() => { if (!ready) setShown(tab); }, [ready, tab]); // no tab is on screen behind the cover, so nothing is fading out
  const go: Go = (to, stage) => { setStageTarget(stage); setTab(to); };
  const tick = useTick();
  const cur = TABS.find((t) => t.id === tab)!;

  return (
    <div className="app">
      <AnimatePresence>{!entered && <Cover key="cover" onEnter={() => { go("overview"); setEntered(true); }} theme={theme} setTheme={setTheme} />}</AnimatePresence>
      {ready && <>
      <motion.header className="topbar" initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <button className="brand" onClick={() => setEntered(false)} title="Back to the start screen" aria-label="AVEVA Smart Water Desalination, back to the start screen">
          <AvevaMark />
          <span className="brand-sep" aria-hidden />
          <span className="brand-mark" aria-hidden><Droplets size={20} /></span>
          <div>
            <b>Smart Water Desalination</b>
            <span>{PLANT.name}</span>
          </div>
        </button>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} className={t.id === tab ? "on" : ""} onClick={() => go(t.id)} aria-current={t.id === tab ? "page" : undefined}>
              <t.icon size={15} />{t.label}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button className="icon-btn theme-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <AlertsBell go={go} />
          <UserMenu go={go} theme={theme} setTheme={setTheme} wos={wos} onStart={() => setEntered(false)} />
        </div>
      </motion.header>

      <main className={`page ${shown === "production" ? "prod" : ""} ${shown === "flow" ? "prod flow" : ""} ${shown === "electrical" ? "prod flow elec" : ""} ${shown === "insights" ? "prod flow ins-page" : ""} ${shown === "overview" ? "prod flow cc-page" : ""} ${shown === "alarms" ? "prod flow al-page" : ""} ${shown === "maintenance" ? "prod flow mt-page" : ""}`}>
        {tab !== "production" && tab !== "flow" && tab !== "electrical" && tab !== "insights" && tab !== "overview" && tab !== "maintenance" && tab !== "alarms" && <div className="page-head">
          <div>
            <h1>{cur.label}</h1>
            <p>{cur.sub}</p>
          </div>
          <div className="filters">
            <Segmented<Range> label="Time range" value={f.range} options={RANGES} onChange={(range) => setF({ ...f, range })} />
            <label className="select">
              <span className="sr">Area</span>
              <select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value as Area })}>
                {AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </label>
          </div>
        </div>}

        <AnimatePresence mode="wait" onExitComplete={() => setShown(tab)}>
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <ErrorBoundary key={tab}>
              {tab === "overview" && <Overview f={{ ...f, area: "All plant" }} setRange={(range) => setF({ ...f, range })} go={go} wos={wos} />}
              {tab === "alarms" && <AlarmsPage go={go} focus={stageTarget} />}
              {tab === "flow" && <PlantFlow f={{ ...f, area: "All plant" }} go={go} t={tick} />}
              {tab === "production" && <Production f={{ ...f, area: "All plant" }} start={stageTarget} />}
              {tab === "electrical" && <Electrical f={{ ...f, area: "All plant" }} />}
              {tab === "insights" && <Insights f={{ ...f, area: "All plant" }} setRange={(range) => setF({ ...f, range })} go={go} />}
              {tab === "maintenance" && <Maintenance f={{ ...f, area: "All plant" }} wos={wos} setWos={setWos} />}
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>
      </>}
    </div>
  );
}
