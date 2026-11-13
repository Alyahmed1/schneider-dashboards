import { motion } from "framer-motion";
import { CountUp } from "./ui";

const ease = [0.22, 1, 0.36, 1] as const;

/** half-circle gauge with a number in the middle */
export function Semi({ pct, tone, label, size = 132 }: { pct: number; tone: string; label: string; size?: number }) {
  return (
    <div className="wc-semi" style={{ width: size, ["--tone" as string]: tone }}>
      <svg viewBox="0 0 120 70" aria-hidden>
        <path d="M10 62 A50 50 0 0 1 110 62" className="bg" pathLength={1} />
        <motion.path d="M10 62 A50 50 0 0 1 110 62" className="fg" pathLength={1} initial={{ pathLength: 0 }} animate={{ pathLength: pct / 100 }} transition={{ duration: 1.1, ease }} />
      </svg>
      <b><CountUp value={pct} />%</b>
      <span>{label}</span>
    </div>
  );
}
/** ring split into parts; the parts always add up to 100 */
export function Donut({ parts, size = 120, centre }: { parts: { label: string; pct: number; color: string }[]; size?: number; centre: string }) {
  const R = 40, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="wc-donut" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={R} className="bg" />
        {parts.map((p, i) => {
          const len = (C * p.pct) / 100, off = -(C * acc) / 100;
          acc += p.pct;
          return <motion.circle key={i} cx="50" cy="50" r={R} className="seg" stroke={p.color} strokeDasharray={`${len - 1.5} ${C}`} strokeDashoffset={off} transform="rotate(-90 50 50)"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.15 }} />;
        })}
      </svg>
      <b>{centre}</b>
    </div>
  );
}
