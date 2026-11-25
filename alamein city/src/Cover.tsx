import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Moon, Sun } from "lucide-react";
import type { Theme } from "./App";
import { CITY, CONNECTED_POINTS } from "./data";
import { fmt } from "./ui";

const ease = [0.22, 1, 0.36, 1] as const;
const up = (i: number) => ({ initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.25 + i * 0.12, ease } });
const STATS = [{ v: fmt(CONNECTED_POINTS), u: "Connected points" }, { v: fmt(CITY.meters), u: "Smart meters" }, { v: "9", u: "Smart city systems" }];

/** start screen: the looping video (public/cover.mp4) when it exists, otherwise the master plan with a slow push-in */
export default function Cover({ onEnter, theme, setTheme }: { onEnter: () => void; theme: Theme; setTheme: (t: Theme) => void }) {
  const [video, setVideo] = useState<"loading" | "ok" | "failed">("loading");
  return (
    <motion.div className={`cover ${video === "ok" ? "has-video" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.6, ease: "easeInOut" }}>
      <div className="cover-stage" aria-hidden>
        <img className="cover-still" src="/cover-still.jpg" alt="" />
        <video className="cover-video" src="/cover.mp4" poster="/cover-still.jpg" autoPlay muted loop playsInline onCanPlay={() => setVideo("ok")} onError={() => setVideo("failed")} />
        <div className="cover-shade" />
      </div>
      <div className="cover-top">
        <span />
        <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
      </div>
      <div className="cover-body">
        <motion.div className="cover-eyebrow" {...up(0)}>City Operations Center</motion.div>
        <motion.h1 {...up(1)}>New <em>Alamein</em> City</motion.h1>
        <motion.p className="cover-tag" {...up(2)}>Master plan · Smart city command center</motion.p>
        <motion.div className="cover-stats" {...up(3)}>{STATS.map((s) => <div key={s.u}><b>{s.v}</b><span>{s.u}</span></div>)}</motion.div>
        <motion.div {...up(4)}><button className="cover-go" onClick={onEnter}>Enter dashboard <ArrowRight size={18} /></button></motion.div>
      </div>
      <p className="cover-note">Quantities come from the COC bill of quantities. Live readings and zone shares are sample data for demonstration.</p>
    </motion.div>
  );
}
