/* ================= The demo assistant: free, offline, no API =================
   It reads the same network model as every screen, so every number it quotes is on the dashboard too.
   It works by matching the question to a topic (peak use, leaks, pressure, zones, what to fix ...) and then computing the answer. */
import { INSTRUMENTS, LEAKS, NET, networkAt, pipeById, ZONES } from "./network";
import { LOADS } from "./cmms";
import type { Metric } from "./mapcolor";

export interface Answer { text: string; show?: { hour: number; metric: Metric; label: string }; chips?: string[] }

const hh = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const f0 = (n: number) => Math.round(n).toLocaleString("en-US");
const HOURS = Array.from({ length: 96 }, (_, i) => i / 4);
const best = <T,>(arr: T[], key: (x: T) => number, dir: 1 | -1 = 1) => arr.reduce((a, b) => (key(b) * dir > key(a) * dir ? b : a));
const word = (h: number) => (h < 5 ? "in the middle of the night" : h < 9 ? "in the morning rush" : h < 17 ? "during the day" : h < 21 ? "in the evening" : "late at night");

export const SUGGESTED = [
  "When is the most consumption?",
  "When is the most leakage?",
  "Which zone has the lowest pressure?",
  "What should I fix first?",
  "How much water do we lose?",
];

const has = (q: string, ...w: string[]) => w.some((x) => q.includes(x));

export function ask(raw: string): Answer {
  const q = raw.toLowerCase().replace(/[?!.,]/g, " ");
  const zone = ZONES.find((z) => q.includes(z.name.toLowerCase()) || q.includes(z.id.toLowerCase() + " "));
  const peakHour = best(HOURS, (h) => networkAt(h).supplied);
  const lowHour = best(HOURS, (h) => networkAt(h).supplied, -1);
  const peak = networkAt(peakHour), low = networkAt(lowHour);

  // ---- a question about one zone ----
  if (zone && !has(q, "which zone", "what zone")) {
    const zh = best(HOURS, (h) => networkAt(h).zones[zone.id].supplied);
    const zs = networkAt(zh).zones[zone.id];
    const wp = best(HOURS, (h) => networkAt(h).zones[zone.id].minPressure, -1);
    const wpv = networkAt(wp).zones[zone.id].minPressure;
    const metric: Metric = has(q, "leak", "loss", "lost", "nrw") ? "Leakage" : has(q, "pressure") ? "Pressure" : "Consumption";
    return {
      text: `${zone.name}: uses the most at ${hh(zh)} (${f0(zs.supplied)} L/s). About ${(zone.nrw * 100).toFixed(0)}% of the water that enters it is lost. Its pressure is lowest at ${hh(wp)} (${wpv.toFixed(1)} bar${wpv < 2.5 ? ", below the 2.5 bar minimum" : ", fine"}).${zs.leaks ? ` It has ${zs.leaks} known leak${zs.leaks > 1 ? "s" : ""}.` : ""}`,
      show: { hour: zh, metric, label: `Show ${zone.name} on the map` },
      chips: ["What should I fix first?", "Which zone has the most leakage?"],
    };
  }

  // ---- when is the most / least consumption ----
  if (has(q, "consum", "demand", "usage", "use the most", "busiest", "peak", "flow") && !has(q, "leak", "loss", "lost", "nrw", "pressure")) {
    if (has(q, "least", "lowest", "minimum", "quiet", "smallest", "low ")) {
      return { text: `The lowest consumption is at ${hh(lowHour)}, ${word(lowHour)}: about ${f0(low.supplied)} L/s, which is ${Math.round((low.supplied / peak.supplied) * 100)}% of the peak. The reservoir fills at that time.`, show: { hour: lowHour, metric: "Consumption", label: `Show ${hh(lowHour)} on the map` }, chips: ["When is the most consumption?"] };
    }
    const topZone = best(ZONES, (z) => peak.zones[z.id].supplied);
    const evening = best(HOURS.filter((h) => h >= 16 && h <= 22), (h) => networkAt(h).supplied);
    return {
      text: `The most consumption is at ${hh(peakHour)}, ${word(peakHour)}: about ${f0(peak.supplied)} L/s. There is a second, smaller peak at ${hh(evening)} (${f0(networkAt(evening).supplied)} L/s). At the peak the biggest user is ${topZone.name} with ${f0(peak.zones[topZone.id].supplied)} L/s.`,
      show: { hour: peakHour, metric: "Consumption", label: `Show ${hh(peakHour)} on the map` },
      chips: ["When is the least consumption?", "Which zone uses the most water?"],
    };
  }

  // ---- leakage and water loss ----
  if (has(q, "leak", "loss", "lost", "lose", "nrw", "non-revenue", "non revenue", "burst")) {
    if (has(q, "which zone", "what zone", "where", "worst", "most") && !has(q, "when", "what time", "hour")) {
      const wz = best(ZONES, (z) => peak.zones[z.id].nrw);
      const lines = [...ZONES].sort((a, b) => b.nrw - a.nrw).slice(0, 3).map((z) => `${z.name} ${(z.nrw * 100).toFixed(0)}%`).join(", ");
      return { text: `${wz.name} loses the most: ${(wz.nrw * 100).toFixed(0)}% of its water. Top three: ${lines}. The biggest known burst is ${Math.max(...LEAKS.map((l) => l.rate))} L/s.`, show: { hour: 8, metric: "Leakage", label: "Show the leakage map" }, chips: ["How much water do we lose?", "What should I fix first?"] };
    }
    if (has(q, "how much", "total", "percent", "%", "day")) {
      const burst = LEAKS.reduce((a, l) => a + l.rate, 0);
      return { text: `We lose about ${(NET.nrw * 100).toFixed(1)}% of the water we send out: roughly ${f0(NET.supplied - NET.billed)} m³ a day. ${LEAKS.length} known leaks account for ${burst.toFixed(1)} L/s of it; the rest is spread-out leakage and unbilled use.`, show: { hour: 8, metric: "Leakage", label: "Show the leakage map" }, chips: ["Which zone has the most leakage?", "When is the most leakage?"] };
    }
    const shareAt = (h: number) => networkAt(h).loss / networkAt(h).supplied;
    const hs = best(HOURS, shareAt), lowShare = best(HOURS, shareAt, -1);
    const hl = best(HOURS, (h) => networkAt(h).loss);
    return {
      text: `As a share of the water supplied, leakage is highest at ${hh(hs)} (${(shareAt(hs) * 100).toFixed(0)}% lost), ${word(hs)}: demand is low, but the known bursts keep running. In litres per second the loss is largest at ${hh(hl)} (${f0(networkAt(hl).loss)} L/s) because the whole network is busy. It is lowest, as a share, at ${hh(lowShare)} (${(shareAt(lowShare) * 100).toFixed(0)}%).`,
      show: { hour: hs, metric: "Leakage", label: `Show ${hh(hs)} on the map` },
      chips: ["Which zone has the most leakage?", "How much water do we lose?"],
    };
  }

  // ---- pressure ----
  if (has(q, "pressure", "bar")) {
    const worst = best(ZONES.flatMap((z) => HOURS.map((h) => ({ z, h, v: networkAt(h).zones[z.id].minPressure }))), (x) => x.v, -1);
    const low = ZONES.filter((z) => HOURS.some((h) => networkAt(h).zones[z.id].minPressure < 2.5));
    return {
      text: `The lowest pressure is in ${worst.z.name}: ${worst.v.toFixed(1)} bar at ${hh(worst.h)}, ${worst.v < 2.5 ? "below the 2.5 bar service minimum" : "still above the minimum"}. ${low.length ? `Zones that dip under 2.5 bar during the day: ${low.map((z) => z.name).join(", ")}.` : "No zone drops under 2.5 bar."} Average pressure at the morning peak is ${(Object.values(peak.zones).reduce((a, z) => a + z.pressure, 0) / 6).toFixed(1)} bar.`,
      show: { hour: worst.h, metric: "Pressure", label: `Show ${hh(worst.h)} on the map` },
      chips: ["What should I fix first?", `Tell me about ${worst.z.name}`],
    };
  }

  // ---- which zone uses the most ----
  if (has(q, "which zone", "what zone", "biggest", "zones")) {
    const rank = [...ZONES].sort((a, b) => b.daily - a.daily).map((z) => `${z.name} ${f0(z.daily)} m³/day`);
    return { text: `By daily use: ${rank.join(", ")}.`, show: { hour: peakHour, metric: "Consumption", label: "Show the consumption map" }, chips: ["Which zone has the most leakage?", "Which zone has the lowest pressure?"] };
  }

  // ---- what to fix ----
  if (has(q, "fix", "priority", "problem", "wrong", "issue", "alarm", "attention", "urgent", "first")) {
    const items: string[] = [];
    const lowP = best(ZONES, (z) => peak.zones[z.id].minPressure, -1);
    if (peak.zones[lowP.id].minPressure < 2.5) items.push(`${lowP.name} pressure drops to ${peak.zones[lowP.id].minPressure.toFixed(1)} bar at the morning peak`);
    const big = best(LEAKS, (l) => l.rate);
    items.push(`the ${big.rate} L/s burst on ${pipeById(big.pipe).id} (${big.note})`);
    const off = INSTRUMENTS.filter((i) => i.forced === "offline");
    if (off.length) items.push(`${off.map((i) => i.id).join(", ")} is offline, so pressure there is unknown`);
    const hi = best(ZONES, (z) => z.nrw);
    items.push(`${hi.name} loses ${(hi.nrw * 100).toFixed(0)}% of its water`);
    return { text: `In this order: ${items.map((t, i) => `${i + 1}) ${t}`).join("; ")}.`, show: { hour: peakHour, metric: "Pressure", label: "Show the pressure map" }, chips: ["Which zone has the lowest pressure?", "How much water do we lose?"] };
  }

  // ---- reservoir ----
  if (has(q, "reservoir", "tank", "level")) {
    const hi = best(HOURS, (h) => networkAt(h).tank), lo = best(HOURS, (h) => networkAt(h).tank, -1);
    return { text: `The reservoir is fullest at ${hh(hi)} (${networkAt(hi).tank.toFixed(0)}%) and emptiest at ${hh(lo)} (${networkAt(lo).tank.toFixed(0)}%). It fills at night and covers the morning and evening peaks.`, chips: ["When is the most consumption?"] };
  }

  // ---- water quality ----
  if (has(q, "chlorine", "quality", "turbidity", "clean", "safe")) {
    const w = best(ZONES.flatMap((z) => HOURS.map((h) => ({ z, h, v: networkAt(h).zones[z.id].minChlorine }))), (x) => x.v, -1);
    return { text: `Water quality is within limits: 8 of 8 checks pass at the tap. The lowest chlorine is ${w.v.toFixed(2)} mg/L in ${w.z.name} at ${hh(w.h)} (the water is oldest when demand is low). The target is 0.2 to 1.0 mg/L.`, chips: ["Which zone has the lowest pressure?"] };
  }

  // ---- energy ----
  if (has(q, "energy", "power", "electric", "kwh", "pump")) {
    const total = LOADS.reduce((a, l) => a + l.kw, 0);
    return { text: `The network draws about ${f0(total)} kW. The PS-1 high-lift pumps use ${f0(LOADS[0].kw)} kW, which is ${Math.round((LOADS[0].kw / total) * 100)}% of it. A micro-hydro turbine and a solar field cover part of that.`, chips: ["When is the most consumption?"] };
  }

  // ---- greetings, help, and anything else ----
  if (has(q, "hello", "hi ", "hey", "help", "what can you")) {
    return { text: "Hi! I'm the demo assistant. I read the network model on this screen, so I can tell you when consumption or leakage peaks, which zone has low pressure, what to fix first, and how the reservoir, quality and energy look. Try one of the questions below.", chips: SUGGESTED };
  }
  return { text: "I can answer questions about consumption, leakage and water loss, pressure, zones, the reservoir, water quality and energy. For example:", chips: SUGGESTED };
}
