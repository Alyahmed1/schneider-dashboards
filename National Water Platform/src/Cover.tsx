import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Droplets } from "lucide-react";

const STATS = [
  { v: "17.5 M", u: "m³ per day supplied" },
  { v: "~115 M", u: "people served" },
  { v: "4", u: "ministries, one view" },
  { v: "23%", u: "of water reused" },
];

const ease = [0.22, 1, 0.36, 1] as const;
const up = (i: number) => ({ initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.25 + i * 0.12, ease } });

export default function Cover({ onEnter }: { onEnter: () => void }) {
  // "loading" shows only the dark background, so the still never flashes before the video starts
  const [video, setVideo] = useState<"loading" | "ok" | "failed">("loading");
  return (
    <motion.div className="cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.6, ease: "easeInOut" }}>
      {video === "failed" && <img className="cover-media" src="/img/cover.jpg" alt="" />}
      {/* the clip lives at public/cover.mp4 */}
      <video className={`cover-media ${video === "ok" ? "on" : ""}`} src="/cover.mp4" autoPlay muted loop playsInline preload="auto" aria-hidden
        onError={() => setVideo("failed")} onLoadedData={() => setVideo("ok")} />
      <div className="cover-shade" aria-hidden />
      <motion.img className="cover-logo" src="/img/schneider-green.png" alt="Schneider Electric" draggable={false} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease }} />
      <div className="cover-body">
        <motion.span className="cover-tag" {...up(0)}><Droplets size={14} /> One national view · every ministry · the whole water cycle</motion.span>
        <motion.h1 {...up(1)}>Egypt National Water Platform</motion.h1>
        <motion.p {...up(2)}>Supply, treatment, reuse, farms and the environment together, from the Nile to the tap and back to the field.</motion.p>
        <motion.div className="cover-stats" {...up(3)}>
          {STATS.map((s) => <div key={s.u}><b>{s.v}</b><span>{s.u}</span></div>)}
        </motion.div>
        <motion.button className="cover-btn" onClick={onEnter} autoFocus {...up(4)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          Enter platform <ArrowRight size={18} />
        </motion.button>
        <motion.span className="cover-note" {...up(5)}>Demo with simulated data</motion.span>
      </div>
    </motion.div>
  );
}
