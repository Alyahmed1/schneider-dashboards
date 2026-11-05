/* ================= The demo assistant: free, offline, no API =================
   It reads the same data as every screen (the scenarios, alarms and work orders), so every number it quotes is on the dashboard too.
   It matches the question to a topic (alarms, recycling, a scenario, what MMM means ...) and then builds the answer. */
import { PAGES } from "./pages";
import { AREAS, AREA_NAME, buildActive, type AlarmItem, type Area, type WorkOrder } from "./store";
import { toneOf } from "./diagram";
import type { TabId } from "./App";

export type Action = { label: string; do: { type: "go"; tab: TabId } | { type: "scn"; area: Area; id: string } | { type: "wo" } | { type: "reset" } };
export interface Answer { text: string; actions?: Action[]; chips?: string[] }
export type Ctx = { scn: Record<Area, string>; alarms: AlarmItem[]; openWo: WorkOrder[] };

export const SUGGESTED = [
  "What needs attention now?",
  "What does MMM mean?",
  "How much water do we recycle?",
  "Which equipment is in alert?",
  "What happens in heavy rain?",
];

const has = (q: string, ...w: string[]) => w.some((x) => q.includes(x));
const num = (v: number, dec: number) => v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** one reading of one piece of equipment, for the scenario that is on right now */
function read(c: Ctx, area: Area, id: string, key: string) {
  const m = PAGES[area].metrics(id, c.scn[area]).find((x) => x.k === key);
  if (!m) return { text: "-", v: 0, tone: "good" as const };
  return { text: `${num(m.v, m.dec)} ${m.unit}`.trim(), v: m.v, tone: m.tone };
}
const tab = (a: Area): TabId => a;

/** which equipment is out of range, per area */
function inAlert(c: Ctx) {
  return AREAS.map((area) => {
    const cfg = PAGES[area];
    const bad = cfg.equip.filter((e) => toneOf(cfg.metrics(e.id, c.scn[area])) !== "good").map((e) => {
      const off = cfg.metrics(e.id, c.scn[area]).filter((m) => m.tone !== "good");
      const m = off.find((x) => x.tone === "bad") ?? off[0];
      return `${e.name} (${m.label.toLowerCase()} ${num(m.v, m.dec)} ${m.unit})`.replace(/\s+\)/, ")");
    });
    return { area, list: bad };
  });
}

/** which scenario the question is about, if any */
function scenarioIn(q: string): { area: Area; id: string } | "normal" | null {
  if (has(q, "back to normal", "reset", "everything normal", "all normal")) return "normal";
  if (has(q, "cip fault", "rinse fault", "caustic")) return { area: "cpg", id: "cip" };
  if (has(q, "fouling", "foul", "clog")) return { area: "process", id: "fouling" };
  if (has(q, "storm", "muddy", "turbid", "river")) return { area: "process", id: "storm" };
  if (has(q, "drought", "dry spell", "scarce", "no rain")) return { area: "mmm", id: "drought" };
  if (has(q, "rain", "flood", "tailings dam fill")) return { area: "mmm", id: "rain" };
  if (has(q, "hot day", "heat", "summer", "hot ")) return { area: "cpg", id: "hot" };
  return null;
}

export function ask(raw: string, c: Ctx): Answer {
  const q = ` ${raw.toLowerCase().replace(/[?!.,]/g, " ")} `;
  const crit = c.alarms.filter((a) => a.sev === "bad");
  const warn = c.alarms.filter((a) => a.sev === "warn");

  // ---- hello, help, thanks ----
  if (has(q, " hi ", " hello ", " hey ", "help", "what can you do", "who are you")) {
    return { text: "Hi, I'm the water assistant. I answer from the same data as the screens: alarms, work orders, how much water we recycle, what each area means, and what happens in a scenario like heavy rain.", chips: SUGGESTED };
  }
  if (has(q, "thank", "thanks")) return { text: "You're welcome. Ask me anything else about the water.", chips: SUGGESTED };

  // ---- what MMM / CPG / the process means ----
  if (has(q, "mmm", "mining", "minerals", "mine ") && has(q, "mean", "stand", "what is", "what's", "explain")) {
    return {
      text: "MMM means Mining, Minerals & Metals. A mine uses a lot of water: to crush and grind the ore, to float the valuable metal out, to settle the waste (tailings) and to keep dust down. The big goal is to recycle as much as possible and keep the tailings dam safe. The MMM tab follows that water from the pit to the dam and back.",
      actions: [{ label: "Open the MMM tab", do: { type: "go", tab: "mmm" } }],
      chips: ["What is the tailings dam freeboard?", "What happens in heavy rain?"],
    };
  }
  if (has(q, "cpg", "consumer packaged", "packaged goods", "bottling", "factory") && has(q, "mean", "stand", "what is", "what's", "explain")) {
    return {
      text: "CPG means Consumer Packaged Goods: food, drinks and household products. Water is an ingredient and also the cleaning tool: it is treated to drinking quality, used on the filling line, and used again for CIP (clean-in-place) washing. The goals are less water per litre of product and a perfect clean every time. The CPG tab follows that water.",
      actions: [{ label: "Open the CPG tab", do: { type: "go", tab: "cpg" } }],
      chips: ["What is CIP?", "How much water per litre of product?"],
    };
  }
  if (has(q, "industrial water process", "treatment train", "what is the process", "explain the process")) {
    return {
      text: "The Process tab follows water through a treatment train: intake, clarifier, sand filter, ultrafiltration, reverse osmosis, a treated tank, then the users (cooling tower, boiler, production) and finally wastewater treatment, where most of it is cleaned and sent back to the start for reuse.",
      actions: [{ label: "Open the Process tab", do: { type: "go", tab: "process" } }],
    };
  }

  // ---- what happens in a scenario / try it ----
  const sc = scenarioIn(q);
  if (sc === "normal") {
    return { text: "I can set all three areas back to a normal day and clear any alarms you marked done.", actions: [{ label: "Set everything back to normal", do: { type: "reset" } }] };
  }
  if (sc && has(q, "happen", "what if", "scenario", "try", "show", "simulate", "when it", "in ", "during")) {
    const area = sc.area;
    const def = PAGES[area].scenarios.find((s) => s.id === sc.id)!;
    const next = buildActive({ ...c.scn, [area]: sc.id });
    const before = buildActive(c.scn).length;
    const extra = next.filter((a) => a.area === area);
    const nCrit = extra.filter((a) => a.sev === "bad").length;
    return {
      text: `${def.story}\nThat puts ${extra.length} piece${extra.length === 1 ? "" : "s"} of equipment in alert in the ${AREA_NAME[area]} area${nCrit ? `, ${nCrit} of them critical` : ""}. Active alarms on the site would go from ${before} to ${next.length}.`,
      actions: [{ label: `Try it: ${def.label}`, do: { type: "scn", area, id: sc.id } }, { label: "Open the Alarms tab", do: { type: "go", tab: "alarms" } }],
      chips: ["What needs attention now?", "Which equipment is in alert?"],
    };
  }

  // ---- what should I fix first ----
  if (has(q, "fix first", "first", "priority", "most urgent", "worst", "start with")) {
    const top = crit[0] ?? warn[0];
    if (!top) return { text: "Nothing needs fixing right now: every area is normal. Try a scenario such as heavy rain to see what the priorities would be.", chips: SUGGESTED };
    const wo = c.openWo.find((w) => w.alarmId === top.id);
    return {
      text: `Start with ${top.title.toLowerCase()} at ${top.where} (${top.value}${top.limit ? `, normal is ${top.limit}` : ""}). ${top.detail}${wo ? `\nIts work order is ${wo.id}.` : ""}`,
      actions: [{ label: `Open the ${AREA_NAME[top.area]} tab`, do: { type: "go", tab: tab(top.area) } }, ...(wo ? [{ label: "Open work orders", do: { type: "wo" as const } }] : [])],
      chips: ["What needs attention now?", "Which equipment is in alert?"],
    };
  }

  // ---- alarms and what needs attention ----
  if (has(q, "alarm", "attention", "critical", "problem", "wrong", "alert", "urgent", "issue")) {
    if (has(q, "equipment", "which", "where")) {
      const rows = inAlert(c);
      const lines = rows.map((r) => `${AREA_NAME[r.area]}: ${r.list.length ? r.list.join("; ") : "all normal"}`).join("\n");
      return { text: lines, actions: [{ label: "Open the Alarms tab", do: { type: "go", tab: "alarms" } }], chips: ["What should I fix first?", "What needs attention now?"] };
    }
    if (!c.alarms.length) return { text: "Nothing needs attention right now: all three areas are normal. Pick a scenario such as heavy rain and I'll tell you what would go wrong.", chips: SUGGESTED };
    const top = c.alarms.slice(0, 3).map((a) => `${a.title} (${a.where})`).join("; ");
    return {
      text: `There ${c.alarms.length === 1 ? "is" : "are"} ${c.alarms.length} active alarm${c.alarms.length === 1 ? "" : "s"}: ${crit.length} critical and ${warn.length} warning${warn.length === 1 ? "" : "s"}.\nMost urgent: ${top}.`,
      actions: [{ label: "Open the Alarms tab", do: { type: "go", tab: "alarms" } }],
      chips: ["What should I fix first?", "Which equipment is in alert?"],
    };
  }
  if (has(q, "equipment") && has(q, "alert", "fault", "warning", "off", "out of range", "which")) {
    const rows = inAlert(c);
    return { text: rows.map((r) => `${AREA_NAME[r.area]}: ${r.list.length ? r.list.join("; ") : "all normal"}`).join("\n"), actions: [{ label: "Open the Alarms tab", do: { type: "go", tab: "alarms" } }], chips: ["What should I fix first?"] };
  }

  // ---- work orders ----
  if (has(q, "work order", "maintenance", "job ", "jobs", "repair")) {
    const prog = c.openWo.filter((w) => w.status === "In progress").length;
    const high = c.openWo.filter((w) => w.priority === "High");
    return {
      text: `${c.openWo.length} work orders are open, ${prog} of them in progress.${high.length ? `\nHigh priority: ${high.slice(0, 3).map((w) => w.title).join("; ")}.` : ""}\nOpen the window to start a job, tick off its steps or mark it done (that also marks its alarm done).`,
      actions: [{ label: "Open work orders", do: { type: "wo" } }],
    };
  }

  // ---- recycling and reuse ----
  if (has(q, "recycl", "reuse", "re-use", "recover", "save water", "saving", "wasted")) {
    const p = read(c, "process", "etp", "reuse"), m = read(c, "mmm", "pond", "recy"), f = read(c, "cpg", "etp", "reuse");
    return {
      text: `Process plant: ${p.text} of the water is reused. Mine: ${m.text} is recycled. Factory: ${f.text} is recovered.\nThe mine recycles the most because its tailings dam and return pond give the water a natural way back to the plant.`,
      actions: [{ label: "Open the MMM tab", do: { type: "go", tab: "mmm" } }],
      chips: ["What is the water per tonne of ore?", "How much water per litre of product?"],
    };
  }

  // ---- energy ----
  if (has(q, "energy", "power", "kwh", "electric")) {
    const sec = read(c, "process", "ro", "sec");
    return {
      text: `Reverse osmosis uses ${sec.text}, the biggest energy cost in the treatment train. It goes up when the membranes foul, so a chemical clean (CIP) saves power as well as keeping quality.`,
      actions: [{ label: "Open the Process tab", do: { type: "go", tab: "process" } }],
      chips: ["What happens with RO fouling?"],
    };
  }

  // ---- RO ----
  if (has(q, "reverse osmosis", " ro ", "membrane", "permeate")) {
    const rec = read(c, "process", "ro", "rec"), dp = read(c, "process", "ro", "dp"), cond = read(c, "process", "ro", "cond");
    return {
      text: `Reverse osmosis: recovery ${rec.text}, pressure drop ${dp.text}, permeate conductivity ${cond.text}. ${dp.tone === "good" ? "The membranes are healthy." : "The pressure drop is high, so the membranes are fouling and a chemical clean is due."}`,
      actions: [{ label: "Open the Process tab", do: { type: "go", tab: "process" } }],
      chips: ["What happens with RO fouling?"],
    };
  }

  // ---- tailings dam ----
  if (has(q, "tailings", "freeboard", "dam ")) {
    const fb = read(c, "mmm", "tail", "fb"), lv = read(c, "mmm", "tail", "level");
    return {
      text: `Tailings dam freeboard is ${fb.text} and the pond level is ${lv.text}. Freeboard is the free height below the dam crest: if it gets too small the dam is at risk. ${fb.tone === "bad" ? "It is critically low, so the water must be pumped to treatment now." : "It is in a safe range."}`,
      actions: [{ label: "Open the MMM tab", do: { type: "go", tab: "mmm" } }],
      chips: ["What happens in heavy rain?"],
    };
  }

  // ---- CIP ----
  if (has(q, " cip ", "clean-in-place", "clean in place", "rinse")) {
    const r = read(c, "cpg", "cip", "rinse"), cy = read(c, "cpg", "cip", "cyc"), w = read(c, "cpg", "cip", "wuse");
    return {
      text: `CIP (clean-in-place) pumps hot caustic, rinse water and acid through pipes and tanks so nothing has to be taken apart. Today: ${cy.text || cy.v} cycles, rinse conductivity ${r.text} (target 5 µS/cm), ${w.text} of water. ${r.tone === "bad" ? "The rinse is still carrying caustic, so the cycle repeats and uses more water." : "The rinse is clean."}`,
      actions: [{ label: "Open the CPG tab", do: { type: "go", tab: "cpg" } }],
    };
  }

  // ---- water intensity ----
  if (has(q, "per tonne", "per ton ", "tonne of ore")) {
    const w = read(c, "mmm", "mill", "wpt");
    return { text: `The mill uses ${w.text} of ore. Every tonne of ore needs water to grind and float it, and the lower this number, the better the mine is doing.`, actions: [{ label: "Open the MMM tab", do: { type: "go", tab: "mmm" } }] };
  }
  if (has(q, "per litre", "per liter", "litre of product", "liter of product")) {
    const w = read(c, "cpg", "fill", "wpl");
    return { text: `The filling line uses ${w.text} of product. It would be 1.0 if the water only went into the bottle; the rest is rinsing and cleaning.`, actions: [{ label: "Open the CPG tab", do: { type: "go", tab: "cpg" } }] };
  }

  // ---- how to use ----
  if (has(q, "tour", "follow the water", "how do i", "how to", "guide", "use this")) {
    return { text: "Open Process, MMM or CPG and press the orange Follow the water button: it walks through every stage and explains it. Click any equipment to see what it does and its live readings. Use the three tabs at the top (like Normal day or Heavy rain) to change the situation and watch the alarms appear.", chips: SUGGESTED };
  }

  return { text: "I'm not sure about that one. I can answer about alarms, work orders, recycling, energy, the tailings dam, CIP cleaning, what MMM and CPG mean, and what happens in a scenario.", chips: SUGGESTED };
}
