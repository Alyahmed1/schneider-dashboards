import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Droplets, Moon, Sun } from "lucide-react";
import type { Theme } from "./App";
import { PLANT } from "./data";

const STATS = [
  { v: "120,000", u: "m³ per day" },
  { v: "3.18", u: "kWh per m³" },
  { v: "98.7%", u: "availability" },
  { v: "26%", u: "solar power" },
];

/** twinkling lights placed on the real lamps of the photo (x, y in % of the picture) */
const LIGHTS: { x: number; y: number; s: number; cool?: boolean }[] = [
  // far coast line
  { x: 1.5, y: 34.2, s: 8 }, { x: 5.5, y: 34.4, s: 8 }, { x: 9, y: 34.1, s: 9 }, { x: 14, y: 34.3, s: 8 }, { x: 20, y: 34.2, s: 8 }, { x: 25, y: 34.4, s: 9 }, { x: 29, y: 34.1, s: 8 },
  // quay lamps
  { x: 20.2, y: 39.5, s: 16 }, { x: 22.8, y: 41.2, s: 16 }, { x: 26.9, y: 41.7, s: 16 }, { x: 29.5, y: 44.7, s: 16 }, { x: 34, y: 42.7, s: 18 }, { x: 34.4, y: 46.8, s: 18 }, { x: 47.3, y: 50, s: 20 },
  // tanks
  { x: 35, y: 27.8, s: 16 }, { x: 39.2, y: 26, s: 16 }, { x: 45.5, y: 26.6, s: 16 }, { x: 50.5, y: 26.2, s: 16 }, { x: 52.7, y: 25.9, s: 16 },
  // towers and beacons
  { x: 62.1, y: 15.7, s: 18, cool: true }, { x: 66.7, y: 21.3, s: 16, cool: true }, { x: 86.2, y: 9.1, s: 20, cool: true }, { x: 91.3, y: 5.5, s: 20, cool: true }, { x: 85.4, y: 16, s: 16, cool: true },
  // membrane racks and pipes
  { x: 67.6, y: 38, s: 18 }, { x: 71.2, y: 37.4, s: 18 }, { x: 79.5, y: 37.2, s: 18 }, { x: 87.9, y: 38.8, s: 18 }, { x: 82.5, y: 44.6, s: 16 }, { x: 87.8, y: 79, s: 22 },
];

const ease = [0.22, 1, 0.36, 1] as const;
const up = (i: number) => ({ initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.25 + i * 0.12, ease } });

export default function Cover({ onEnter, theme, setTheme }: { onEnter: () => void; theme: Theme; setTheme: (t: Theme) => void }) {
  // "loading" shows only the dark background, so the photo never flashes before the video starts
  const [video, setVideo] = useState<"loading" | "ok" | "failed">("loading");
  const hasVideo = video === "ok";
  return (
    <motion.div className={`cover ${hasVideo ? "has-video" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.6, ease: "easeInOut" }}>
      {/* no video file: fall back to the living photo (slow push-in, drifting mist, rippling sea, twinkling lights) */}
      {video === "failed" && (
      <>
      <div className="cover-stage" aria-hidden>
      <motion.div className="stage-in" initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 20, ease: "easeOut" }}>
        <img src="/night.jpg" alt="" />
        <div className="mist" />
        <div className="mist two" />
        <div className="sea-shimmer"><i /><i /></div>
        <div className="moon-glow" />
        {LIGHTS.map((l, n) => (
          <i key={n} className={`lt ${l.cool ? "cool" : ""}`} style={{ left: `${l.x}%`, top: `${l.y}%`, ["--s" as string]: l.s, ["--d" as string]: `${2.6 + ((n * 7) % 9) * 0.35}s`, ["--l" as string]: `${-((n * 13) % 10) * 0.4}s` }} />
        ))}
      </motion.div>
      </div>
      </>
      )}
      {/* the clip lives at public/cover.mp4 */}
      <video className={`cover-img cover-video ${hasVideo ? "on" : ""}`} src="/cover.mp4" autoPlay muted loop playsInline preload="auto" aria-hidden
        onError={() => setVideo("failed")} onLoadedData={() => setVideo("ok")} />
      <div className="cover-shade" aria-hidden />
      <div className="cover-body">
        <motion.span className="cover-tag" {...up(0)}><Droplets size={14} /> Smart desalination · sea-water reverse osmosis</motion.span>
        <motion.h1 {...up(1)}>Smart Water Desalination</motion.h1>
        <motion.p {...up(2)}>One live view of production, power, sustainability, cost and maintenance for the {PLANT.name}.</motion.p>
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
