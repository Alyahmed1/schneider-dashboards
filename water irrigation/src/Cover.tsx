import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Moon, Sprout, Sun } from "lucide-react";
import type { Theme } from "./App";
import { FARM, fmt, PIVOTS, farmFlow } from "./farm";

const DAILY = Math.round(Array.from({ length: 24 }, (_, h) => farmFlow(h + 0.5)).reduce((a, b) => a + b, 0) / 100) * 100;
const STATS = [
  { v: fmt(FARM.feddan), u: "feddan under irrigation" },
  { v: String(PIVOTS.length), u: "centre pivots" },
  { v: "3", u: "pump stations" },
  { v: fmt(DAILY), u: "m³ applied per day" },
];
const ease = [0.22, 1, 0.36, 1] as const;
const up = (i: number) => ({ initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.25 + i * 0.12, ease } });

/** The start screen is always dark. The viewer picks Light or Dark before entering, nothing is chosen for them. */
export default function Cover({ onEnter, setTheme }: { onEnter: () => void; setTheme: (t: Theme) => void }) {
  // "loading" shows only the dark background, so the still never flashes before the video starts
  const [video, setVideo] = useState<"loading" | "ok" | "failed">("loading");
  const [picked, setPicked] = useState<Theme | null>(null);
  const pick = (t: Theme) => { setPicked(t); setTheme(t); };
  return (
    <motion.div className={`cover ${video === "ok" ? "has-video" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.6, ease: "easeInOut" }}>
      {/* until public/cover.mp4 exists, the still (public/cover.png) fills the screen with a slow push-in */}
      {video !== "ok" && (
        <div className="cover-still" aria-hidden>
          <motion.img src="/cover.png" alt="" initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 20, ease: "easeOut" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
        </div>
      )}
      <video className={`cover-video ${video === "ok" ? "on" : ""}`} src="/cover.mp4" autoPlay muted loop playsInline preload="auto" aria-hidden
        onError={() => setVideo("failed")} onLoadedData={() => setVideo("ok")} />
      <div className="cover-shade" aria-hidden />
      <div className="cover-body">
        <motion.span className="cover-tag" {...up(0)}><Sprout size={14} /> {FARM.tag}</motion.span>
        <motion.h1 {...up(1)}>Smart Agriculture</motion.h1>
        <motion.p {...up(2)}>Every pivot, pump and field of the farm on one live screen: soil moisture, water use, energy and alarms.</motion.p>
        <motion.div className="cover-stats" {...up(3)}>
          {STATS.map((s) => <div key={s.u}><b>{s.v}</b><span>{s.u}</span></div>)}
        </motion.div>
        <motion.div className="cover-theme" {...up(4)}>
          <span>Choose your view</span>
          <div role="group" aria-label="Colour mode">
            <button className={picked === "light" ? "on" : ""} onClick={() => pick("light")} aria-pressed={picked === "light"}><Sun size={13} /> Light</button>
            <button className={picked === "dark" ? "on" : ""} onClick={() => pick("dark")} aria-pressed={picked === "dark"}><Moon size={13} /> Dark</button>
          </div>
        </motion.div>
        <motion.button className="cover-btn" disabled={!picked} onClick={onEnter} {...up(5)}>Enter dashboard <ArrowRight size={16} /></motion.button>
      </div>
    </motion.div>
  );
}
