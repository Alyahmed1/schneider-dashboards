/* ================= The demo assistant: free, offline, no API =================
   It reads the same sample data as every screen (data.ts, cmms.ts, alarmLog.ts), so every number it quotes is on the dashboard too.
   It works by matching the question to a topic (alarms, trains, quality, energy ...) and then computing the answer. */
import { alarms, fmt, membraneScore, METRICS, overviewKpis, PLANT, PRICE, QUALITY, qualityOk, stages, trains, ZONES, type Filters, type Train } from "./data";
import { ASSETS, GEN_KW, LOADS, predictive, SOLAR_KW, WORK_ORDERS } from "./cmms";
import { ALARM_LOG } from "./alarmLog";
import type { TabId } from "./App";

export interface Answer { text: string; go?: { tab: TabId; stage?: string; label: string }; chips?: string[] }

const F: Filters = { range: "7D", area: "All plant" };

export const SUGGESTED = [
  "What should I fix first?",
  "How is Train B doing?",
  "Is the drinking water safe?",
  "How much energy do we use?",
  "Which asset is most likely to fail?",
];

const has = (q: string, ...w: string[]) => w.some((x) => q.includes(x));
const pct = (n: number) => `${Math.round(n)}%`;
const SEV = { Critical: 0, Warning: 1, Info: 2 } as const;

/** alarms that are still open, worst first, newest first */
const openAlarms = () => ALARM_LOG.filter((a) => !a.doneDefault).sort((a, b) => SEV[a.sev] - SEV[b.sev] || a.minsAgo - b.minsAgo);
const openOrders = () => WORK_ORDERS.filter((w) => w.status !== "Done");

const STAGE_WORDS: { id: string; words: string[] }[] = [
  { id: "intake", words: ["intake", "sea water", "seawater", "screen"] },
  { id: "pre", words: ["pre-treat", "pretreat", "pre treat", "filter", "coagul", "sdi"] },
  { id: "hp", words: ["hp pump", "high pressure", "high-pressure", "cartridge", "booster"] },
  { id: "ro", words: ["ro ", "membrane", "reverse osmosis"] },
  { id: "erd", words: ["energy recovery", "exchanger", "erd", "brine pressure"] },
  { id: "post", words: ["post-treat", "posttreat", "post treat", "lime", "co2", "mineral"] },
  { id: "tank", words: ["tank", "storage", "stored", "cover time"] },
  { id: "net", words: ["network", "distribution", "transfer pump", "customers", "leak"] },
];

function stageAnswer(id: string): Answer {
  const s = stages(F).find((x) => x.id === id)!;
  const alarm = s.equipment.filter((e) => e.state === "Alarm"), idle = s.equipment.filter((e) => e.state === "Standby");
  return {
    text: `${s.name} (${s.short}): ${fmt(s.flow)} ${s.unit}. ${s.note}. Readings: ${s.readings.map((r) => `${r.label} ${r.value}${r.unit ? ` ${r.unit}` : ""}`).join(", ")}. Equipment: ${s.equipment.length}, ${alarm.length ? `${alarm.map((e) => e.name).join(", ")} in alarm` : "none in alarm"}${idle.length ? `, ${idle.map((e) => e.name).join(", ")} on standby` : ""}.`,
    go: { tab: "production", stage: s.id, label: `Open ${s.name}` },
    chips: ["What should I fix first?", "Compare the three trains"],
  };
}

function trainAnswer(t: Train): Answer {
  const letter = t.name.slice(-1);
  const mem = ASSETS.find((a) => a.name === `RO membranes · ${t.name}`);
  const wos = openOrders().filter((w) => w.area === t.name);
  const al = alarms({ ...F, area: t.name }).filter((a) => a.area === t.name);
  const cip = t.nextCipDays <= 7 ? `a membrane clean (CIP) is due in ${t.nextCipDays} days` : `the next membrane clean (CIP) is in ${t.nextCipDays} days`;
  const status = t.tone === "bad" ? "It needs attention." : t.tone === "warn" ? "Worth watching." : "It is healthy.";
  return {
    text: `${t.name}: makes ${fmt(t.permeate)} m³/h of fresh water at ${t.recovery}% recovery. Membrane fouling is ${t.fouling}% and differential pressure is ${t.dp} bar${t.dp > 2.3 ? ", above the 2.3 bar alarm limit" : ", within limits"}. Last clean ${t.lastCip}; ${cip}. ${mem ? `Membrane health ${mem.health}/100. ` : ""}${status}${al.length ? ` Open alarm: ${al.map((a) => a.text).join("; ")}.` : ""}${wos.length ? ` Open work orders: ${wos.map((w) => `${w.id} ${w.title}`).join("; ")}.` : ""}`,
    go: { tab: "production", stage: "ro", label: `Open the RO membranes (train ${letter})` },
    chips: ["What should I fix first?", "Compare the three trains"],
  };
}

export function ask(raw: string): Answer {
  const q = ` ${raw.toLowerCase().replace(/[?!.,]/g, " ")} `;
  const st = stages(F);
  const ts = trains(F);

  // ---- greetings and help ----
  if (/^\s*(hi|hello|hey|help|thanks|thank you)\b/.test(q) || has(q, "what can you")) {
    return { text: "Hi! I'm the demo assistant. I read the sample data on this dashboard, so I can tell you what to fix first, how each RO train is doing, whether the drinking water meets its limits, how much energy and money the plant uses, and which machines are at risk. Try one of the questions below.", chips: SUGGESTED };
  }

  // ---- compare the trains ----
  if (has(q, "compare", "all trains", "three trains", "which train", "best train", "worst train")) {
    const worst = [...ts].sort((a, b) => b.fouling - a.fouling)[0], bestT = [...ts].sort((a, b) => a.fouling - b.fouling)[0];
    return {
      text: `${ts.map((t) => `${t.name}: ${fmt(t.permeate)} m³/h, ${t.recovery}% recovery, fouling ${t.fouling}%, ΔP ${t.dp} bar`).join(". ")}. ${worst.name} is the most fouled and should be cleaned first (in ${worst.nextCipDays} days); ${bestT.name} is the cleanest.`,
      go: { tab: "production", stage: "ro", label: "Open the RO membranes" },
      chips: [`How is ${worst.name} doing?`, "What should I fix first?"],
    };
  }

  // ---- one train ----
  const tm = q.match(/train\s*([abc])\b/);
  if (tm) return trainAnswer(ts.find((t) => t.name === `Train ${tm[1].toUpperCase()}`)!);

  // ---- one named asset (HP pump C, Dosing pump 2 ...) ----
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
    const open = openAlarms();
    const top = open.slice(0, 4);
    const crit = open.filter((a) => a.sev === "Critical").length;
    const late = openOrders().filter((w) => w.late);
    return {
      text: `${open.length} alarms are open, ${crit} critical. In this order: ${top.map((a, i) => `${i + 1}) ${a.text} (${a.where}, ${a.minsAgo < 60 ? `${a.minsAgo} min` : a.minsAgo < 2880 ? `${Math.round(a.minsAgo / 60)} h` : `${Math.round(a.minsAgo / 1440)} days`} ago${a.wo ? `, ${a.wo}` : ""})`).join("; ")}.${late.length ? ` ${late.length} work orders are already overdue: ${late.map((w) => w.id).join(", ")}.` : ""}`,
      go: { tab: "alarms", label: "Open the alarm page" },
      chips: ["How is Train B doing?", "Which work orders are overdue?"],
    };
  }

  // ---- water quality ----
  if (has(q, "quality", "safe", "drink", "boron", "salinity", "tds", "chloride", "turbidity", " ph ", "chlorine", "limit")) {
    const bad = QUALITY.filter((x) => !qualityOk(x));
    const near = QUALITY.filter((x) => qualityOk(x) && (x.value - x.min) / (x.max - x.min) > 0.85 && x.min === 0);
    const row = (x: (typeof QUALITY)[number]) => `${x.name} ${x.value.toFixed(x.digits)}${x.unit ? ` ${x.unit}` : ""} (limit ${x.min > 0 ? `${x.min} to ${x.max}` : `up to ${x.max}`})`;
    const one = QUALITY.find((x) => x.name === "pH" ? q.includes(" ph ") : x.name.toLowerCase().replace(/[()]/g, "").split(" ").some((w) => w.length > 3 && w !== "free" && q.includes(w)));
    if (one) return { text: `${row(one)}: ${qualityOk(one) ? "within the limit" : "outside the limit"}.${one.name === "Boron" ? " An open warning says boron reached 1.3 mg/L earlier this week; check the pH set-point and consider a second-pass trim." : ""}`, go: { tab: "overview", label: "Open the water quality" }, chips: ["Is the drinking water safe?"] };
    return {
      text: `${bad.length === 0 ? `Yes, all ${QUALITY.length} drinking-water checks are within limits.` : `${bad.length} of ${QUALITY.length} checks are outside their limits: ${bad.map(row).join("; ")}.`} ${QUALITY.map(row).join("; ")}.${near.length ? ` Closest to the limit: ${near.map((x) => x.name).join(", ")}.` : ""}`,
      go: { tab: "overview", label: "Open the water quality" },
      chips: ["What is the boron level?", "What should I fix first?"],
    };
  }

  // ---- energy recovery devices (before "energy" and "recovery" are taken by other topics) ----
  if (has(q, "energy recovery", "exchanger", "pressure exchanger")) return stageAnswer("erd");

  // ---- water lost in the network ----
  if (has(q, "lose", "loss", "lost", "leak", "nrw")) {
    const net = st[7], lossM3h = st[6].flow - st[7].flow;
    return {
      text: `Network leakage is ${net.readings[1].value}% of the water sent out. Between the storage tanks (${fmt(st[6].flow)} m³/h) and the network (${fmt(net.flow)} m³/h) about ${fmt(lossM3h)} m³/h, roughly ${fmt(lossM3h * 24)} m³ a day, is lost. Line pressure is steady at ${net.readings[0].value} bar.`,
      go: { tab: "production", stage: "net", label: "Open the network" },
      chips: ["How much water do we make?", "What should I fix first?"],
    };
  }

  // ---- membranes, fouling, cleaning ----
  if (has(q, "membrane", "fouling", "cip", "clean", "recovery", "rejection", "permeate", "dp ", "differential")) {
    const ro = st[3], worst = [...ts].sort((a, b) => b.fouling - a.fouling)[0];
    return {
      text: `The plant's membrane health score is ${membraneScore(F)}/100. Overall recovery is ${ro.readings[0].value}% and salt rejection ${ro.readings[1].value}%. ${worst.name} is the most fouled (${worst.fouling}%, ΔP ${worst.dp} bar), so its clean (CIP) comes first, in ${worst.nextCipDays} days. Next cleans: ${ts.map((t) => `${t.name} in ${t.nextCipDays} days`).join(", ")}.`,
      go: { tab: "production", stage: "ro", label: "Open the RO membranes" },
      chips: ["Compare the three trains", "How is Train B doing?"],
    };
  }

  // ---- energy and power ----
  if (has(q, "energy", "power", "electric", "kwh", "solar", "generator", "load", "grid", "mw")) {
    const total = LOADS.reduce((a, l) => a + l.kw, 0), hp = LOADS[0];
    const k = overviewKpis(F, WORK_ORDERS).find((x) => x.id === "energy")!;
    return {
      text: `The plant draws about ${fmt(total)} kW. The high-pressure pumps use ${fmt(hp.kw)} kW, ${Math.round((hp.kw / total) * 100)}% of it. Specific energy is ${k.value.toFixed(2)} kWh per m³ of water. The solar field gives up to ${fmt(SOLAR_KW)} kW at midday (${Math.round((SOLAR_KW / total) * 100)}% of the load), and the standby generator can supply ${fmt(GEN_KW)} kW. The energy recovery devices already save about ${st[4].readings[2].value}% of the pumping energy.`,
      go: { tab: "electrical", label: "Open Electrical" },
      chips: ["How much does water cost?", "How is the energy recovery doing?"],
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
      chips: ["Tell me about HP pump C", "Which work orders are overdue?"],
    };
  }

  // ---- cost, revenue, price ----
  if (has(q, "cost", "revenue", "price", "money", "income", "profit", " le ", "budget", "earn")) {
    const k = overviewKpis(F, WORK_ORDERS).find((x) => x.id === "cost")!;
    const margin = PRICE - k.value;
    return {
      text: `Water costs ${k.value.toFixed(1)} LE per m³ to make and is sold at ${PRICE} LE, a margin of ${margin.toFixed(1)} LE per m³ (${Math.round((margin / PRICE) * 100)}%). At full output of ${fmt(PLANT.capacity)} m³/day that is about ${((PLANT.capacity * PRICE) / 1e6).toFixed(2)} M LE of revenue a day. Cost is ${Math.abs(k.delta)}% under budget.`,
      go: { tab: "home", label: "Open Home" },
      chips: ["How much energy do we use?", "How much water do we make?"],
    };
  }

  // ---- production and capacity ----
  if (has(q, "produc", "output", "capacity", "how much water", "m3", "m³", "cubic", "make", "made", "target")) {
    const s = overviewKpis(F, WORK_ORDERS).find((x) => x.id === "water")!;
    return {
      text: `The plant is designed for ${fmt(PLANT.capacity)} m³/day, from ${PLANT.trains} RO trains of ${fmt(PLANT.capacity / PLANT.trains)} m³/day each. Right now fresh water leaves the membranes at ${fmt(st[3].flow)} m³/h, and ${fmt(st[7].flow)} m³/h reaches the network. Over the last 7 days production is ${s.delta >= 0 ? "+" : ""}${s.delta}% against target. Plant availability is ${overviewKpis(F, WORK_ORDERS).find((x) => x.id === "avail")!.value}%.`,
      go: { tab: "production", label: "Open Production" },
      chips: ["Compare the three trains", "How much does water cost?"],
    };
  }

  // ---- the supply zones on the Home map ----
  const zone = ZONES.find((z) => q.includes(z.name.toLowerCase()));
  if (zone || has(q, "zone", "city", "cities", "town", "map", "reservoir", "demand served", "supply")) {
    const rows = ZONES.map((z, i) => ({ z, v: METRICS.map((m) => m.base[i]) }));
    const line = (r: (typeof rows)[number]) => `${r.z.name}: demand served ${r.v[0]}%, reservoir ${r.v[1]}%, pressure OK ${r.v[2]}%`;
    const low = rows.filter((r) => r.v.some((v, m) => v < METRICS[m].low));
    if (zone) {
      const r = rows.find((x) => x.z === zone)!;
      return { text: `${line(r)}. ${r.v.some((v, m) => v < METRICS[m].low) ? "Some values are under their target, so it shows as a warning on the map." : "All values are above target."}`, go: { tab: "home", label: "Show it on the map" }, chips: ["Which zone is worst?"] };
    }
    return {
      text: `The plant supplies four coastal zones. ${rows.map(line).join(". ")}. ${low.length ? `Below target: ${low.map((r) => r.z.name).join(", ")}.` : "All zones are on target."}`,
      go: { tab: "home", label: "Show the map" },
      chips: ["Tell me about Marsa Alam", "How much water do we lose?"],
    };
  }

  // ---- a process stage by name ----
  const hit = STAGE_WORDS.find((s) => s.words.some((w) => q.includes(w)));
  if (hit || has(q, "stage", "process")) {
    if (!hit) {
      return { text: `The plant has ${st.length} stages: ${st.map((s) => s.name).join(", ")}. Say a stage name to hear its readings.`, go: { tab: "overview", label: "Open the process overview" }, chips: ["Tell me about the HP pumps", "What should I fix first?"] };
    }
    return stageAnswer(hit.id);
  }

  return { text: "I can answer questions about alarms and what to fix first, the three RO trains, membranes, drinking-water quality, energy, cost, production, work orders, asset health and the supply zones. For example:", chips: SUGGESTED };
}
