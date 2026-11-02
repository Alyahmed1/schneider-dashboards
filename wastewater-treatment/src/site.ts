import type { TabId } from "./App";

/** One codebase, two websites. VITE_SITE picks which one this build is; unset means the Process & CMMS site. */
export type SiteId = "process" | "kpi";

interface Site {
  id: SiteId;
  title: string;
  tag: string;
  blurb: string;
  /** the tabs this site shows (alarms has no dock button but still lives here) */
  tabs: TabId[];
  start: TabId;
  other: SiteId;
}

const SITES: Record<SiteId, Site> = {
  process: {
    id: "process", title: "Smart Wastewater: Process & CMMS", tag: "Process and maintenance · activated sludge",
    blurb: "The whole treatment process, stage by stage, with alarms, work orders and asset health.",
    tabs: ["overview", "production", "alarms", "maintenance"], start: "overview", other: "kpi",
  },
  kpi: {
    id: "kpi", title: "Smart Wastewater: KPIs & Dashboards", tag: "KPIs and dashboards · activated sludge",
    blurb: "One live view of water, energy, reuse and cost, with the power single-line diagram.",
    tabs: ["home", "electrical"], start: "home", other: "process",
  },
};

export const SITE = SITES[import.meta.env.VITE_SITE === "kpi" ? "kpi" : "process"];
export const OTHER = SITES[SITE.other];

/** where the other website lives: set VITE_PROCESS_URL / VITE_KPI_URL on Vercel; local dev uses the two dev ports */
const urlOf = (id: SiteId): string => {
  const set = (id === "kpi" ? import.meta.env.VITE_KPI_URL : import.meta.env.VITE_PROCESS_URL) as string | undefined;
  if (set) return set.replace(/\/$/, "");
  return import.meta.env.DEV ? `http://localhost:${id === "kpi" ? 4728 : 4727}` : "";
};

export const ownsTab = (t: TabId) => SITE.tabs.includes(t);
export const otherUrl = urlOf(SITE.other);

/** link to a tab on the other website; the theme and stage travel with it so the viewer lands straight inside */
export const otherHref = (tab: TabId, stage: string | undefined, theme: string) => {
  const q = new URLSearchParams({ tab, theme });
  if (stage) q.set("stage", stage);
  return `${otherUrl}/?${q.toString()}`;
};

/** a link that was opened from the other website: ?tab=...&stage=...&theme=... */
export const readDeepLink = (): { tab: TabId; stage?: string; theme?: "light" | "dark" } | null => {
  const q = new URLSearchParams(window.location.search);
  const tab = q.get("tab") as TabId | null;
  if (!tab || !ownsTab(tab)) return null;
  const theme = q.get("theme");
  return { tab, stage: q.get("stage") ?? undefined, theme: theme === "light" || theme === "dark" ? theme : undefined };
};
