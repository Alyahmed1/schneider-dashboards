import { motion } from "framer-motion";
import { MINISTRY_BY_ID, type MinistryId } from "./data";

/**
 * The map is the 3D Egypt picture from the reference (public/img/egypt-map.jpg, 494 x 600).
 * The pins are already drawn in the picture, so each one gets a clickable spot placed on it (x, y in picture pixels).
 */
export const IMG_W = 494, IMG_H = 545;

export const SPOTS: { id: MinistryId; x: number; y: number; where: string }[] = [
  { id: "mwri", x: 163, y: 67, where: "Aswan High Dam and the Nile barrages" },
  { id: "mhuuc", x: 288, y: 40, where: "Greater Cairo drinking water" },
  { id: "mhuuc", x: 380, y: 160, where: "Red Sea desalination" },
  { id: "eeaa", x: 113, y: 203, where: "Western industrial zones" },
  { id: "moalr", x: 296, y: 253, where: "Nile valley smart farms" },
];

export default function EgyptMap({ hover, setHover, onOpen }: { hover: MinistryId | null; setHover: (id: MinistryId | null) => void; onOpen: (id: MinistryId) => void }) {
  return (
    <div className="map-box">
      {/* a blue sea fills the whole space, the map picture sits in its true shape in the middle and fades into it */}
      <div className="sea" aria-hidden />
      <div className="map-fig" style={{ aspectRatio: `${IMG_W} / ${IMG_H}` }}>
      <img className="map-img" src="/img/egypt-map.jpg" alt="Map of Egypt with the Nile and one pin for each ministry" draggable={false} />
      {SPOTS.map((p, n) => {
        const m = MINISTRY_BY_ID[p.id];
        const on = hover === p.id;
        return (
          <motion.button key={n} className={`spot ${on ? "on" : ""} ${p.x > 330 ? "flip" : ""}`} style={{ left: `${(p.x / IMG_W) * 100}%`, top: `${(p.y / IMG_H) * 100}%`, ["--accent" as string]: m.accent }}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + n * 0.1, type: "spring", stiffness: 260, damping: 18 }}
            onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(p.id)} onBlur={() => setHover(null)}
            onClick={() => onOpen(p.id)} aria-label={`${m.short}: ${p.where}. Open the ministry page`}>
            <span className="spot-ring" /><span className="spot-core" />
            <span className="spot-tip"><b>{m.short}</b><em>{p.where}</em></span>
          </motion.button>
        );
      })}
      </div>
    </div>
  );
}
