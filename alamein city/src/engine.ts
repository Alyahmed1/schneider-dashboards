import { BOQ, CITY, CONNECTED_POINTS, DOMAINS, FIELD_DEVICES, ZONES, type TabId } from "./data";
import type { CityModel } from "./model";
import type { Alert } from "./state";
import { fmt } from "./ui";

/* the Assistant is rule-based: it matches the question to a topic and answers from the Excel and the live sample numbers. No API, no cost. */
export interface Reply { text: string; goto?: { tab: TabId; label: string } }
interface Ctx { m: CityModel; alerts: Alert[]; zoneLabel: string; prices: { total: number; filled: number } }

const has = (q: string, ...w: string[]) => w.some((x) => q.includes(x));

export const SUGGESTIONS = ["How many smart poles are in the scope?", "What does the cybersecurity scope include?", "Which items need to be confirmed in the Excel?", "How many connected points does the city have?", "Show me the open critical alerts", "How is the grid doing right now?", "What is the total price?", "Open parking"];

export function answer(raw: string, c: Ctx): Reply {
  const q = raw.toLowerCase().trim();
  const { m } = c;
  if (!q) return { text: "Ask me about the scope, the city numbers or the live status." };

  const open = q.match(/(?:open|show|go to|take me to)\s+(.+)/);
  if (open) {
    const t = open[1];
    const map: [string[], TabId, string][] = [[["overview", "home"], "overview", "Overview"], [["plan", "map"], "plan", "Master Plan"], [["utilit", "grid", "water", "meter", "light"], "utilities", "Utilities"], [["mobil", "park", "bus", "transport", "sign"], "mobility", "Mobility"], [["environ", "waste", "ibms", "building"], "environment", "Environment"], [["citizen", "billing", "wallet"], "citizens", "Citizens"], [["secur", "cyber", "platform"], "security", "Security"], [["scope", "boq", "price", "roadmap"], "scope", "Scope"]];
    const hit = map.find(([k]) => k.some((x) => t.includes(x)));
    if (hit) return { text: `Opening ${hit[2]}.`, goto: { tab: hit[1], label: hit[2] } };
  }

  if (has(q, "connected point", "endpoint", "total device", "how many device")) return { text: `${fmt(CONNECTED_POINTS)} connected points in total: ${fmt(CITY.meters)} smart meters, ${fmt(CITY.ibmsPoints)} IBMS points and ${fmt(FIELD_DEVICES)} field devices (poles, water sensors, bins, bus stations, signage screens, parking lots).`, goto: { tab: "plan", label: "Master Plan" } };
  if (has(q, "pole", "street light", "lighting")) return { text: `The scope has ${fmt(CITY.poles)} smart poles with a street lighting management application. Right now (${c.zoneLabel}): ${fmt(m.poles)} poles, ${m.polesFault} with a fault, saving about ${m.saved.toFixed(0)}% energy (sample).`, goto: { tab: "utilities", label: "Utilities" } };
  if (has(q, "meter", "ami")) return { text: `${fmt(CITY.meters)} smart meters on the AMI platform. In ${c.zoneLabel}: ${fmt(m.meters)}, ${m.metersOnlinePct.toFixed(1)}% reporting (sample).`, goto: { tab: "utilities", label: "Utilities" } };
  if (has(q, "water", "leak", "sensor")) return { text: `${fmt(CITY.waterSensors)} smart water sensors in the scope. Now (${c.zoneLabel}): ${fmt(m.sensors)} sensors, ${m.pressure.toFixed(1)} bar average pressure, ${m.nrw.toFixed(1)}% non-revenue water, ${m.leaks} possible leaks (sample).`, goto: { tab: "utilities", label: "Utilities" } };
  if (has(q, "grid", "load", "electric", "adms", "scada", "power")) return { text: `The grid load is ${m.loadMW.toFixed(1)} MW (${c.zoneLabel}, sample). The scope has a unified SCADA for electricity, water and gas, plus the ADMS (it appears twice in the Excel).`, goto: { tab: "utilities", label: "Utilities" } };
  if (has(q, "park")) return { text: `${fmt(CITY.parking)} parking lots in the scope. Now (${c.zoneLabel}): ${fmt(m.lots)} lots, ${m.occPct.toFixed(0)}% occupied (sample).`, goto: { tab: "mobility", label: "Mobility" } };
  if (has(q, "bus", "transport")) return { text: `${CITY.busStations} bus stations are in the scope. Now (${c.zoneLabel}): ${m.stations} stations, ${m.buses} buses on route, ${m.wait.toFixed(1)} min average wait, ${m.onTime.toFixed(0)}% on time (sample).`, goto: { tab: "mobility", label: "Mobility" } };
  if (has(q, "signage", "screen")) return { text: `${fmt(CITY.signage)} digital signage screens. Now (${c.zoneLabel}): ${fmt(m.screens)} screens, ${m.screensOnline.toFixed(1)}% online (sample).`, goto: { tab: "mobility", label: "Mobility" } };
  if (has(q, "waste", "bin", "garbage", "trash")) return { text: `${fmt(CITY.bins)} smart waste bins. Now (${c.zoneLabel}): ${fmt(m.bins)} bins, ${m.avgFill.toFixed(0)}% average fill, ${m.binsFull} above 80% and ${m.trucks} trucks on route (sample).`, goto: { tab: "environment", label: "Environment" } };
  if (has(q, "ibms", "building", "hvac")) return { text: `The IBMS covers ${fmt(CITY.ibmsPoints)} points. Now (${c.zoneLabel}): ${fmt(m.points)} points, ${m.inAlarm} in alarm, HVAC at ${fmt(m.hvacKw)} kW (sample).`, goto: { tab: "environment", label: "Environment" } };
  if (has(q, "citizen", "portal", "app", "billing", "wallet", "card")) return { text: `The citizen scope is the portal and city app (${fmt(CITY.citizenUnits)} units for 5 years), unified billing and smart cards with an e-wallet. Now: ${fmt(m.users)} active users, ${m.resolved.toFixed(0)}% of requests resolved in SLA, ${m.collection.toFixed(1)}% bills collected (sample).`, goto: { tab: "citizens", label: "Citizens" } };
  if (has(q, "cyber", "security", "firewall", "siem", "waf", "edr", "stra", "threat")) {
    const items = BOQ.filter((b) => b.domain === "Cybersecurity").map((b) => b.name).join("; ");
    return { text: `Cybersecurity scope: ${items}. Live (sample): ${fmt(m.blocked)} threats blocked today, ${m.openVulns} open vulnerabilities, ${m.patch.toFixed(1)}% patch compliance.`, goto: { tab: "security", label: "Security" } };
  }
  if (has(q, "confirm", "flag", "issue", "duplicate", "problem", "error", "typo")) {
    const f = BOQ.filter((b) => b.flag);
    return { text: `${f.length} items need confirming in the Excel:\n${f.map((b) => `• #${b.id} ${b.name}: ${b.flag}`).join("\n")}`, goto: { tab: "scope", label: "Scope" } };
  }
  if (has(q, "price", "cost", "total", "budget", "egp")) return { text: c.prices.filled ? `${c.prices.filled} of ${BOQ.length} items are priced, for a total of ${fmt(c.prices.total)} EGP.` : "The Excel has no prices, so the total is TBD. Type prices into the BoQ table on the Scope tab and the totals and cost charts update by themselves.", goto: { tab: "scope", label: "Scope" } };
  if (has(q, "operator", "workstation", "coc", "control room")) return { text: `The COC is sized for ${CITY.operators} operators with ${CITY.workstations} workstations, servers and storage for at least 5 years, and EOR switches linked to the existing core.`, goto: { tab: "security", label: "Security" } };
  if (has(q, "year", "warranty", "support", "licen", "maintenance", "roadmap")) return { text: `The Excel asks for ${CITY.years} years of licences, warranty, training, software maintenance, upgrade and support, plus a service desk during business hours.`, goto: { tab: "scope", label: "Scope" } };
  if (has(q, "alert", "critical", "alarm", "incident")) {
    const crit = c.alerts.filter((a) => !a.ack && a.sev === "critical");
    return { text: crit.length ? `${crit.length} critical alerts are open:\n${crit.slice(0, 4).map((a) => `• ${a.text} (${a.domain})`).join("\n")}` : "No critical alerts are open right now.", goto: { tab: "overview", label: "Overview" } };
  }
  if (has(q, "health", "status", "how is", "overall")) return { text: `Overall platform health is ${m.overall.toFixed(1)}% (${c.zoneLabel}, sample). Domains: ${m.health.map((h) => `${h.domain} ${h.score.toFixed(1)}%`).join(", ")}.`, goto: { tab: "overview", label: "Overview" } };
  if (has(q, "zone", "district", "area", "where")) return { text: `The master plan has ${ZONES.length} zones: ${ZONES.map((z) => z.name).join(", ")}. Click a zone on the map, or use the zone filter in the bar, and every tab follows it.`, goto: { tab: "plan", label: "Master Plan" } };
  if (has(q, "domain", "pivot", "scope", "include", "what is in", "boq")) return { text: `The BoQ has ${BOQ.length} items in ${DOMAINS.length} domains: ${DOMAINS.join(", ")}. All are lump sums except the 31 workstations and the 5-year licences.`, goto: { tab: "scope", label: "Scope" } };
  if (has(q, "hello", "help", "what can")) return { text: "I can answer about the scope (BoQ items, quantities, domains, items to confirm, prices), the city numbers (meters, poles, sensors, bins, parking, signage) and the live status (alerts, load, health). Say \"open parking\" and I will take you there." };
  return { text: "I did not catch that. Try asking about poles, meters, water, parking, waste, cybersecurity, alerts, the total price or the items to confirm." };
}
