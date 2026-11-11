import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, Building2, FileText, Gauge, Home as HomeIcon, Leaf, Scale, TrendingUp, TriangleAlert, Workflow, Info, type LucideIcon,
} from "lucide-react";
import { type Go, type MinistryId, type Role, type TabId } from "./data";
import { STAGE_H, STAGE_W, useScale } from "./ui";
import Cover from "./Cover";
import Header from "./Header";
import Home from "./Home";
import Executive from "./Executive";
import Cycle from "./Cycle";
import Ministry from "./Ministry";
import MinistriesView from "./MinistriesView";
import { PAGES, TabPlaceholder } from "./Placeholder";

type Route = { tab: TabId | "ministry"; id?: MinistryId };

const NAV: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "executive", label: "Executive View", icon: Gauge },
  { id: "cycle", label: "Water Cycle", icon: Workflow },
  { id: "balance", label: "Water Balance", icon: Scale },
  { id: "ministries", label: "Ministries View", icon: Building2 },
  { id: "operations", label: "Operations", icon: Activity },
  { id: "performance", label: "Performance", icon: TrendingUp },
  { id: "sustainability", label: "Sustainability", icon: Leaf },
  { id: "alerts", label: "Alerts & Events", icon: TriangleAlert },
  { id: "reports", label: "Reports", icon: FileText },
];

/** which background picture sits behind each page */
const readCollapsed = () => { try { return localStorage.getItem("nwp-menu-hidden") === "1"; } catch { return false; } };

const bgFor = (r: Route) => (r.tab === "home" || r.tab === "ministry" ? "executive" : PAGES[r.tab].bg);

export default function App() {
  const [entered, setEntered] = useState(false);
  // the platform mounts a moment after "Enter", so every animation and count-up plays in front of the viewer
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setReady(entered), entered ? 380 : 0);
    return () => window.clearTimeout(id);
  }, [entered]);
  const [route, setRoute] = useState<Route>({ tab: "home" });
  const [role, setRole] = useState<Role>("cabinet");
  const scale = useScale();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggleMenu = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem("nwp-menu-hidden", n ? "1" : "0"); } catch { /* private window: the choice is just not remembered */ } return n; });
  const go: Go = (tab, id) => setRoute({ tab, id });
  const active: TabId = route.tab === "ministry" ? "ministries" : route.tab;

  return (
    <>
      <AnimatePresence>{!entered && <Cover key="cover" onEnter={() => setEntered(true)} />}</AnimatePresence>
      {ready && (
        <div className="viewport">
          <AnimatePresence>
            <motion.div key={bgFor(route)} className="backdrop" style={{ backgroundImage: `url(/img/${bgFor(route)}.jpg)` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} />
          </AnimatePresence>
          <div className="backdrop-shade" />
          <div className="stage" style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}>
            <Header go={go} role={role} setRole={setRole} collapsed={collapsed} onToggle={toggleMenu} onStart={() => { setEntered(false); setRoute({ tab: "home" }); }} />
            <nav className={`side ${collapsed ? "hide" : ""}`} aria-label="Main menu" aria-hidden={collapsed}>
              {NAV.map((n, i) => {
                const Icon = n.icon;
                return (
                  <motion.button key={n.id} className={active === n.id ? "on" : ""} onClick={() => go(n.id)} aria-current={active === n.id ? "page" : undefined}
                    initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.045 }}>
                    <Icon size={20} /><span>{n.label}</span>
                  </motion.button>
                );
              })}
              <div className="side-note"><Info size={14} /> Demo with simulated data</div>
            </nav>
            <main className={`main ${collapsed ? "full" : ""}`}>
              <AnimatePresence mode="wait">
                {route.tab === "home" ? (
                  <motion.div key="home" className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}><Home go={go} wide={collapsed} /></motion.div>
                ) : route.tab === "executive" ? (
                  <Executive key="executive" go={go} />
                ) : route.tab === "ministries" ? (
                  <MinistriesView key="ministries" go={go} />
                ) : route.tab === "cycle" ? (
                  <Cycle key="cycle" go={go} />
                ) : route.tab === "ministry" && route.id ? (
                  <Ministry key={`m-${route.id}`} id={route.id} go={go} />
                ) : route.tab !== "ministry" ? (
                  <TabPlaceholder key={route.tab} tab={route.tab} />
                ) : null}
              </AnimatePresence>
            </main>
          </div>
        </div>
      )}
    </>
  );
}
