import { ALARMS, ASSETS, budget, energyToday, fmt, forecast, LOADS, moistClass, pivotsAt, STATIONS, stationNow, type StationId } from "./farm";
import { LZONES, SENSORS, todayUseM3, zonesAt } from "./landscape";
import { compliance, gwAt, gwDay, PARAMS } from "./grey";
import type { ViewId } from "./App";

export interface Answer { text: string; view?: ViewId; target?: string }
export const SUGGESTIONS = ["Which pivot is driest?", "What should I do today?", "How are the pump stations?", "Any alarms?", "How is the grey water plant?", "Which landscape zones are watering?"];
const CLASS = { dry: "dry", low: "low", ok: "in the optimal range", wet: "wet" } as const;

/** answers from the dashboard's own data, no internet and no model: matches what you ask to a topic and reads the numbers */
export function answer(q: string, hour: number): Answer {
  const s = q.toLowerCase();
  const snap = pivotsAt(hour);
  const pid = s.match(/\bp\s?([1-8])\b/)?.[1] ?? s.match(/pivot\s*([1-8])/)?.[1];
  if (pid) {
    const n = snap.find((x) => x.p.id === `P${pid}`)!;
    return { text: `${n.p.id} (${n.p.crop}, ${n.p.stage}) is ${n.status.toLowerCase()}. Soil moisture is ${fmt(n.moist, 1)}% (${CLASS[moistClass(n.moist)]}) and ${fmt(n.applied, 1)} mm has gone on so far today.${n.p.fault ? ` Fault: ${n.p.fault}.` : ""}`, view: "pivots", target: n.p.id };
  }
  if (/landscape|garden|lawn|zone|controller|valve|sensor|probe/.test(s)) {
    const z = zonesAt(hour);
    const wet = z.filter((x) => x.status === "Watering");
    const off = SENSORS.filter((x) => x.status !== "OK");
    return { text: `${wet.length ? `Watering now: ${wet.map((x) => `${x.z.id} ${x.z.name}`).join(", ")}.` : "No landscape zone is watering right now."} The landscape uses about ${fmt(todayUseM3(), 1)} m³ today across ${LZONES.length} zones. ${z.filter((x) => x.status === "Fault").map((x) => `${x.z.id} has a fault: ${x.z.fault}.`).join(" ")} ${off.length} sensors need attention (${off.map((x) => x.id).join(", ")}).`, view: /sensor|probe/.test(s) ? "sensors" : /controller|valve/.test(s) ? "controllers" : "zones" };
  }
  if (/grey|gray|greywater|reuse|recycl|treat|chlorine|turbidity/.test(s)) {
    const g = gwAt(hour), d = gwDay();
    return { text: `The grey water plant makes about ${fmt(d.gen)} m³ a day and reuses ${fmt(d.landscape + d.farm)} m³ of it (${fmt(d.landscape)} on the landscape, ${fmt(d.farm)} on fodder). Storage is ${fmt((g.store / 60) * 100)}% full. Treated water is inside its limits ${fmt(compliance(), 1)}% of the hours; free chlorine is ${PARAMS.find((p) => p.id === "cl")!.outlet} mg/L.`, view: "process" };
  }
  if (/driest|dry|lowest|thirsty/.test(s)) {
    const d = [...snap].sort((a, b) => a.moist - b.moist).slice(0, 3);
    return { text: `Driest pivots: ${d.map((x) => `${x.p.id} ${x.p.crop} ${fmt(x.moist, 1)}%`).join(", ")}.`, view: "pivots", target: d[0].p.id };
  }
  if (/pump|station|ps-?[abc]|borehole|well|booster|canal/.test(s)) {
    const one = s.match(/ps-?([abc])/)?.[1]?.toUpperCase();
    const list = STATIONS.filter((x) => !one || x.id === `PS-${one}`).map((x) => { const n = stationNow(x.id, hour); return `${x.id} ${x.name}: ${n.running} of ${n.pumps.length} pumps running, ${fmt(n.flow)} m³/h, ${fmt(n.kw)} kW${n.short ? " (cannot keep up)" : ""}`; });
    return { text: list.join(". ") + ".", view: "pumps", target: one ? (`PS-${one}` as StationId) : undefined };
  }
  if (/energy|power|electric|kwh|tariff|peak/.test(s)) {
    const e = energyToday();
    return { text: `The farm draws about ${fmt(LOADS.reduce((a, l) => a + l.kw, 0))} kW on average and ${fmt(e.kwh)} kWh today, costing roughly ${fmt(e.cost)} LE. ${fmt(e.peakShare * 100)}% of the pumping falls in peak hours; moving half of it to the night would save about ${fmt(e.shiftSaving)} LE a day.`, view: "energy" };
  }
  if (/budget|allocation|water used|how much water/.test(s)) {
    const b = budget();
    return { text: `${fmt(b.pct)}% of the year's ${fmt(12)} M m³ allocation is used, with ${fmt(b.left / 1e6, 1)} M m³ left and ${b.yearGone}% of the year gone.`, view: "energy" };
  }
  if (/weather|rain|forecast|hot|wind|et0|\bet\b/.test(s)) {
    const f = forecast();
    const rain = f.find((x) => x.rain > 0);
    return { text: `Today ET₀ is ${f[0].et0} mm and the high is ${f[0].hi}°C. ${rain ? `Rain is forecast on ${rain.d} (${rain.rain} mm): skip that night's irrigation.` : "No rain is forecast this week."}`, view: "weather" };
  }
  if (/alarm|fault|problem|issue|wrong|critical|trip/.test(s)) {
    return { text: `${ALARMS.filter((a) => !a.done).length} open alarms. ${ALARMS.filter((a) => !a.done).slice(0, 4).map((a) => `${a.source}: ${a.text}`).join(" ")}`, view: "alarms" };
  }
  if (/maint|work order|service|repair/.test(s)) {
    const open = ASSETS.filter((a) => a.wo && a.wo.status !== "Closed");
    return { text: `${open.length} open work orders: ${open.map((a) => `${a.id} (${a.wo!.status.toLowerCase()}, ${a.wo!.priority.toLowerCase()})`).join(", ")}.` };
  }
  if (/should|today|recommend|advice|plan|do\b/.test(s)) {
    const acts: string[] = [];
    snap.filter((x) => x.p.fault).forEach((x) => acts.push(`repair ${x.p.id}: ${x.p.fault}`));
    snap.filter((x) => !x.p.fault && x.moist < 30).forEach((x) => acts.push(`bring ${x.p.id} irrigation forward, soil moisture is ${fmt(x.moist, 1)}%`));
    const rain = forecast().find((x) => x.rain > 0);
    if (rain) acts.push(`skip the night irrigation on ${rain.d}, rain is coming`);
    acts.push(`shift pumping out of the 17:00 to 22:00 peak to save about ${fmt(energyToday().shiftSaving)} LE a day`);
    return { text: `Today I would: ${acts.join("; ")}.`, view: "weather" };
  }
  return { text: "I answer from this dashboard's own data. Try: which pivot is driest, how is pivot P4, how are the pump stations, what is the water budget, what is the forecast, any alarms, which landscape zones are watering, or how is the grey water plant." };
}
