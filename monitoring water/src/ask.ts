import { PIVOTS, type PivotId } from "./pivots";
import { activeAlarms, applicationOf, avg, flowNow, hhmm, hour, planned, statusOf, windowHours, type Fleet, type PivotState } from "./model";
import { stateOf } from "./alarmdata";

/** offline assistant: answers from the live simulated state, no network. Scoped to the pivot on screen unless the question names others or the whole fleet. */
const ST = { on: "running", off: "idle", fault: "faulted" } as const;
const n0 = (v: number) => Math.round(v).toLocaleString("en-US");

export const SUGGESTIONS = ["Status", "Any alerts?", "Water used today", "Driest sensor", "Tank levels", "Next irrigation"];

export function answer(q: string, fleet: Fleet, scope: PivotId): string {
  const t = q.toLowerCase();
  const named = (t.match(/p[1-4]\b/g) ?? []).map((x) => x.toUpperCase() as PivotId);
  const wide = /\b(all|every|fleet|farm|total|overall|which|compare)\b/.test(t);
  const ids: PivotId[] = named.length ? [...new Set(named)] : wide ? PIVOTS.map((p) => p.id) : [scope];
  const ps = ids.map((id) => fleet.pivots[id]);
  const each = (f: (p: PivotState) => string) => ps.map((p) => `${p.id}: ${f(p)}`).join("\n");

  if (/alert|alarm|fault|problem|wrong|issue|trip|blocked|error/.test(t)) {
    const list = activeAlarms(fleet).filter((x) => (x.pivot ? ids.includes(x.pivot) : wide));
    const lines = list.map((x) => `${x.pivot ?? "Tanks"}: ${x.text} (${x.sev}, ${stateOf(x) === "UNACK" ? "not acknowledged" : "acknowledged"})`);
    return lines.length ? `${lines.length} active ${lines.length === 1 ? "alarm" : "alarms"}:\n${lines.join("\n")}\nOpen the bell in the header for the full list.` :`No active alarms on ${wide ? "the farm" : ids.join(", ")}.`;
  }
  if (/water|consum|used|m3|m³|volume|litre|liter/.test(t) && !/field water/.test(t)) {
    const tot = ps.reduce((s, p) => s + p.usedToday, 0);
    const plan = ps.reduce((s, p) => s + planned(p).reduce((a, b) => a + b, 0), 0);
    return `${each((p) => `${n0(p.usedToday)} m³ so far today`)}${ps.length > 1 ? `\nTotal ${n0(tot)} m³ of ${n0(plan)} m³ planned.` : `\nThat is ${plan ? Math.round((tot / plan) * 100) : 0}% of today's plan (${n0(plan)} m³).`}`;
  }
  if (/moist|dry|soil|sensor/.test(t)) {
    return each((p) => {
      const lo = Math.min(...p.moisture), i = p.moisture.indexOf(lo);
      return `average ${Math.round(avg(p.moisture))}%, driest M${i + 1} at ${Math.round(lo)}%${lo < p.dryLimit ? ` (below the ${p.dryLimit}% limit)` : ""}`;
    });
  }
  if (/tank|storage|reservoir|pump|stock/.test(t)) {
    const pm = fleet.pumps;
    return `Tank 1 ${Math.round(fleet.storage[0])}%, Tank 2 ${Math.round(fleet.storage[1])}%, Tank 3 ${Math.round(fleet.storage[2])}%.\nPumping window ${hour(pm.from)} to ${hour(pm.to)}, pumps on: ${pm.on.map((o, i) => (o ? `T${i + 1}` : "")).filter(Boolean).join(", ") || "none"}.`;
  }
  if (/schedul|window|when|next|start|stop|time/.test(t)) {
    return each((p) => `window ${hour(p.win[0])} to ${hour(p.win[1])} (${windowHours(p.win)} h), ${ST[statusOf(p)]} now`) + `\nTime now ${hhmm(fleet.clock)}.`;
  }
  if (/flow|speed|applic|depth|pressure/.test(t)) {
    return each((p) => `${n0(flowNow(p))} m³/h, speed ${p.speed}%, application ${applicationOf(p)} mm`);
  }
  if (/wind|gust/.test(t)) return each((p) => `wind gusts ${p.wind} km/h`);
  // status, or anything the assistant does not recognise
  const head = ps.length > 1 ? `${ps.filter((p) => statusOf(p) === "on").length} of ${ps.length} pivots running, ${activeAlarms(fleet).length} active alarms.\n` : "";
  return head + each((p) => `${ST[statusOf(p)]}, field water ${Math.round(p.fieldWater)}%, flow ${n0(flowNow(p))} m³/h, ${activeAlarms(fleet, p.id).length} active ${activeAlarms(fleet, p.id).length === 1 ? "alarm" : "alarms"}`);
}
