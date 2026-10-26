// The resident assistant's answers. In this demo they are written by simple rules from the dashboard's own live sample data; a production version would hand the same data to a language model as tools.
import { ZONES, type Pt, type ZoneId } from "./data";
import { GATES, LOTS, type Lot } from "./plan";
import { etaMinutes, gateQueue, lotOcc, lotTaken, networkIndex } from "./traffic";
import { zoneMw } from "./zonemodel";
import { waterNow } from "./watermodel";
import { rng } from "./live";

export type Card =
  | { t: "parking"; lot: Lot; free: number; occ: number; eta: number; gate: string }
  | { t: "gates"; rows: { id: string; name: string; cars: number; wait: number; best: boolean }[] }
  | { t: "zone"; id: ZoneId; name: string; blurb: string; feddan: number; mw: number; water: number }
  | { t: "pass"; name: string; code: string; gate: string; when: string; grid: boolean[][] }
  | { t: "issue"; wo: string; text: string }
  | { t: "stats"; items: { label: string; value: string }[] };

/** what the map beside the chat should show for the latest answer */
export interface Focus { zone?: ZoneId; lot?: string; route?: Pt[]; gate?: string }
export interface Reply { text: string; card?: Card; focus?: Focus; ask?: "issue" }
export interface Ctx { hour: number; pendingIssue: boolean; createOrder: (title: string) => string }

const has = (s: string, ...words: string[]) => words.some((w) => s.includes(w));

const LOT_WORDS: [string[], string][] = [
  [["hotel", "stay", "guest room"], "p2"], [["hospital", "clinic", "doctor", "medical"], "p3"], [["school", "kids", "children", "pickup", "drop off", "drop-off"], "p4"],
  [["club", "golf", "lagoon", "promenade"], "p5"], [["innovation", "office", "work", "hub"], "p6"], [["apartment", "residence", "flat"], "p7"], [["villa"], "p8"],
  [["mall", "shop", "plaza", "commercial", "market", "restaurant", "cafe"], "p1"],
];
const ZONE_WORDS: [string[], ZoneId][] = [
  [["hospital", "clinic", "medical"], "hospital"], [["school", "education"], "school"], [["hotel"], "hotel"], [["golf", "lagoon"], "golf"], [["villa"], "villas"],
  [["apartment", "flat"], "apartments"], [["commercial", "shop", "mall", "market"], "commercial"], [["innovation", "future"], "future"],
];

function parking(s: string, c: Ctx): Reply {
  const asked = LOT_WORDS.find(([w]) => has(s, ...w));
  const idx = networkIndex(c.hour);
  const open = LOTS.map((l) => ({ l, free: l.cap - lotTaken(l, c.hour) }));
  const best = asked ? open.find((x) => x.l.id === asked[1])! : open.reduce((a, b) => (b.free > a.free ? b : a));
  const gate = GATES.find((g) => g.id === best.l.gate)?.name ?? "";
  const occ = lotOcc(best.l, c.hour), eta = etaMinutes(best.l.route, idx);
  const tight = occ > 0.9;
  const alt = open.filter((x) => x.l.id !== best.l.id && x.free > 20).sort((a, b) => etaMinutes(a.l.route, idx) - etaMinutes(b.l.route, idx))[0];
  return {
    text: tight && alt ? `${best.l.name} is almost full (${best.free} spaces left). ${alt.l.name} has ${alt.free} free and is about as close, so I've shown ${best.l.name} but you may prefer that one.`
      : `${best.l.name} has ${best.free} free spaces right now. Come in by the ${gate} and it is about ${eta} ${eta === 1 ? "minute" : "minutes"} by car.`,
    card: { t: "parking", lot: best.l, free: best.free, occ, eta, gate },
    focus: { lot: best.l.id, route: best.l.route, gate: best.l.gate },
  };
}

function gates(c: Ctx): Reply {
  const rows = GATES.map((g) => ({ id: g.id, name: g.name, ...gateQueue(g.id, c.hour) }));
  const best = rows.reduce((a, b) => (b.wait < a.wait ? b : a));
  return {
    text: `The ${best.name} is quickest right now: ${best.cars} cars, about ${best.wait} minutes. The busiest is ${rows.reduce((a, b) => (b.cars > a.cars ? b : a)).name}.`,
    card: { t: "gates", rows: rows.map((r) => ({ ...r, best: r.id === best.id })) },
    focus: { gate: best.id },
  };
}

function zone(id: ZoneId, c: Ctx): Reply {
  const z = ZONES.find((x) => x.id === id)!;
  return {
    text: `${z.name}: ${z.blurb} It covers about ${z.feddan} feddan of the 380. I've marked it on the plan.`,
    card: { t: "zone", id, name: z.name, blurb: z.blurb, feddan: z.feddan, mw: zoneMw(id, z.mw, c.hour), water: z.water },
    focus: { zone: id },
  };
}

function pass(raw: string, c: Ctx): Reply {
  const m = /for ([A-Za-z]+)/.exec(raw);
  const name = m ? m[1][0].toUpperCase() + m[1].slice(1) : "Your guest";
  const rows = GATES.map((g) => ({ id: g.id, name: g.name, ...gateQueue(g.id, c.hour) }));
  const best = rows.reduce((a, b) => (b.wait < a.wait ? b : a));
  const r = rng(name.length * 977 + 31);
  const code = `TW-${Math.floor(r() * 900 + 100)}-${String.fromCharCode(65 + Math.floor(r() * 26))}${String.fromCharCode(65 + Math.floor(r() * 26))}`;
  const grid = Array.from({ length: 11 }, (_, y) => Array.from({ length: 11 }, (_, x) => {
    const finder = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
    return finder ? true : r() > 0.5;
  }));
  return { text: `Done. ${name}'s visitor pass is ready for tomorrow, 09:00 to 18:00. The ${best.name} usually has the shortest queue, so I've set the pass for that gate. It is a demo pass: it does not open a real gate.`, card: { t: "pass", name, code, gate: best.name, when: "Tomorrow, 09:00 to 18:00", grid }, focus: { gate: best.id } };
}

function stats(c: Ctx): Reply {
  const mw = ZONES.reduce((s, z) => s + zoneMw(z.id, z.mw, c.hour), 0), w = waterNow(c.hour);
  return {
    text: `Right now the community is using about ${mw.toFixed(1)} MW of power and ${Math.round(w).toLocaleString("en-US")} m³ of water per hour.`,
    card: { t: "stats", items: [{ label: "Power", value: `${mw.toFixed(1)} MW` }, { label: "Water", value: `${Math.round(w).toLocaleString("en-US")} m³/h` }, { label: "Traffic", value: `${Math.round(networkIndex(c.hour) * 100)}% congestion` }] },
  };
}

export const SUGGESTIONS = ["Where can I park near the hotel?", "Which gate is quickest right now?", "Where is the hospital?", "Create a visitor pass for Omar", "Report a problem", "How much water are we using?"];

/** answer one message */
export function reply(raw: string, c: Ctx): Reply {
  const s = raw.toLowerCase().trim();
  if (c.pendingIssue) {
    const wo = c.createOrder(raw.trim());
    return { text: `Thank you. I've logged it as ${wo} and sent it to the maintenance team. They aim to look at it within 24 hours.`, card: { t: "issue", wo, text: raw.trim() } };
  }
  if (has(s, "visitor", "pass", "guest")) return pass(raw, c);
  if (has(s, "park")) return parking(s, c);
  if (has(s, "report", "broken", "not working", "fault", "problem", "issue", "leak")) {
    if (s.split(/\s+/).length <= 4) return { text: "Of course. What is wrong, and where? For example: the street light by villa 12 is out.", ask: "issue" };
    const wo = c.createOrder(raw.trim());
    return { text: `Thank you. I've logged it as ${wo} and sent it to the maintenance team. They aim to look at it within 24 hours.`, card: { t: "issue", wo, text: raw.trim() } };
  }
  if (has(s, "gate", "queue", "entrance", "quickest", "fastest", "traffic", "wait")) return gates(c);
  if (has(s, "water", "energy", "power", "electric", "usage", "using")) return stats(c);
  const z = ZONE_WORDS.find(([w]) => has(s, ...w));
  if (z && has(s, "where", "find", "show", "locate", "map", "what", "tell")) return zone(z[1], c);
  if (has(s, "hello", "hi ", "hey", "help", "what can you")) return { text: "Hello, I'm the Telal West assistant. I can find you parking, tell you which gate is quickest, show where things are, create a visitor pass, log a problem for maintenance, or tell you how the community is doing. What would you like?" };
  return { text: "I'm not sure I understood that. I can help with parking, gate queues, finding places, visitor passes, reporting a problem, and water or power use. Try one of the suggestions below." };
}
