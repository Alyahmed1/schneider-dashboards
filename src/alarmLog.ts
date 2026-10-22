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
  { id: "a1", sev: "Critical", text: "Train B differential pressure above 2.3 bar", detail: "Membranes in train B are fouling. Output is dropping and energy use is rising. Schedule a membrane clean (CIP) within 6 days.", where: "TRAIN-B", stage: "RO membranes", type: "Process", minsAgo: 12, wo: "WO-2417" },
  { id: "a2", sev: "Warning", text: "Gravity filter 3 needs a backwash", detail: "Filter 3 is 95% clogged. Water will bypass to the other filters if it is not backwashed soon.", where: "FLT-3", stage: "Pre-treatment", type: "Process", minsAgo: 41, wo: "WO-2421" },
  { id: "a3", sev: "Warning", text: "HP pump C vibration trending up", detail: "Drive-end bearing vibration reached 7.4 mm/s (limit 7.1). Take a spectrum reading and inspect the coupling.", where: "P-301C", stage: "HP pumps", type: "Equipment", minsAgo: 2 * H, wo: "WO-2409" },
  { id: "a4", sev: "Info", text: "Antiscalant dosing tank at 28%", detail: "Enough for about 2 days. A delivery is already on site and the refill is planned.", where: "DOS-203", stage: "Chemicals", type: "Process", minsAgo: 3 * H, wo: "WO-2425" },
  { id: "a5", sev: "Info", text: "Solar field producing 4.1 MW (peak)", detail: "The solar field reached its daily peak. Grid import dropped to 11.9 MW.", where: "PV field", stage: "Electrical", type: "Electrical", minsAgo: 5 * H },
  { id: "a6", sev: "Warning", text: "Boron at 1.3 mg/L, close to the 1.5 limit", detail: "Permeate boron is rising slowly. Check the pH set-point and consider a second-pass trim.", where: "AIT-401", stage: "RO membranes", type: "Water quality", minsAgo: 7 * H },
  { id: "a7", sev: "Info", text: "Sea water temperature 29.1 °C, above the daily average", detail: "Warmer feed water lowers the pressure needed but raises salt passage slightly. No action needed.", where: "TIT-101", stage: "Sea intake", type: "Process", minsAgo: 9 * H },
  { id: "a8", sev: "Warning", text: "Dosing pump 2 stroke fault", detail: "The stroke sensor is not responding, so the dose rate cannot be confirmed. Check the sensor cable and calibration.", where: "DOS-202", stage: "Chemicals", type: "Equipment", minsAgo: 1 * D + 2 * H, wo: "WO-2412" },
  { id: "a9", sev: "Critical", text: "11 kV breaker trip on the pre-treatment feeder", detail: "The feeder tripped on overcurrent and was reclosed after a check. Thermography is scheduled.", where: "BRK-PRE", stage: "Electrical", type: "Electrical", minsAgo: 1 * D + 5 * H, doneDefault: { minsAgo: 1 * D + 3 * H, by: "AVEVA" } },
  { id: "a10", sev: "Warning", text: "Intake screen differential pressure 0.4 bar", detail: "Screens were partly blocked by seaweed. Cleaned and back to normal.", where: "PDT-101", stage: "Sea intake", type: "Process", minsAgo: 2 * D + 1 * H, doneDefault: { minsAgo: 2 * D - 2 * H, by: "AVEVA" } },
  { id: "a11", sev: "Info", text: "Generator test run completed", detail: "The standby generator ran for 15 minutes and picked up the essential load as expected.", where: "GEN-1", stage: "Electrical", type: "Electrical", minsAgo: 2 * D + 6 * H, doneDefault: { minsAgo: 2 * D + 5 * H, by: "AVEVA" } },
  { id: "a12", sev: "Warning", text: "Free chlorine 0.9 mg/L, near the 1.0 limit", detail: "Residual chlorine in the product water is close to the upper limit. Reduce the chlorine dose a little.", where: "AIT-701", stage: "Storage", type: "Water quality", minsAgo: 3 * D },
  { id: "a13", sev: "Critical", text: "Seal leak on intake pump 2", detail: "The mechanical seal was leaking sea water. The pump was swapped to standby and the seal replaced.", where: "P-101B", stage: "Sea intake", type: "Equipment", minsAgo: 3 * D + 4 * H, wo: "WO-2399", doneDefault: { minsAgo: 3 * D - 2 * H, by: "AVEVA" } },
  { id: "a14", sev: "Warning", text: "Cartridge filter B differential pressure rising", detail: "Filter B is at 0.7 bar of a 1.2 bar limit. Plan a change within 2 weeks.", where: "CF-301B", stage: "HP pumps", type: "Process", minsAgo: 4 * D },
  { id: "a15", sev: "Info", text: "Transfer pump 3 started for a test run", detail: "A routine run to keep the standby pump ready. Stopped after 10 minutes.", where: "P-801C", stage: "Network", type: "Equipment", minsAgo: 4 * D + 3 * H, doneDefault: { minsAgo: 4 * D + 2 * H, by: "AVEVA" } },
  { id: "a16", sev: "Warning", text: "Low level in the lime saturator (32%)", detail: "Lime will run out in about 6 hours at the current dose. Refill from the lime silo.", where: "DOS-601", stage: "Post-treatment", type: "Process", minsAgo: 5 * D },
  { id: "a17", sev: "Critical", text: "CO₂ room gas sensor alarm", detail: "The sensor tripped. The room was ventilated and checked. It was a false alarm caused by a faulty sensor, which was replaced.", where: "GAS-602", stage: "Post-treatment", type: "Safety", minsAgo: 5 * D + 2 * H, doneDefault: { minsAgo: 5 * D, by: "AVEVA" } },
  { id: "a18", sev: "Info", text: "Network pressure dipped to 5.4 bar", detail: "A short dip while two transfer pumps switched over. Back to 6.2 bar within a minute.", where: "PIT-801", stage: "Network", type: "Process", minsAgo: 6 * D, doneDefault: { minsAgo: 6 * D - 1 * H, by: "AVEVA" } },
  { id: "a19", sev: "Warning", text: "Transformer TR-1 winding temperature 82 °C", detail: "Higher than usual during the afternoon peak. Check the cooling fans and the oil level.", where: "TR-1", stage: "Electrical", type: "Electrical", minsAgo: 6 * D + 2 * H },
  { id: "a20", sev: "Info", text: "Brine dilution ratio 31:1, close to the 30:1 minimum", detail: "The outfall mixing is still within the permit but with little margin. Watch it during low tide.", where: "OUT-1", stage: "Brine outfall", type: "Water quality", minsAgo: 6 * D + 5 * H },
];

/** the limit that was crossed, the value at that moment and the signal quality, for the alarm grid */
const EXTRA: Record<string, Pick<LogAlarm, "limit" | "value" | "quality">> = {
  a1: { limit: "2.3 bar", value: "2.4 bar" }, a2: { limit: "90 %", value: "95 %" }, a3: { limit: "7.1 mm/s", value: "7.4 mm/s" },
  a4: { limit: "30 %", value: "28 %" }, a5: { limit: "", value: "4.1 MW" }, a6: { limit: "1.5 mg/L", value: "1.3 mg/L" },
  a7: { limit: "28.0 °C", value: "29.1 °C" }, a8: { limit: "", value: "No signal", quality: "Bad" }, a9: { limit: "1200 A", value: "1480 A" },
  a10: { limit: "0.4 bar", value: "0.4 bar" }, a11: { limit: "", value: "Run" }, a12: { limit: "1.0 mg/L", value: "0.9 mg/L" },
  a13: { limit: "Leak", value: "True" }, a14: { limit: "1.2 bar", value: "0.7 bar" }, a15: { limit: "", value: "Start" },
  a16: { limit: "35 %", value: "32 %" }, a17: { limit: "5000 ppm", value: "Fault", quality: "Bad" }, a18: { limit: "5.5 bar", value: "5.4 bar" },
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
