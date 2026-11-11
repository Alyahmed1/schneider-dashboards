import { motion } from "framer-motion";
import { Hammer } from "lucide-react";
import { MINISTRY_BY_ID, type MinistryId, type TabId } from "./data";
import { CountUp } from "./ui";
import MinistryIcon from "./MinistryIcon";

export const PAGES: Record<Exclude<TabId, "home">, { title: string; sub: string; phase: string; bg: string }> = {
  executive: { title: "Executive View", sub: "The national picture on one screen, for decision makers", phase: "Phase 2", bg: "executive" },
  cycle: { title: "Water Cycle", sub: "From the Nile to the tap and back to the field", phase: "Phase 2", bg: "cycle" },
  balance: { title: "Water Balance", sub: "What comes in, what is lost, what is reused", phase: "Phase 4", bg: "balance" },
  ministries: { title: "Ministries View", sub: "The four ministries side by side", phase: "Phase 3", bg: "executive" },
  operations: { title: "Operations", sub: "Live status of plants, pumps and pivots", phase: "Phase 4", bg: "operations" },
  performance: { title: "Performance", sub: "National outcomes against their targets", phase: "Phase 4", bg: "executive" },
  sustainability: { title: "Sustainability", sub: "Energy, emissions and circular water", phase: "Phase 4", bg: "balance" },
  alerts: { title: "Alerts & Events", sub: "Every alarm in the country, one list", phase: "Phase 4", bg: "subtle" },
  reports: { title: "Reports", sub: "Ready-made briefs you can print or save", phase: "Phase 4", bg: "subtle" },
};

const wrap = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.35 } };

export function TabPlaceholder({ tab }: { tab: Exclude<TabId, "home"> }) {
  const p = PAGES[tab];
  return (
    <motion.div className="ph" {...wrap}>
      <h2>{p.title}</h2>
      <p>{p.sub}</p>
      <div className="ph-card"><Hammer size={22} /> Arrives in {p.phase}. Navigation, menus and the Home screen already work.</div>
    </motion.div>
  );
}

export function MinistryPlaceholder({ id }: { id: MinistryId }) {
  const m = MINISTRY_BY_ID[id];
  return (
    <motion.div className="ph ministry" style={{ ["--accent" as string]: m.accent }} {...wrap}>
      <div className="ph-hero" style={{ backgroundImage: `url(${m.photo})` }}>
        <MinistryIcon m={m} size={58} />
        <div><h2>{m.name}</h2><p>{m.short}</p></div>
      </div>
      <div className="ph-stats">{m.tiles.map((t) => <div key={t.label}><b>{t.prefix}<CountUp value={t.value} decimals={t.decimals ?? 0} />{t.suffix}{t.unit && <small> {t.unit}</small>}</b><span>{t.label}</span></div>)}</div>
      <div className="ph-card"><Hammer size={22} /> The full ministry page, its sites and its dashboards arrive in Phase 3.</div>
    </motion.div>
  );
}
