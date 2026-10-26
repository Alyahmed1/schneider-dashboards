import { Suspense, lazy, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Car, Database, Gauge, Map as MapIcon, MessageCircle, Moon, Play, ScanEye, Sun, Wrench, Zap, type LucideIcon } from "lucide-react";
import type { TabId } from "./data";
import Cover from "./Cover";
import Home from "./Home";
import Story from "./Story";
import ErrorBoundary from "./ErrorBoundary";

// the tabs other than Home load when first opened, so the first screen arrives quickly
const MasterPlan = lazy(() => import("./MasterPlan"));
const Mobility = lazy(() => import("./Mobility"));
const Utilities = lazy(() => import("./Utilities"));
const Assets = lazy(() => import("./Assets"));
const Safety = lazy(() => import("./Safety"));
const Assistant = lazy(() => import("./Assistant"));
const Platform = lazy(() => import("./Platform"));
/** fetch the other tabs in the background once the dashboard is open, so no tab ever waits on a click */
const preload = () => [import("./MasterPlan"), import("./Mobility"), import("./Utilities"), import("./Assets"), import("./Safety"), import("./Assistant"), import("./Platform")];

export type Theme = "light" | "dark";
const readTheme = (): Theme => {
  try { return localStorage.getItem("telal-theme") === "dark" ? "dark" : "light"; } catch { return "light"; }
};

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: Gauge },
  { id: "plan", label: "Master Plan", icon: MapIcon },
  { id: "mobility", label: "Mobility", icon: Car },
  { id: "utilities", label: "Utilities", icon: Zap },
  { id: "assets", label: "Assets", icon: Wrench },
  { id: "safety", label: "Safety", icon: ScanEye },
  { id: "assistant", label: "Assistant", icon: MessageCircle },
  { id: "platform", label: "Platform", icon: Database },
];

export default function App() {
  const [entered, setEntered] = useState(false);
  const [story, setStory] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("telal-theme", theme); } catch { /* theme just is not remembered */ }
  }, [theme]);
  // the dashboard mounts a moment after "Enter dashboard", so every animation and count-up plays in front of the viewer
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => { setReady(entered); if (entered) window.scrollTo(0, 0); }, entered ? 380 : 500);
    return () => window.clearTimeout(id);
  }, [entered]);
  const [tab, setTab] = useState<TabId>("home");
  const [target, setTarget] = useState<string | undefined>(undefined);
  const go = (to: TabId, tg?: string) => { setTarget(tg); setTab(to); };
  const cur = TABS.find((t) => t.id === tab) ?? TABS[0];
  useEffect(() => { if (ready) { const id = window.setTimeout(() => { void preload(); }, 500); return () => window.clearTimeout(id); } }, [ready]);
  useEffect(() => { document.title = entered ? `${cur.label} · Telal West AI City` : "Telal West AI City"; }, [cur, entered]);

  const startStory = () => { setTab("home"); setTarget(undefined); setEntered(true); setStory(true); };
  // a link ending in ?story=1 starts the tour by itself (handy for recording it)
  useEffect(() => { if (new URLSearchParams(window.location.search).has("story")) startStory(); }, []);

  return (
    <div className={`app ${story ? "storying" : ""}`}>
      <AnimatePresence>{!entered && <Cover key="cover" onEnter={() => { setTab("home"); setEntered(true); }} onStory={startStory} theme={theme} setTheme={setTheme} />}</AnimatePresence>
      {ready && <>
        <motion.div className="chrome" initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          <header className="topbar">
            <button className="brand" onClick={() => { setStory(false); setEntered(false); }} title="Back to the start screen" aria-label="Telal West, back to the start screen">
              <img className="brand-logo" src="/pre-logo.png" alt="PRE Group" />
              <span><b>Telal West</b><i>AI City</i></span>
            </button>
            <div className="top-actions">
              {!story && <button className="story-btn" onClick={startStory} aria-label="Start the guided tour"><Play size={14} /><span>Guided tour</span></button>}
              <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </header>
          <nav className="crumbs" aria-label="Breadcrumb">
            <button className="crumb" onClick={() => go("home")}>Telal West</button>
            <span className="crumb">New Zayed</span>
            <span className="crumb here" aria-current="page">{cur.label}</span>
          </nav>
        </motion.div>

        <main className="page">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <ErrorBoundary key={tab}>
                <Suspense fallback={<div className="loading" aria-busy="true">Loading…</div>}>
                  {tab === "home" ? <Home go={go} /> : tab === "plan" ? <MasterPlan go={go} focus={target} /> : tab === "mobility" ? <Mobility focus={target} /> : tab === "utilities" ? <Utilities go={go} focus={target} /> : tab === "assets" ? <Assets focus={target} /> : tab === "safety" ? <Safety focus={target} /> : tab === "assistant" ? <Assistant /> : <Platform go={go} />}
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className={`dock ${story ? "hide" : ""}`} aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} className={t.id === tab ? "on" : ""} onClick={() => go(t.id)} aria-current={t.id === tab ? "page" : undefined}>
              <t.icon size={16} /><span>{t.label}</span>
            </button>
          ))}
        </nav>
      </>}
      {story && <Story go={(to) => go(to)} ready={ready} onExit={() => setStory(false)} />}
    </div>
  );
}
