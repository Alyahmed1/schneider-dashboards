import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Factory, Gauge, MessageCircle, Moon, Pickaxe, Sun, Workflow, type LucideIcon } from "lucide-react";
import Cover from "./Cover";
import Home from "./Home";
import DiagramPage from "./DiagramPage";
import { PAGES } from "./pages";
import { useStore } from "./store";
import UserMenu from "./UserMenu";
import WorkOrders from "./WorkOrders";
import Assistant from "./Assistant";
import AlarmsPage from "./AlarmsPage";

export type TabId = "home" | "process" | "mmm" | "cpg" | "alarms";
export type Go = (tab: TabId, focus?: string) => void;
export type Theme = "light" | "dark";

const readTheme = (): Theme => {
  try { return localStorage.getItem("iw-theme") === "light" ? "light" : "dark"; } catch { return "dark"; }
};

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: Gauge },
  { id: "process", label: "Process", icon: Workflow },
  { id: "mmm", label: "MMM", icon: Pickaxe },
  { id: "cpg", label: "CPG", icon: Factory },
  { id: "alarms", label: "Alarms", icon: Bell },
];

export default function App() {
  const [entered, setEntered] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [tab, setTab] = useState<TabId>("home");
  const { alarms } = useStore();
  const [woOpen, setWoOpen] = useState(false);
  const [asOpen, setAsOpen] = useState(false);
  const [alarmFocus, setAlarmFocus] = useState<string | undefined>(undefined);
  // the dashboard mounts a moment after "Enter dashboard", so every animation and count-up plays in front of the viewer
  const [ready, setReady] = useState(false);

  // load and decode the three photos while the cover is showing, so the first visit to Home is instant
  useEffect(() => {
    ["/process.jpg", "/mmm.jpg", "/cpg.jpg"].forEach((src) => { const img = new Image(); img.src = src; img.decode?.().catch(() => undefined); });
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("iw-theme", theme); } catch { /* private window: theme is just not remembered */ }
  }, [theme]);
  useEffect(() => {
    const id = window.setTimeout(() => { setReady(entered); if (entered) window.scrollTo(0, 0); }, entered ? 380 : 500);
    return () => window.clearTimeout(id);
  }, [entered]);

  const go: Go = (to, focus) => { setAlarmFocus(focus); setTab(to); window.scrollTo(0, 0); };
  const cur = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className={`app ${asOpen ? "as-open" : ""}`}>
      <AnimatePresence>{!entered && <Cover key="cover" onEnter={() => { go("home"); setEntered(true); }} theme={theme} setTheme={setTheme} />}</AnimatePresence>
      {ready && (
        <>
          <motion.div className="chrome" initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <header className="topbar">
              <button className="brand" onClick={() => setEntered(false)} title="Back to the start screen" aria-label="Industrial Water, back to the start screen">
                <img className="brand-logo" src="/schneider-logo-transparent.png" alt="Schneider Electric" />
                <span className="brand-sep" aria-hidden />
                <b>Industrial Water</b>
              </button>
              <div className="top-actions">
                <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>
                  {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                </button>
                <button className="icon-btn" onClick={() => go("alarms")} aria-label="Open alarms" title="Alarms">
                  <Bell size={15} />{alarms.length > 0 && <i>{alarms.length}</i>}
                </button>
                <UserMenu go={go} theme={theme} setTheme={setTheme} onStart={() => setEntered(false)} onWork={() => setWoOpen(true)} />
              </div>
            </header>
            <nav className="crumbs" aria-label="Breadcrumb">
              <button className="crumb" onClick={() => go("home")}>Industrial Water</button>
              <span className="crumb here" aria-current="page">{cur.label}</span>
              <button className={`crumb-ai ${asOpen ? "on" : ""}`} onClick={() => setAsOpen((o) => !o)} aria-expanded={asOpen} aria-label="Ask the assistant"><MessageCircle /> <span>Ask the assistant</span></button>
            </nav>
          </motion.div>

          <main className="page fit">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {tab === "home" && <Home go={go} />}
                {(tab === "process" || tab === "mmm" || tab === "cpg") && <DiagramPage key={tab} cfg={PAGES[tab]} />}
                {tab === "alarms" && <AlarmsPage key={alarmFocus ?? "none"} go={go} focus={alarmFocus} />}
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
          <WorkOrders open={woOpen} onClose={() => setWoOpen(false)} go={go} />
          <Assistant open={asOpen} onClose={() => setAsOpen(false)} go={go} onWork={() => setWoOpen(true)} />
        </>
      )}
    </div>
  );
}
