/* ================= The demo assistant: free, offline, no API =================
   It reads the same sample data as every screen (data.ts, cmms.ts, alarmLog.ts), so every number it quotes is on the dashboard too.
   It matches the question to a topic (alarms, lanes, quality, energy ...) and then computes the answer.
   Each website only answers about its own tabs: a topic that lives on the other site gets a short pointer and a link there. */
import { complianceScore, fmt, lanes, overviewKpis, PLANT, PRICE, QUALITY, qualityOk, stages, type Filters, type Lane } from "./data";
import { ASSETS, GEN_KW, LOADS, predictive, SOLAR_KW, WORK_ORDERS } from "./cmms";
import { activeAlarms, type DoneInfo } from "./AlarmsContext";
import { ALARM_LOG } from "./alarmLog";
import { OTHER, ownsTab } from "./site";
import type { TabId } from "./App";

export interface Answer { text: string; go?: { tab: TabId; stage?: string; label: string }; chips?: string[] }
export interface Ctx { done: Record<string, DoneInfo> }

const F: Filters = { range: "7D", area: "All plant" };

const SUGGEST_PROCESS = [
  "What should I fix first?",
  "How is Lane B doing?",
  "Is the effluent within limits?",
  "Which asset is most likely to fail?",
  "Which work orders are overdue?",
];
const SUGGEST_KPI = [
  "How much water do we treat?",
  "How much energy do we use?",
  "How much power does the plant make?",
  "How much does treatment cost?",
  "Is the plant compliant?",
];
export const SUGGESTED = ownsTab("overview") ? SUGGEST_PROCESS : SUGGEST_KPI;

const has = (q: string, ...w: string[]) => w.some((x) => q.includes(x));
const pct = (n: number) => `${Math.round(n)}%`;
const SEV = { Critical: 0, Warning: 1, Info: 2 } as const;
const openOrders = () => WORK_ORDERS.filter((w) => w.status !== "Done");
const since = (m: number) => (m < 60 ? `${m} min` : m < 2880 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} days`);

/** which alarms are still open (it follows what the user marked done on the Alarms page), worst first, newest first */
const openAlarms = (c: Ctx) => activeAlarms(ALARM_LOG, c.done).sort((a, b) => SEV[a.sev] - SEV[b.sev] || a.minsAgo - b.minsAgo);

const STAGE_WORDS: { id: string; words: string[] }[] = [
  { id: "intake", words: ["inlet", "influent", "screen", "pumping"] },
  { id: "pre", words: ["grit", "grease", "classifier"] },
  { id: "hp", words: ["primary", "primary sludge"] },
  { id: "ro", words: ["aeration", "blower", "oxygen", "mlss", "sludge age", "diffuser"] },
  { id: "erd", words: ["secondary", "return sludge", "clarifier"] },
  { id: "post", words: ["tertiary", "disinfection", "uv", "disc filter", "turbidity"] },
  { id: "net", words: ["reuse", "irrigation", "outfall", "effluent flow"] },
  { id: "tank", words: ["digester", "biogas", "thicken", "cake", "sludge & biogas"] },
];

function stageAnswer(id: string): Answer {
  const s = stages(F).find((x) => x.id === id)!;
  const alarm = s.equipment.filter((e) => e.state === "Alarm"), idle = s.equipment.filter((e) => e.state === "Standby");
  return {
    text: `${s.name} (${s.short}): ${fmt(s.flow)} ${s.unit}. ${s.note}. Readings: ${s.readings.map((r) => `${r.label} ${r.value}${r.unit ? ` ${r.unit}` : ""}`).join(", ")}. Equipment: ${s.equipment.length}, ${alarm.length ? `${alarm.map((e) => e.name).join(", ")} in alarm` : "none in alarm"}${idle.length ? `, ${idle.map((e) => e.name).join(", ")} on standby` : ""}.`,
    go: { tab: "production", stage: s.id, label: `Open ${s.name}` },
    chips: ["What should I fix first?", "Compare the three lanes"],
  };
}

function laneAnswer(l: Lane): Answer {
  const letter = l.name.slice(-1);
  const dif = ASSETS.find((a) => a.name === `Diffusers · ${l.name}`);
  const wos = openOrders().filter((w) => w.area === l.name);
  const status = l.tone === "bad" ? "It needs attention." : l.tone === "warn" ? "Worth watching." : "It is healthy.";
  const clean = l.nextCleanDays <= 7 ? `a diffuser clean is due in ${l.nextCleanDays} days` : `the next diffuser clean is in ${l.nextCleanDays} days`;
  return {
    text: `${l.name}: treats ${fmt(l.flow)} m³/h. Dissolved oxygen is ${l.oxygen} mg/L${l.oxygen < 1.5 ? ", below the 1.5 mg/L alarm limit" : ", within limits"}, MLSS ${fmt(l.mlss)} mg/L, sludge age ${l.sludgeAge} days. Last clean ${l.lastClean}; ${clean}. ${dif ? `Diffuser health ${dif.health}/100. ` : ""}${status}${wos.length ? ` Open work orders: ${wos.map((w) => `${w.id} ${w.title}`).join("; ")}.` : ""}`,
    go: { tab: "production", stage: "ro", label: `Open the aeration lanes (lane ${letter})` },
    chips: ["What should I fix first?", "Compare the three lanes"],
  };
}

const answer = (raw: string, c: Ctx): Answer => {
  const q = ` ${raw.toLowerCase().replace(/[?!.,]/g, " ")} `;
  const st = stages(F);
  const ls = lanes(F);

  // ---- greetings and help ----
  if (/^\s*(hi|hello|hey|help|thanks|thank you)\b/.test(q) || has(q, "what can you")) {
    return ownsTab("overview")
      ? { text: "Hi! I'm the demo assistant. I read the sample data on this site, so I can tell you what to fix first, how each aeration lane is doing, whether the effluent meets its limits, which work orders are late and which machines are at risk. Try one of the questions below.", chips: SUGGESTED }
      : { text: "Hi! I'm the demo assistant. I read the sample data on this site, so I can tell you how much water the plant treats, how much energy it uses and makes, what treatment costs and whether the plant is compliant. Try one of the questions below.", chips: SUGGESTED };
  }

  // ---- compare the lanes ----
  if (has(q, "compare", "all lanes", "three lanes", "which lane", "best lane", "worst lane")) {
    const worst = [...ls].sort((a, b) => a.oxygen - b.oxygen)[0], best = [...ls].sort((a, b) => b.oxygen - a.oxygen)[0];
    return {
      text: `${ls.map((l) => `${l.name}: ${fmt(l.flow)} m³/h, oxygen ${l.oxygen} mg/L, MLSS ${fmt(l.mlss)} mg/L, sludge age ${l.sludgeAge} days`).join(". ")}. ${worst.name} has the lowest oxygen and should be cleaned first (in ${worst.nextCleanDays} days); ${best.name} has the most.`,
      go: { tab: "production", stage: "ro", label: "Open the aeration lanes" },
      chips: [`How is ${worst.name} doing?`, "What should I fix first?"],
    };
  }

  // ---- one lane ----
  const lm = q.match(/lane\s*([abc])\b/);
  if (lm) return laneAnswer(ls.find((l) => l.name === `Lane ${lm[1].toUpperCase()}`)!);

  // ---- one named asset (Blower B-401C, Grit classifier 2 ...) ----
  const asset = ASSETS.find((a) => q.includes(a.name.toLowerCase()));
  if (asset) {
    const p = predictive(F).find((r) => r.name === asset.name)!;
    return {
      text: `${asset.name}: health ${asset.health}/100, about ${asset.rul} days of life left (expected around ${p.failDate}), chance of failure in the next 30 days ${pct(p.risk)}. ${p.pred.signal} is ${p.pred.value} and ${p.pred.trend === "up" ? "rising" : p.pred.trend === "down" ? "falling" : "steady"}. Last service ${asset.lastService}, next PM ${asset.nextPm}. Advice: ${p.pred.action}`,
      go: { tab: "maintenance", label: "Open Maintenance" },
      chips: ["Which asset is most likely to fail?", "Which work orders are overdue?"],
    };
  }

  // ---- what to fix / alarms ----
  if (has(q, "fix", "priority", "problem", "wrong", "issue", "alarm", "attention", "urgent", "critical", "first", "worry", "bell")) {
    const open = openAlarms(c);
    const top = open.slice(0, 4);
    const crit = open.filter((a) => a.sev === "Critical").length;
    const late = openOrders().filter((w) => w.late);
    return {
      text: `${open.length} alarms are open, ${crit} critical. In this order: ${top.map((a, i) => `${i + 1}) ${a.text} (${a.where}, ${since(a.minsAgo)} ago${a.wo ? `, ${a.wo}` : ""})`).join("; ")}.${late.length ? ` ${late.length} work orders are already overdue: ${late.map((w) => w.id).join(", ")}.` : ""}`,
      go: { tab: "alarms", label: "Open the alarm page" },
      chips: ["How is Lane B doing?", "Which work orders are overdue?"],
    };
  }

  // ---- compliance (KPI site) ----
  if (has(q, "complian", "permit", "standard", "meet the")) {
    const bad = QUALITY.filter((x) => !qualityOk(x));
    return {
      text: `Effluent compliance is ${complianceScore(F)}% for the whole plant (lane A ${complianceScore({ ...F, area: "Lane A" })}%, lane B ${complianceScore({ ...F, area: "Lane B" })}%, lane C ${complianceScore({ ...F, area: "Lane C" })}%). ${bad.length === 0 ? `All ${QUALITY.length} effluent checks are within their limits.` : `${bad.length} checks are outside their limits: ${bad.map((x) => x.name).join(", ")}.`} Lane B is the weak spot because it is short of oxygen.`,
      go: { tab: "home", label: "Open Home" },
      chips: ["How much water do we treat?", "How much does treatment cost?"],
    };
  }

  // ---- effluent quality ----
  if (has(q, "quality", "effluent", "limit", "bod", "cod", "tss", "suspended", "ammonia", "nitrogen", "phosphorus", " ph ", "coliform", "turbidity", "safe", "discharge")) {
    const bad = QUALITY.filter((x) => !qualityOk(x));
    const near = QUALITY.filter((x) => qualityOk(x) && x.min === 0 && x.value / x.max > 0.75);
    const row = (x: (typeof QUALITY)[number]) => `${x.name} ${x.value.toFixed(x.digits)}${x.unit ? ` ${x.unit}` : ""} (limit ${x.min > 0 ? `${x.min} to ${x.max}` : `up to ${x.max}`})`;
    const one = QUALITY.find((x) => (x.name === "pH" ? q.includes(" ph ") : x.name.toLowerCase().replace(/[()₅₄]/g, "").split(/[\s-]+/).some((w) => w.length > 2 && w !== "total" && q.includes(w))));
    if (one) return { text: `${row(one)}: ${qualityOk(one) ? "within the limit" : "outside the limit"}.${one.name.startsWith("Ammonia") ? " An open warning says ammonia is close to the limit because lane B is short of oxygen; raise the oxygen set-point on lane B." : ""}`, go: { tab: "overview", label: "Open the process overview" }, chips: ["Is the effluent within limits?", "How is Lane B doing?"] };
    return {
      text: `${bad.length === 0 ? `Yes, all ${QUALITY.length} effluent checks are within limits.` : `${bad.length} of ${QUALITY.length} checks are outside their limits: ${bad.map(row).join("; ")}.`} ${QUALITY.map(row).join("; ")}.${near.length ? ` Closest to the limit: ${near.map((x) => x.name).join(", ")}.` : ""}`,
      go: { tab: "overview", label: "Open the process overview" },
      chips: ["What is the ammonia level?", "What should I fix first?"],
    };
  }

  // ---- work orders and maintenance ----
  if (has(q, "work order", "overdue", "late", "maintenance", "wo-", "crew", "planned", "backlog", "task")) {
    const wo = q.match(/wo-\d+/)?.[0].toUpperCase();
    const one = wo && WORK_ORDERS.find((w) => w.id === wo);
    if (one) return { text: `${one.id}: ${one.title} (${one.asset}). ${one.prio} priority, ${one.status.toLowerCase()}, due ${one.due}${one.late ? " (overdue)" : ""}. ${one.crew}, about ${one.hours} h. ${one.note}`, go: { tab: "maintenance", label: "Open Maintenance" }, chips: ["Which work orders are overdue?"] };
    const open = openOrders(), late = open.filter((w) => w.late), high = open.filter((w) => w.prio === "High");
    return {
      text: `${open.length} work orders are open (${open.filter((w) => w.type === "Unplanned").length} unplanned). ${late.length} overdue: ${late.map((w) => `${w.id} ${w.title}`).join("; ") || "none"}. High priority: ${high.map((w) => `${w.id} ${w.title}`).join("; ")}. ${WORK_ORDERS.length - open.length} were finished this month.`,
      go: { tab: "maintenance", label: "Open Maintenance" },
      chips: ["Which asset is most likely to fail?", "What should I fix first?"],
    };
  }

  // ---- asset health and failure risk ----
  if (has(q, "asset", "health", "fail", "predict", "risk", "life", "rul", "break", "machine", "equipment")) {
    const rows = [...predictive(F)].sort((a, b) => b.risk - a.risk).slice(0, 3);
    return {
      text: `Highest chance of failure in the next 30 days: ${rows.map((r) => `${r.name} ${pct(r.risk)} (about ${r.failIn} days of life, ${r.pred.signal.toLowerCase()} ${r.pred.value})`).join("; ")}. The healthiest big asset is ${[...ASSETS].sort((a, b) => b.health - a.health)[0].name}. Say an asset's name for its details and advice.`,
      go: { tab: "maintenance", label: "Open predictive maintenance" },
      chips: ["Tell me about Blower B-401C", "Which work orders are overdue?"],
    };
  }

  // ---- energy and power ----
  if (has(q, "energy", "power", "electric", "kwh", "solar", "chp", "generat", "load", "grid", "mw", "biogas power")) {
    const total = LOADS.reduce((a, l) => a + l.kw, 0), bl = LOADS[0];
    const k = overviewKpis(F, WORK_ORDERS).find((x) => x.id === "energy")!;
    return {
      text: `The plant draws about ${fmt(total)} kW. The blowers use ${fmt(bl.kw)} kW, ${Math.round((bl.kw / total) * 100)}% of it. Specific energy is ${k.value.toFixed(2)} kWh per m³ treated. The biogas CHP engine gives ${fmt(GEN_KW)} kW and the solar field up to ${fmt(SOLAR_KW)} kW at midday, together up to ${Math.round(((GEN_KW + SOLAR_KW) / total) * 100)}% of the load. The CHP burns ${st[7].readings[1].value} Nm³/h of digester biogas.`,
      go: { tab: "electrical", label: "Open Electrical" },
      chips: ["How much does treatment cost?", "How much water do we treat?"],
    };
  }

  // ---- cost, revenue, price ----
  if (has(q, "cost", "revenue", "price", "money", "income", "profit", " le ", "budget", "earn")) {
    const k = overviewKpis(F, WORK_ORDERS).find((x) => x.id === "cost")!;
    return {
      text: `Treatment costs ${k.value.toFixed(1)} LE per m³, ${Math.abs(k.delta)}% under budget. Reused water is valued at ${PRICE} LE per m³, so at full flow of ${fmt(PLANT.capacity)} m³/day the reuse revenue is about ${((PLANT.capacity * PRICE) / 1e6).toFixed(2)} M LE a day. ${st[6].readings[0].value}% of the treated water goes to irrigation.`,
      go: { tab: "home", label: "Open Home" },
      chips: ["How much energy do we use?", "Is the plant compliant?"],
    };
  }

  // ---- flow, capacity, production ----
  if (has(q, "treat", "flow", "produc", "output", "capacity", "how much water", "m3", "m³", "cubic", "target", "availability")) {
    const ks = overviewKpis(F, WORK_ORDERS), s = ks.find((x) => x.id === "water")!;
    return {
      text: `The plant is designed for ${fmt(PLANT.capacity)} m³/day, from ${PLANT.trains} aeration lanes of ${fmt(PLANT.capacity / PLANT.trains)} m³/day each. Right now ${fmt(st[0].flow)} m³/h comes in and ${fmt(st[6].flow)} m³/h leaves as treated water. Over the last 7 days the flow treated is ${s.delta >= 0 ? "+" : ""}${s.delta}% against target. Plant availability is ${ks.find((x) => x.id === "avail")!.value}%.`,
      go: { tab: "home", label: "Open Home" },
      chips: ["How much does treatment cost?", "Is the plant compliant?"],
    };
  }

  // ---- a process stage by name ----
  const hit = STAGE_WORDS.find((s) => s.words.some((w) => q.includes(w)));
  if (hit || has(q, "stage", "process")) {
    if (!hit) {
      return { text: `The plant has ${st.length} stages: ${st.map((s) => s.name).join(", ")}. Say a stage name to hear its readings.`, go: { tab: "overview", label: "Open the process overview" }, chips: ["Tell me about the aeration", "What should I fix first?"] };
    }
    return stageAnswer(hit.id);
  }

  return {
    text: ownsTab("overview")
      ? "I can answer questions about alarms and what to fix first, the three aeration lanes, effluent quality, the process stages, work orders and asset health. For example:"
      : "I can answer questions about the water treated, energy and power, the biogas CHP, treatment cost, reuse revenue and compliance. For example:",
    chips: SUGGESTED,
  };
};

export function ask(raw: string, c: Ctx): Answer {
  const a = answer(raw, c);
  // only suggest follow-ups that this site can answer
  const keep = (chip: string) => { const t = answer(chip, c).go?.tab; return !t || ownsTab(t); };
  if (a.go && !ownsTab(a.go.tab)) {
    return { text: `That is covered on the ${OTHER.title.replace("Smart Wastewater: ", "")} site, not this one. Open it there and ask me again.`, go: a.go, chips: SUGGESTED };
  }
  return { ...a, chips: a.chips?.filter(keep) };
}
