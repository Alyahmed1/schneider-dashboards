import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Moon, Sprout, Sun, TreePine, type LucideIcon } from "lucide-react";
import { FARM, type Filters } from "./farm";
import Agricultural from "./Agricultural";
import Pivots from "./Pivots";
import Schedule from "./Schedule";
import Pumps from "./Pumps";
import Weather from "./Weather";
import Energy from "./Energy";
import Zones from "./Zones";
import Sensors from "./Sensors";
import Controllers from "./Controllers";
import Process from "./Process";
import Assistant from "./Assistant";
import ExportMenu from "./ExportMenu";
import UserMenu from "./UserMenu";
import Cover from "./Cover";
import ErrorBoundary from "./ErrorBoundary";
import { AlarmsPage, AlertsBell } from "./alarms";

export type TabId = "agri" | "landscape";
export type ViewId = "farm" | "pivots" | "schedule" | "pumps" | "weather" | "energy" | "zones" | "sensors" | "controllers" | "process" | "alarms";
export type Go = (view: ViewId, target?: string) => void;
export type Theme = "light" | "dark";

const TABS: { id: TabId; label: string; icon: LucideIcon; views: { id: ViewId; label: string }[] }[] = [
  { id: "agri", label: "Agricultural", icon: Sprout, views: [{ id: "farm", label: "Farm map" }, { id: "pivots", label: "Pivots" }, { id: "schedule", label: "Irrigation schedule" }, { id: "pumps", label: "Pump stations" }, { id: "weather", label: "Weather & ET" }, { id: "energy", label: "Water & energy" }] },
  { id: "landscape", label: "Landscape", icon: TreePine, views: [{ id: "zones", label: "Zones" }, { id: "sensors", label: "Sensors" }, { id: "controllers", label: "Controllers" }, { id: "process", label: "Grey water" }] },
];
const TITLE = "Smart Irrigation";
const tabOf = (v: ViewId) => TABS.find((t) => t.views.some((x) => x.id === v));

const readTheme = (): Theme => {
  try { return localStorage.getItem("ag-theme") === "light" ? "light" : "dark"; } catch { return "dark"; }
};

export default function App() {
  const [entered, setEntered] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [view, setView] = useState<ViewId>("farm");
  const [target, setTarget] = useState<string | undefined>();
  const [last, setLast] = useState<Record<TabId, ViewId>>({ agri: "farm", landscape: "zones" });
  const [f, setF] = useState<Filters>({ range: "7D" });
  const [assistOpen, setAssistOpen] = useState(false);
  // the dashboard mounts a moment after "Enter dashboard", so every animation and count-up plays in front of the viewer
  const [ready, setReady] = useState(false);

  useEffect(() => { document.title = TITLE; }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("ag-theme", theme); } catch { /* private window: the choice is just not remembered */ }
  }, [theme]);
  useEffect(() => {
    const id = window.setTimeout(() => { setReady(entered); if (entered) window.scrollTo(0, 0); }, entered ? 380 : 500);
    return () => window.clearTimeout(id);
  }, [entered]);

  const go: Go = (to, id) => {
    setTarget(id); setView(to);
    const t = tabOf(to);
    if (t) setLast((l) => ({ ...l, [t.id]: to }));
  };
  const tab = tabOf(view);
  const curView = tab?.views.find((v) => v.id === view);

  return (
    <div className={`app ${assistOpen ? "as-open" : ""}`}>
      <AnimatePresence>{!entered && <Cover key="cover" onEnter={() => { go("farm"); setEntered(true); }} setTheme={setTheme} />}</AnimatePresence>
      {ready && <>
        <motion.div className="chrome" initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          <header className="topbar">
            <button className="brand" onClick={() => setEntered(false)} title="Back to the start screen" aria-label={`${TITLE}, back to the start screen`}>
              <span className="brand-mark" aria-hidden><Sprout size={15} /></span>
              <b>{TITLE}</b>
            </button>
            <div className="top-actions">
              <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <ExportMenu />
              <AlertsBell go={go} />
              <UserMenu theme={theme} setTheme={setTheme} go={go} toStart={() => setEntered(false)} />
            </div>
          </header>
          <nav className="crumbs" aria-label="Breadcrumb">
            <button className="crumb" onClick={() => go("farm")}>{TITLE}</button>
            <span className="crumb">{FARM.name}</span>
            {tab && <button className="crumb" onClick={() => go(last[tab.id])}>{tab.label}</button>}
            <span className="crumb here" aria-current="page">{view === "alarms" ? "Alarms" : curView?.label}</span>
            <button className={`crumb-ai ${assistOpen ? "on" : ""}`} onClick={() => setAssistOpen((o) => !o)} aria-pressed={assistOpen} aria-label={assistOpen ? "Close the assistant" : "Open the assistant"}>
              <MessageCircle size={18} /><span>{assistOpen ? "Close the assistant" : "Ask the assistant"}</span>
            </button>
          </nav>
          {tab && (
            <nav className="subbar" aria-label={`${tab.label} sections`}>
              {tab.views.map((v) => <button key={v.id} className={v.id === view ? "on" : ""} onClick={() => go(v.id)} aria-current={v.id === view ? "page" : undefined}>{v.label}</button>)}
            </nav>
          )}
        </motion.div>

        <main className="page">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <ErrorBoundary key={view}>
                {view === "farm" && <Agricultural f={f} setRange={(range) => setF({ range })} go={go} />
                }
                {view === "pivots" && <Pivots start={target} />}
                {view === "schedule" && <Schedule go={go} />}
                {view === "pumps" && <Pumps start={target} />}
                {view === "weather" && <Weather />}
                {view === "energy" && <Energy />}
                {view === "zones" && <Zones start={target} go={go} />}
                {view === "sensors" && <Sensors start={target} />}
                {view === "controllers" && <Controllers start={target} />}
                {view === "process" && <Process />}
                {view === "alarms" && <AlarmsPage go={go} />}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
        <nav className="dock" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} className={t.id === tab?.id ? "on" : ""} onClick={() => go(last[t.id])} aria-current={t.id === tab?.id ? "page" : undefined}>
              <t.icon size={16} /><span>{t.label}</span>
            </button>
          ))}
        </nav>
        <Assistant open={assistOpen} onClose={() => setAssistOpen(false)} go={go} />
      </>}
    </div>
  );
}
