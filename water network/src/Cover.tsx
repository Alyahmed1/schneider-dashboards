import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Droplets, Moon, Sun } from "lucide-react";
import type { Theme } from "./App";
import { SITE } from "./site";
import { NET, ZONES } from "./network";

const STATS = [
  { v: NET.supplied.toLocaleString("en-US"), u: "m³ per day supplied" },
  { v: String(ZONES.length), u: "supply zones" },
  { v: String(NET.instruments), u: "live instruments" },
  { v: `${(NET.nrw * 100).toFixed(0)}%`, u: "non-revenue water" },
];

const ease = [0.22, 1, 0.36, 1] as const;
const up = (i: number) => ({ initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.25 + i * 0.12, ease } });

/** The start screen is always dark. The viewer must pick Light or Dark before entering: nothing is chosen for them. */
export default function Cover({ onEnter, setTheme }: { onEnter: () => void; theme: Theme; setTheme: (t: Theme) => void }) {
  // "loading" shows only the dark background, so the still never flashes before the video starts
  const [video, setVideo] = useState<"loading" | "ok" | "failed">("loading");
  const hasVideo = video === "ok";
  const [picked, setPicked] = useState<Theme | null>(null);
  const pick = (t: Theme) => { setPicked(t); setTheme(t); };
  return (
    <motion.div className={`cover cover-dark ${hasVideo ? "has-video" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.6, ease: "easeInOut" }}>
      {/* no video file: fall back to the still (public/cover.png) with a slow push-in */}
      {video === "failed" && (
        <div className="cover-stage-still" aria-hidden>
          <motion.img src="/cover.png" alt="" initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 20, ease: "easeOut" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
        </div>
      )}
      {/* the clip lives at public/cover.mp4 */}
      <video className={`cover-img cover-video ${hasVideo ? "on" : ""}`} src="/cover.mp4" autoPlay muted loop playsInline preload="auto" aria-hidden
        onError={() => setVideo("failed")} onLoadedData={() => setVideo("ok")} />
      <div className="cover-shade" aria-hidden />
      <div className="cover-body">
        <motion.span className="cover-tag" {...up(0)}><Droplets size={14} /> {SITE.tag}</motion.span>
        <motion.h1 {...up(1)}>{SITE.title}</motion.h1>
        <motion.p {...up(2)}>{SITE.blurb}.</motion.p>
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
        <motion.button className="cover-btn" onClick={onEnter} disabled={!picked} autoFocus {...up(5)} whileHover={picked ? { scale: 1.03 } : undefined} whileTap={picked ? { scale: 0.98 } : undefined}>
          Enter dashboard <ArrowRight size={18} />
        </motion.button>
      </div>
    </motion.div>
  );
}
