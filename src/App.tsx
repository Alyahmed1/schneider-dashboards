import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Car, Database, Gauge, Map as MapIcon, MessageCircle, Moon, ScanEye, Sun, Wrench, Zap, type LucideIcon } from "lucide-react";
import type { TabId } from "./data";
import Cover from "./Cover";
import Home from "./Home";
import Soon from "./Soon";
import MasterPlan from "./MasterPlan";
import Mobility from "./Mobility";

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

  return (
    <div className="app">
      <AnimatePresence>{!entered && <Cover key="cover" onEnter={() => { setTab("home"); setEntered(true); }} theme={theme} setTheme={setTheme} />}</AnimatePresence>
      {ready && <>
        <motion.div className="chrome" initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          <header className="topbar">
            <button className="brand" onClick={() => setEntered(false)} title="Back to the start screen" aria-label="Telal West, back to the start screen">
              <img className="brand-logo" src="/pre-logo.png" alt="PRE Group" />
              <span><b>Telal West</b><i>AI City</i></span>
            </button>
            <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
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
              {tab === "home" ? <Home go={go} /> : tab === "plan" ? <MasterPlan go={go} focus={target} /> : tab === "mobility" ? <Mobility focus={target} /> : <Soon tab={tab} label={cur.label} />}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="dock" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} className={t.id === tab ? "on" : ""} onClick={() => go(t.id)} aria-current={t.id === tab ? "page" : undefined}>
              <t.icon size={16} /><span>{t.label}</span>
            </button>
          ))}
        </nav>
      </>}
    </div>
  );
}
