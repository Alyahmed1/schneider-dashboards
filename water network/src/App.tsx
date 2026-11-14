import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Map as MapIcon, Hammer, Moon, Sun, Waves, Workflow, Zap, Gauge, type LucideIcon } from "lucide-react";
import { AREAS, RANGES, type Area, type Filters, type Range } from "./data";
import { Segmented } from "./ui";
import Home from "./Home";
import NetworkMap from "./NetworkMap";
import Assistant, { type MapPreset } from "./Assistant";
import Production from "./Production";
import Overview from "./Overview";
import AlarmsPage from "./AlarmsPage";
import Electrical from "./Electrical";
import Maintenance from "./Maintenance";
import ErrorBoundary from "./ErrorBoundary";
import Cover from "./Cover";
import { useTick } from "./live";
import AlertsBell from "./AlertsBell";
import UserMenu from "./UserMenu";
import { WORK_ORDERS, type WorkOrder } from "./cmms";
import { otherHref, otherUrl, ownsTab, readDeepLink, SITE } from "./site";
import "./site.css";

export type TabId = "home" | "network" | "overview" | "alarms" | "production" | "electrical" | "maintenance";
export type Go = (tab: TabId, target?: string) => void;
export type Theme = "light" | "dark";

// opened from the other website: skip the start screen and land on the tab that was asked for
const LINK = readDeepLink();

const readTheme = (): Theme => {
  if (LINK?.theme) return LINK.theme;
  try { return localStorage.getItem("wn-theme") === "light" ? "light" : "dark"; } catch { return "dark"; }
};

const ALL_TABS: { id: TabId; label: string; icon: LucideIcon; sub: string }[] = [
  { id: "home", label: "Home", icon: Gauge, sub: "The whole network at a glance" },
  { id: "network", label: "Network Map", icon: MapIcon, sub: "Pipes, instruments and consumption" },
  { id: "overview", label: "Overview", icon: Workflow, sub: "River to customer, stage by stage" },
  { id: "production", label: "Production", icon: Waves, sub: "Follow the water from river to tap" },
  { id: "electrical", label: "Electrical", icon: Zap, sub: "Single-line diagram and power use" },
  { id: "maintenance", label: "Maintenance", icon: Hammer, sub: "Work orders, downtime and asset health" },
];
const TABS = ALL_TABS.filter((t) => ownsTab(t.id));

export default function App() {
  const [entered, setEntered] = useState(!!LINK);
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => { document.title = SITE.title; }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("wn-theme", theme); } catch { /* private window: theme just is not remembered */ }
  }, [theme]);
  // the dashboard mounts a moment after "Enter dashboard", so every animation and count-up plays in front of the viewer
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => { setReady(entered); if (entered) window.scrollTo(0, 0); }, entered ? 380 : 500);
    return () => window.clearTimeout(id);
  }, [entered]);
  const [tab, setTab] = useState<TabId>(LINK?.tab ?? SITE.start);
  const [f, setF] = useState<Filters>({ range: "7D", area: "All network" });
  const wos: WorkOrder[] = WORK_ORDERS;
  const [preset, setPreset] = useState<MapPreset | null>(null);
  const [assistOpen, setAssistOpen] = useState(false);
  const [stageTarget, setStageTarget] = useState<string | undefined>(LINK?.stage);
  // the page layout class follows the tab that is on screen: the old tab keeps its own styles while it fades out
  const [shown, setShown] = useState<TabId>(LINK?.tab ?? SITE.start);
  useEffect(() => { if (!ready) setShown(tab); }, [ready, tab]); // no tab is on screen behind the cover, so nothing is fading out
  // a tab that lives on the other website opens there; everything else switches in place
  const go: Go = (to, stage) => {
    if (!ownsTab(to)) { if (otherUrl) window.location.assign(otherHref(to, stage, theme)); return; }
    setStageTarget(stage); setTab(to);
  };
  const tick = useTick();
  const cur = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className={`app ${assistOpen ? "as-open" : ""}`}>
      <AnimatePresence>{!entered && <Cover key="cover" onEnter={() => { go(SITE.start); setEntered(true); }} theme={theme} setTheme={setTheme} />}</AnimatePresence>
      {ready && <>
      <motion.div className="chrome" initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <header className="topbar">
          <button className="brand" onClick={() => setEntered(false)} title="Back to the start screen" aria-label={`${SITE.title}, back to the start screen`}>
            <img className="brand-logo" src="/schneider-logo-transparent.png" alt="Schneider Electric" />
            <img className="brand-logo aveva aveva-light" src="/aveva-logo-transparent.png" alt="AVEVA" />
            <img className="brand-logo aveva aveva-dark" src="/aveva-logo-white.png" alt="" aria-hidden />
            <span className="brand-sep" aria-hidden />
            <div>
              <b>{SITE.title}</b>
            </div>
          </button>
          <div className="top-actions">
            <button className="icon-btn theme-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <AlertsBell go={go} />
            <UserMenu go={go} theme={theme} setTheme={setTheme} wos={wos} onStart={() => setEntered(false)} />
          </div>
        </header>
        <nav className="crumbs" aria-label="Breadcrumb">
          <button className="crumb" onClick={() => go(SITE.start)}>{SITE.title}</button>
          <span className="crumb here" aria-current="page">{tab === "alarms" ? "Alarms" : cur.label}</span>
          <button className={`crumb-ai ${assistOpen ? "on" : ""}`} onClick={() => setAssistOpen((o) => !o)} aria-pressed={assistOpen} aria-label={assistOpen ? "Close the assistant" : "Open the assistant"}>
            <MessageCircle size={18} /><span>{assistOpen ? "Close the assistant" : "Ask the assistant"}</span>
          </button>
        </nav>
      </motion.div>

      <main className={`page ${shown === "production" ? "prod" : ""} ${shown === "overview" ? "prod flow" : ""} ${shown === "electrical" ? "prod flow elec" : ""} ${shown === "home" ? "prod flow cc-page" : ""} ${shown === "network" ? "prod flow nm-page" : ""} ${shown === "alarms" ? "prod flow al-page" : ""} ${shown === "maintenance" ? "prod flow mt-page" : ""}`}>
        {tab !== "network" && tab !== "production" && tab !== "overview" && tab !== "electrical" && tab !== "home" && tab !== "maintenance" && tab !== "alarms" && <div className="page-head">
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
              {tab === "home" && <Home f={{ ...f, area: "All network" }} setRange={(range) => setF({ ...f, range })} go={go} wos={wos} />}
              {tab === "network" && <NetworkMap preset={preset} go={go} />}
              {tab === "alarms" && <AlarmsPage go={go} focus={stageTarget} />}
              {tab === "overview" && <Overview f={{ ...f, area: "All network" }} go={go} t={tick} />}
              {tab === "production" && <Production f={{ ...f, area: "All network" }} start={stageTarget} />}
              {tab === "electrical" && <Electrical f={{ ...f, area: "All network" }} />}
              {tab === "maintenance" && <Maintenance f={{ ...f, area: "All network" }} wos={wos} />}
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="dock" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === tab ? "on" : ""} onClick={() => go(t.id)} aria-current={t.id === tab ? "page" : undefined}>
            <t.icon size={15} /><span>{t.label}</span>
          </button>
        ))}
      </nav>
      <Assistant open={assistOpen} onClose={() => setAssistOpen(false)} onShow={(p) => { setPreset(p); go("network"); }} />
      </>}
    </div>
  );
}
