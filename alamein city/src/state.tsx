import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SHARE, ZONES, type Domain, type LayerId, type ZoneId } from "./data";
import { rng, useTick } from "./live";

/* ---------------- global filters: zone + time range ---------------- */
export type Range = "24h" | "7d" | "30d";
export type ZoneFilter = ZoneId | "all";
interface Filters { zone: ZoneFilter; range: Range; setZone: (z: ZoneFilter) => void; setRange: (r: Range) => void }
const FCtx = createContext<Filters>({ zone: "all", range: "24h", setZone: () => {}, setRange: () => {} });
export const useFilters = () => useContext(FCtx);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [zone, setZone] = useState<ZoneFilter>("all");
  const [range, setRange] = useState<Range>("24h");
  const v = useMemo(() => ({ zone, range, setZone, setRange }), [zone, range]);
  return <FCtx.Provider value={v}>{children}</FCtx.Provider>;
}

/** share of a device type that sits in the chosen zone (1 for the whole city) */
export function shareOf(kind: keyof typeof SHARE, zone: ZoneFilter) {
  if (zone === "all") return 1;
  return SHARE[kind][ZONES.findIndex((z) => z.id === zone)] ?? 1;
}
export const scaled = (total: number, kind: keyof typeof SHARE, zone: ZoneFilter) => Math.round(total * shareOf(kind, zone));
export const zoneName = (z: ZoneFilter) => (z === "all" ? "All city" : ZONES.find((x) => x.id === z)?.name ?? "All city");
export const layerShareOf = (id: LayerId, zone: ZoneFilter) => shareOf(id, zone);

/* ---------------- alert feed (sample): a new alert arrives on every live refresh ---------------- */
export type Sev = "critical" | "warning" | "info";
export interface Alert { id: number; at: number; domain: Domain; sev: Sev; zone: ZoneId; text: string; ack: boolean }

const TEMPLATES: { domain: Domain; sev: Sev; text: string }[] = [
  { domain: "Utilities & energy", sev: "critical", text: "Feeder trip detected, ADMS isolating the faulted section" },
  { domain: "Utilities & energy", sev: "warning", text: "Transformer loading above 85%" },
  { domain: "Utilities & energy", sev: "warning", text: "Water pressure drop on distribution main" },
  { domain: "Utilities & energy", sev: "info", text: "Smart meter batch read completed" },
  { domain: "Utilities & energy", sev: "warning", text: "Street lighting circuit offline, 12 poles dark" },
  { domain: "Utilities & energy", sev: "critical", text: "Possible leak flagged by smart water sensors" },
  { domain: "Mobility", sev: "warning", text: "Parking zone above 90% occupancy" },
  { domain: "Mobility", sev: "info", text: "Bus 14 delayed 6 min at station 22" },
  { domain: "Mobility", sev: "warning", text: "Bus station display offline" },
  { domain: "Environment", sev: "warning", text: "14 waste bins above 85% full, collection advised" },
  { domain: "Environment", sev: "info", text: "Collection route 6 completed" },
  { domain: "Buildings", sev: "warning", text: "Chiller 2 efficiency below target" },
  { domain: "Buildings", sev: "critical", text: "Fire panel fault reported to IBMS" },
  { domain: "Buildings", sev: "info", text: "Lighting schedule applied to 8 buildings" },
  { domain: "Cybersecurity", sev: "critical", text: "SIEM: repeated failed logins on OT network" },
  { domain: "Cybersecurity", sev: "warning", text: "WAF blocked injection attempts on the citizen portal" },
  { domain: "Cybersecurity", sev: "info", text: "EDR policy update pushed to workstations" },
  { domain: "Citizens & commerce", sev: "info", text: "City app release 2.4 rolled out" },
  { domain: "Citizens & commerce", sev: "warning", text: "Digital signage player offline" },
  { domain: "Infrastructure", sev: "warning", text: "Storage pool 3 above 80% used" },
  { domain: "Core platform", sev: "info", text: "GIS basemap sync completed" },
];

interface AlertCtx { alerts: Alert[]; ack: (id: number) => void; ackAll: () => void }
const ACtx = createContext<AlertCtx>({ alerts: [], ack: () => {}, ackAll: () => {} });
export const useAlerts = () => useContext(ACtx);

function makeAlert(id: number, at: number, seed: number): Alert {
  const r = rng(seed * 7919 + id * 104729);
  const t = TEMPLATES[Math.floor(r() * TEMPLATES.length)];
  return { id, at, domain: t.domain, sev: t.sev, zone: ZONES[Math.floor(r() * ZONES.length)].id, text: t.text, ack: false };
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const tick = useTick();
  const next = useRef(30);
  const [alerts, setAlerts] = useState<Alert[]>(() => Array.from({ length: 16 }, (_, i) => makeAlert(i + 1, Date.now() - (i + 1) * 4.2 * 60000, 11)));
  useEffect(() => {
    if (tick === 0) return;
    setAlerts((p) => [makeAlert(next.current++, Date.now(), tick), ...p].slice(0, 40));
  }, [tick]);
  const ack = useCallback((id: number) => setAlerts((p) => p.map((a) => (a.id === id ? { ...a, ack: true } : a))), []);
  const ackAll = useCallback(() => setAlerts((p) => p.map((a) => ({ ...a, ack: true }))), []);
  const v = useMemo(() => ({ alerts, ack, ackAll }), [alerts, ack, ackAll]);
  return <ACtx.Provider value={v}>{children}</ACtx.Provider>;
}

export const ago = (at: number) => {
  const m = Math.max(0, Math.round((Date.now() - at) / 60000));
  return m < 1 ? "now" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h`;
};
