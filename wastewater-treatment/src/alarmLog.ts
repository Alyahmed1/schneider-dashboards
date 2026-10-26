export type AlarmSev = "Critical" | "Warning" | "Info";
export type AlarmType = "Process" | "Equipment" | "Water quality" | "Electrical" | "Safety";
export const ALARM_TYPES: AlarmType[] = ["Process", "Equipment", "Water quality", "Electrical", "Safety"];

export interface LogAlarm {
  id: string; sev: AlarmSev; text: string; detail: string; where: string; stage: string; type: AlarmType;
  minsAgo: number; wo?: string; doneDefault?: { minsAgo: number; by: string };
  limit?: string; value?: string; quality?: "Good" | "Bad";
}

const H = 60;
const D = 24 * 60;

/** sample alarm history for the last week (the first five are the ones shown on the Command Center) */
const RAW: LogAlarm[] = [
  { id: "a1", sev: "Critical", text: "Lane B dissolved oxygen below 1.5 mg/L", detail: "The diffusers in lane B are fouling and the blower cannot hold the set-point. Nitrification is dropping and ammonia in the effluent is rising. Clean the diffusers within 6 days.", where: "LANE-B", stage: "Aeration", type: "Process", minsAgo: 12, wo: "WO-2417" },
  { id: "a2", sev: "Warning", text: "Grit classifier 2 needs emptying", detail: "The classifier hopper is 95% full. Grit will carry over to the aeration lanes if it is not emptied soon.", where: "GC-2", stage: "Grit & grease", type: "Process", minsAgo: 41, wo: "WO-2421" },
  { id: "a3", sev: "Warning", text: "Blower B-401C vibration trending up", detail: "Drive-end bearing vibration reached 7.4 mm/s (limit 7.1). Take a spectrum reading and inspect the coupling.", where: "B-401C", stage: "Aeration", type: "Equipment", minsAgo: 2 * H, wo: "WO-2409" },
  { id: "a4", sev: "Info", text: "Polymer dosing tank at 28%", detail: "Enough for about 2 days. A delivery is already on site and the refill is planned.", where: "DOS-703", stage: "Chemicals", type: "Process", minsAgo: 3 * H, wo: "WO-2425" },
  { id: "a5", sev: "Info", text: "Biogas CHP producing 1.2 MW (full output)", detail: "The CHP unit reached full output on digester gas. Grid import dropped to 1.6 MW.", where: "CHP-1", stage: "Electrical", type: "Electrical", minsAgo: 5 * H },
  { id: "a6", sev: "Warning", text: "Effluent ammonia 4.1 mg/L, close to the 5 mg/L limit", detail: "Ammonia is rising because lane B is short of oxygen. Raise the oxygen set-point on lane B and watch the effluent analyser.", where: "AIT-901", stage: "Tertiary & disinfection", type: "Water quality", minsAgo: 7 * H },
  { id: "a7", sev: "Info", text: "Influent flow 8,900 m³/h, above the daily average", detail: "A morning peak raised the inlet flow. The inlet pumps handled it without the storm tank. No action needed.", where: "FIT-101", stage: "Inlet works", type: "Process", minsAgo: 9 * H },
  { id: "a8", sev: "Warning", text: "Polymer dosing pump 2 stroke fault", detail: "The stroke sensor is not responding, so the dose rate cannot be confirmed. Check the sensor cable and calibration.", where: "DOS-702", stage: "Chemicals", type: "Equipment", minsAgo: 1 * D + 2 * H, wo: "WO-2412" },
  { id: "a9", sev: "Critical", text: "11 kV breaker trip on the blower feeder", detail: "The feeder tripped on overcurrent and was reclosed after a check. Thermography is scheduled.", where: "BRK-BLW", stage: "Electrical", type: "Electrical", minsAgo: 1 * D + 5 * H, doneDefault: { minsAgo: 1 * D + 3 * H, by: "A" } },
  { id: "a10", sev: "Warning", text: "Bar screen level difference 0.4 m", detail: "The screens were partly blocked by rags. Raked clean and back to normal.", where: "LDT-101", stage: "Inlet works", type: "Process", minsAgo: 2 * D + 1 * H, doneDefault: { minsAgo: 2 * D - 2 * H, by: "A" } },
  { id: "a11", sev: "Info", text: "Biogas flare lit for 12 minutes", detail: "The CHP unit stopped for a short service check, so the extra biogas was burnt in the flare. The CHP is back on load.", where: "FL-1", stage: "Sludge & biogas", type: "Process", minsAgo: 2 * D + 6 * H, doneDefault: { minsAgo: 2 * D + 5 * H, by: "A" } },
  { id: "a12", sev: "Warning", text: "UV transmittance 52%, near the 50% limit", detail: "The quartz sleeves are getting dirty, so the UV dose is falling. Start an automatic wipe cycle and plan a manual clean.", where: "UVT-701", stage: "Tertiary & disinfection", type: "Water quality", minsAgo: 3 * D },
  { id: "a13", sev: "Critical", text: "Seal leak on influent pump 2", detail: "The mechanical seal was leaking sewage. The pump was swapped to standby and the seal replaced.", where: "P-101B", stage: "Inlet works", type: "Equipment", minsAgo: 3 * D + 4 * H, wo: "WO-2399", doneDefault: { minsAgo: 3 * D - 2 * H, by: "A" } },
  { id: "a14", sev: "Warning", text: "Disc filter B level difference rising", detail: "Filter B is at 0.7 m of a 1.2 m limit. Plan a cloth change within 2 weeks.", where: "DF-701B", stage: "Tertiary & disinfection", type: "Process", minsAgo: 4 * D },
  { id: "a15", sev: "Warning", text: "Digester 2 temperature 35.1 °C, below the 36 °C set-point", detail: "The heating loop is slow to recover after a sludge feed. Check the heat exchanger and the hot-water pump.", where: "TIT-701B", stage: "Sludge & biogas", type: "Process", minsAgo: 4 * D + 3 * H, doneDefault: { minsAgo: 4 * D + 1 * H, by: "A" } },
  { id: "a16", sev: "Warning", text: "Low level in the ferric chloride tank (32%)", detail: "Ferric will run out in about 6 hours at the current dose. Order a delivery or refill from the tanker.", where: "DOS-601", stage: "Chemicals", type: "Process", minsAgo: 5 * D },
  { id: "a17", sev: "Critical", text: "H₂S gas sensor alarm in the inlet building", detail: "The sensor tripped. The room was ventilated and checked. It was a false alarm caused by a faulty sensor, which was replaced.", where: "GAS-102", stage: "Inlet works", type: "Safety", minsAgo: 5 * D + 2 * H, doneDefault: { minsAgo: 5 * D, by: "A" } },
  { id: "a18", sev: "Info", text: "Reuse line pressure dipped to 3.9 bar", detail: "A short dip while two reuse pumps switched over. Back to 4.8 bar within a minute.", where: "PIT-801", stage: "Effluent & reuse", type: "Process", minsAgo: 6 * D, doneDefault: { minsAgo: 6 * D - 1 * H, by: "A" } },
  { id: "a19", sev: "Warning", text: "Transformer TR-1 winding temperature 82 °C", detail: "Higher than usual during the afternoon peak. Check the cooling fans and the oil level.", where: "TR-1", stage: "Electrical", type: "Electrical", minsAgo: 6 * D + 2 * H },
  { id: "a20", sev: "Info", text: "Sea outfall dilution ratio 31:1, close to the 30:1 minimum", detail: "The outfall mixing is still within the permit but with little margin. Watch it during low tide.", where: "OUT-1", stage: "Sea outfall", type: "Water quality", minsAgo: 6 * D + 5 * H },
];

/** the limit that was crossed, the value at that moment and the signal quality, for the alarm grid */
const EXTRA: Record<string, Pick<LogAlarm, "limit" | "value" | "quality">> = {
  a1: { limit: "1.5 mg/L", value: "1.1 mg/L" }, a2: { limit: "90 %", value: "95 %" }, a3: { limit: "7.1 mm/s", value: "7.4 mm/s" },
  a4: { limit: "30 %", value: "28 %" }, a5: { limit: "", value: "1.2 MW" }, a6: { limit: "5 mg/L", value: "4.1 mg/L" },
  a7: { limit: "7,500 m³/h", value: "8,900 m³/h" }, a8: { limit: "", value: "No signal", quality: "Bad" }, a9: { limit: "120 A", value: "148 A" },
  a10: { limit: "0.4 m", value: "0.4 m" }, a11: { limit: "", value: "On" }, a12: { limit: "50 %", value: "52 %" },
  a13: { limit: "Leak", value: "True" }, a14: { limit: "1.2 m", value: "0.7 m" }, a15: { limit: "36 °C", value: "35.1 °C" },
  a16: { limit: "35 %", value: "32 %" }, a17: { limit: "10 ppm", value: "Fault", quality: "Bad" }, a18: { limit: "4.2 bar", value: "3.9 bar" },
  a19: { limit: "80 °C", value: "82 °C" }, a20: { limit: "30 : 1", value: "31 : 1" },
};
export const ALARM_LOG: LogAlarm[] = RAW.map((a) => ({ quality: "Good", ...a, ...EXTRA[a.id] }));

export const NOW = Date.now();
export const atOf = (a: LogAlarm) => NOW - a.minsAgo * 60000;

export function fmtWhen(ms: number) {
  const d = new Date(ms);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}
export function ago(ms: number, now = Date.now()) {
  const m = Math.max(0, Math.round((now - ms) / 60000));
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} days ago`;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** MM/DD/YYYY HH:MM:SS, the way the alarm client shows time */
export function fmtGrid(ms: number, utc = false) {
  const d = new Date(ms);
  const g = utc
    ? { mo: d.getUTCMonth() + 1, da: d.getUTCDate(), y: d.getUTCFullYear(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds() }
    : { mo: d.getMonth() + 1, da: d.getDate(), y: d.getFullYear(), h: d.getHours(), mi: d.getMinutes(), s: d.getSeconds() };
  return `${pad(g.mo)}/${pad(g.da)}/${g.y} ${pad(g.h)}:${pad(g.mi)}:${pad(g.s)}`;
}
/** "DDD HH:MM:SS" duration */
export function fmtDur(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(t / 86400)).padStart(3, "0")} ${pad(Math.floor((t % 86400) / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}
