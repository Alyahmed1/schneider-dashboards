import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Gauge, LayoutGrid, MessageCircle } from "lucide-react";
import { PhoneContext, useStage } from "./stage";
import { PIVOTS, type PivotId } from "./pivots";
import { hhmm, statusOf, useFleet, type Role, type Who } from "./model";
import Detail from "./Detail";
import Overview from "./Overview";
import Assistant from "./Assistant";
import { AlarmBell, AlarmsPage } from "./Alarms";
import { RoleProvider, UserMenu } from "./role";

export type TabId = "pivots" | "detail";

export default function App() {
  const st = useStage();
  // simulated user: the role can be switched from the user menu to show what each role may do
  const [who, setWho] = useState<Who>({ name: "Administrator", role: "Admin" });
  const [fleet, act] = useFleet(who);
  const [tab, setTab] = useState<TabId>("pivots");
  const [sel, setSel] = useState<PivotId>("P1");
  const [ask, setAsk] = useState(false);
  const [alarms, setAlarms] = useState(false);
  const openTab = (t: TabId) => { setAlarms(false); setTab(t); };
  const debug = typeof location !== "undefined" && location.search.includes("debug");
  const links = Object.fromEntries(PIVOTS.map((p) => [p.id, fleet.pivots[p.id].link === "ok"])) as Record<PivotId, boolean>;

  return (
    <RoleProvider who={who}>
      <div className="bg" aria-hidden />
      <PhoneContext.Provider value={st.phone}>
      <div className="stage" data-portrait={st.portrait} data-phone={st.phone} style={st.phone ? undefined : { width: st.w, height: st.h, transform: `translate(${st.x}px, ${st.y}px) scale(${st.scale})` }}>
        <header className="head">
          <div className="brand">
            <img className="brand-logo" src="/schneider-logo-transparent.png" alt="Schneider Electric" />
            <span className="brand-sep" aria-hidden />
            <b>Pivot Monitoring</b>
          </div>
          <nav className="tabs" aria-label="Sections">
            <button className={!alarms && tab === "pivots" ? "on" : ""} onClick={() => openTab("pivots")} aria-current={!alarms && tab === "pivots" ? "page" : undefined}><LayoutGrid size={18} />Pivots</button>
            <button className={!alarms && tab === "detail" ? "on" : ""} onClick={() => openTab("detail")} aria-current={!alarms && tab === "detail" ? "page" : undefined}><Gauge size={18} />Pivot {sel}</button>
          </nav>
          <div className="acts">
            <div className="seg" role="group" aria-label="Choose a pivot">
              {PIVOTS.map((p) => {
                const pv = fleet.pivots[p.id];
                return (
                  <button key={p.id} className={sel === p.id ? "on" : ""} onClick={() => setSel(p.id)} aria-pressed={sel === p.id} title={`${p.id} · ${p.crop}${pv.link === "lost" ? " · no signal" : ""}`}>
                    <i className={`dot ${pv.link === "lost" ? "lost" : statusOf(pv)}`} />{p.id}
                  </button>
                );
              })}
            </div>
            <span className="clock" title="Simulated time"><Clock size={16} />{hhmm(fleet.clock)}</span>
            <AlarmBell fleet={fleet} onOpenAll={() => setAlarms(true)} />
            <button className={`ask ${ask ? "on" : ""}`} onClick={() => setAsk((o) => !o)} aria-pressed={ask} aria-label={ask ? "Close the assistant" : "Ask the assistant"}><MessageCircle size={20} /><span>{ask ? "Close" : "Ask the assistant"}</span></button>
            <UserMenu who={who} setRole={(role: Role) => setWho({ ...who, role })} links={links} setLink={act.setLink} />
          </div>
        </header>
        <main className="page">
          <AnimatePresence mode="wait">
            <motion.div key={alarms ? "alarms" : tab} style={{ height: "100%" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {alarms ? (
                <AlarmsPage fleet={fleet} act={act} onOpenPivot={(id) => { setSel(id); openTab("detail"); }} />
              ) : tab === "detail" ? (
                <Detail id={sel} fleet={fleet} act={act} />
              ) : (
                <Overview fleet={fleet} onOpen={(id) => { setSel(id); setTab("detail"); }} onAlarms={() => setAlarms(true)} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <Assistant open={ask} onClose={() => setAsk(false)} fleet={fleet} scope={sel} detail={tab === "detail" && !alarms} />
        {debug && <p className="dbg">stage {st.w}×{st.h} · scale {st.scale.toFixed(3)}{st.phone ? " · phone" : ""}</p>}
      </div>
      </PhoneContext.Provider>
    </RoleProvider>
  );
}
