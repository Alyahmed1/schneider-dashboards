import type { TabId } from "./App";

/** One site: the Smart Water Network dashboard, with every tab. */
export const SITE = {
  id: "network" as const,
  title: "Smart Water Network",
  tag: "Distribution network · New Cairo",
  blurb: "Every pipe, meter and pump of the city water network, coloured by consumption, on one live map",
  tabs: ["home", "network", "overview", "production", "electrical", "alarms", "maintenance"] as TabId[],
  start: "home" as TabId,
};
export const OTHER = SITE;
export const otherUrl = "";
export const otherHref = (_tab: TabId, _stage: string | undefined, _theme: string) => "";
export const ownsTab = (t: TabId) => SITE.tabs.includes(t);

/** a link that was opened with ?tab=...&stage=...&theme=... */
export const readDeepLink = (): { tab: TabId; stage?: string; theme?: "light" | "dark" } | null => {
  const q = new URLSearchParams(window.location.search);
  const tab = q.get("tab") as TabId | null;
  if (!tab || !ownsTab(tab)) return null;
  const theme = q.get("theme");
  return { tab, stage: q.get("stage") ?? undefined, theme: theme === "light" || theme === "dark" ? theme : undefined };
};
