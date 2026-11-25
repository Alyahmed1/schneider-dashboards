import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Moon, Play, Sun } from "lucide-react";
import type { Theme } from "./App";
import { BRIEF } from "./data";

const ease = [0.22, 1, 0.36, 1] as const;
const up = (i: number) => ({ initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.25 + i * 0.12, ease } });

const STATS = [
  { v: `${BRIEF.feddan}`, u: "Feddan" },
  { v: `${BRIEF.residentialPct}%`, u: "Residential" },
  { v: `${BRIEF.mixedPct}%`, u: "Mixed-use" },
];

/** the start screen: the looping aerial video (public/cover.mp4), or the still with a slow push-in until that file exists */
export default function Cover({ onEnter, onStory, theme, setTheme }: { onEnter: () => void; onStory: () => void; theme: Theme; setTheme: (t: Theme) => void }) {
  // "loading" shows the still behind the title, so there is never an empty frame before the video starts
  const [video, setVideo] = useState<"loading" | "ok" | "failed">("loading");
  return (
    <motion.div className={`cover ${video === "ok" ? "has-video" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.6, ease: "easeInOut" }}>
      <div className="cover-stage" aria-hidden>
        <img className="cover-still" src="/cover-still.jpg" alt="" />
        <video className="cover-video" src="/cover.mp4" poster="/cover-still.jpg" autoPlay muted loop playsInline
          onCanPlay={() => setVideo("ok")} onError={() => setVideo("failed")} />
        <div className="cover-shade" />
      </div>

      <div className="cover-top">
        <img className="cover-logo" src="/pre-logo-white.png" alt="PRE Group" />
        <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="cover-body">
        <motion.div className="cover-eyebrow" {...up(0)}>Our vision</motion.div>
        <motion.h1 {...up(1)}>Telal <em>West</em></motion.h1>
        <motion.p className="cover-tag" {...up(2)}>AI City command center · A new chapter of elevated living</motion.p>
        <motion.div className="cover-stats" {...up(3)}>
          {STATS.map((s) => <div key={s.u}><b>{s.v}</b><span>{s.u}</span></div>)}
        </motion.div>
        <motion.div className="cover-actions" {...up(4)}>
          <button className="cover-go" onClick={onEnter}>Enter dashboard <ArrowRight size={18} /></button>
          <button className="cover-story" onClick={onStory}><Play size={15} /> Watch the guided tour</button>
        </motion.div>
      </div>
      <p className="cover-note">New Zayed, Egypt · Images are AI-generated and are presented for concept illustration only</p>
    </motion.div>
  );
}
