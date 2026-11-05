import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Droplets, Moon, Sun } from "lucide-react";
import type { Theme } from "./App";
import Backdrop from "./Backdrop";

const STATS = [
  { v: "18,420", u: "m³ water per day" },
  { v: "79%", u: "water recycled" },
  { v: "99.2%", u: "discharge compliance" },
  { v: "3", u: "industries, one view" },
];

const ease = [0.22, 1, 0.36, 1] as const;
const up = (i: number) => ({ initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.25 + i * 0.12, ease } });

export default function Cover({ onEnter, theme, setTheme }: { onEnter: () => void; theme: Theme; setTheme: (t: Theme) => void }) {
  // "loading" shows only the dark background, so nothing flashes before the video starts
  const [video, setVideo] = useState<"loading" | "ok" | "failed">("loading");
  const ok = video === "ok";
  return (
    <motion.div className={`cover ${ok ? "has-video" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.6, ease: "easeInOut" }}>
      {/* the clip is zoomed in on purpose (the top band was trimmed from the file), and it fills the screen */}
      {video === "failed" && <Backdrop src="/process.jpg" />}
      <video className={`cover-video ${ok ? "on" : ""}`} src="/cover-v2.mp4" autoPlay muted loop playsInline preload="auto" aria-hidden
        onError={() => setVideo("failed")} onLoadedData={() => setVideo("ok")} />
      <div className="cover-shade" aria-hidden />
      <div className="cover-body">
        <motion.span className="cover-tag" {...up(0)}><Droplets size={14} /> Industrial water · process, mining and manufacturing</motion.span>
        <motion.h1 {...up(1)}>Industrial Water</motion.h1>
        <motion.p {...up(2)}>One live view of how water is treated, reused and discharged across the process plant, the mine (MMM) and the factory (CPG).</motion.p>
        <motion.div className="cover-stats" {...up(3)}>
          {STATS.map((s) => <div key={s.u}><b>{s.v}</b><span>{s.u}</span></div>)}
        </motion.div>
        <motion.button className="cover-btn" onClick={onEnter} autoFocus {...up(4)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          Enter dashboard <ArrowRight size={18} />
        </motion.button>
        <motion.div className="cover-theme" {...up(5)}>
          <span>Open in</span>
          <div role="group" aria-label="Colour mode">
            <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")} aria-pressed={theme === "light"}><Sun size={13} /> Light</button>
            <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")} aria-pressed={theme === "dark"}><Moon size={13} /> Dark</button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
