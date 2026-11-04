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
  { id: "a1", sev: "Critical", text: "Banafseg 6 pressure below 2.5 bar at peak", detail: "Pressure at the far end of the zone falls to 1.8 bar between 07:00 and 09:00. Customers on upper floors lose water. Check the zone inlet valve and the pipe from the east hub.", where: "PT-02", stage: "Supply zones", type: "Process", minsAgo: 12, wo: "WO-3117" },
  { id: "a2", sev: "Critical", text: "Burst on a DN300 main, Banafseg 9 (12 L/s)", detail: "Logger LK-02 picked up burst noise at 71 dB. A joint has failed. Isolate the section and replace the joint.", where: "LK-02", stage: "Leak & loss control", type: "Equipment", minsAgo: 41, wo: "WO-3121" },
  { id: "a3", sev: "Warning", text: "Pressure sensor PT-06 offline, Banafseg Apartments", detail: "No signal for 2 hours. The pressure in Banafseg Apartments cannot be confirmed. Check the radio link and the battery.", where: "PT-06", stage: "Supply zones", type: "Equipment", minsAgo: 2 * H, wo: "WO-3109" },
  { id: "a4", sev: "Warning", text: "Night flow rising in Banafseg 12, possible leak", detail: "Minimum night flow rose by 4 L/s over two days. A leak survey is needed on the pipes east of the zone meter.", where: "FT-06", stage: "Leak & loss control", type: "Process", minsAgo: 3 * H, wo: "WO-3125" },
  { id: "a5", sev: "Info", text: "Reservoir refilled to 87% on the night tariff", detail: "The reservoir filled during the low-demand hours and will cover the morning peak.", where: "LT-01", stage: "Elevated reservoir", type: "Process", minsAgo: 5 * H },
  { id: "a6", sev: "Warning", text: "Chlorine in Banafseg 12 dropped to 0.34 mg/L", detail: "Water is old at the far end of the zone. Flush the dead-end mains or raise the dose at the reservoir.", where: "AT-03", stage: "Supply zones", type: "Water quality", minsAgo: 7 * H, wo: "WO-3114" },
  { id: "a7", sev: "Info", text: "Plant output 1,712 L/s, at the daily average", detail: "The plant runs flat all day and the reservoir covers the peaks. No action needed.", where: "FT-01", stage: "Treatment plant", type: "Process", minsAgo: 9 * H },
  { id: "a8", sev: "Critical", text: "Service line burst near the mall, Banafseg 6 (6.5 L/s)", detail: "Logger LK-01 confirms the burst. A crew is on its way. The area is isolated by two valves.", where: "LK-01", stage: "Leak & loss control", type: "Equipment", minsAgo: 9 * H + 30, wo: "WO-3131" },
  { id: "a9", sev: "Critical", text: "11 kV breaker trip on the PS-1 feeder", detail: "The feeder tripped on overcurrent and was reclosed after a check. Pump 4 took the duty. Thermography is scheduled.", where: "BRK-PS1", stage: "Pump station PS-1", type: "Electrical", minsAgo: 1 * D + 5 * H, doneDefault: { minsAgo: 1 * D + 3 * H, by: "A" } },
  { id: "a10", sev: "Warning", text: "High-lift pump 2 bearing vibration 6.8 mm/s", detail: "Vibration reached 6.8 mm/s (limit 7.1). The bearings will be changed at the planned stop.", where: "P-102", stage: "Pump station PS-1", type: "Equipment", minsAgo: 1 * D + 8 * H, wo: "WO-3133" },
  { id: "a11", sev: "Info", text: "Corroded main in Banafseg 11, 9 L/s loss", detail: "The leak has been known for 6 days. A crew is booked to replace 180 m of cast iron.", where: "LK-03", stage: "Leak & loss control", type: "Equipment", minsAgo: 2 * D + 6 * H, wo: "WO-3102" },
  { id: "a12", sev: "Warning", text: "Raw water turbidity 85 NTU after rain upriver", detail: "The river carried silt. The coagulant dose was raised and the filtered water stayed under 0.5 NTU.", where: "AIT-101", stage: "Source & intake", type: "Water quality", minsAgo: 2 * D + 2 * H, doneDefault: { minsAgo: 2 * D - 4 * H, by: "A" } },
  { id: "a13", sev: "Warning", text: "PRV in Banafseg Apartments hunting", detail: "The valve was swinging by 0.6 bar. The diaphragm was replaced and the set-point checked.", where: "PRV-02", stage: "Trunk mains & booster", type: "Equipment", minsAgo: 3 * D + 4 * H, wo: "WO-3095", doneDefault: { minsAgo: 3 * D - 2 * H, by: "A" } },
  { id: "a14", sev: "Info", text: "Reservoir level dropped to 19% for 20 minutes", detail: "A long evening peak emptied the tank faster than planned. PS-1 added one pump and the level recovered.", where: "LT-01", stage: "Elevated reservoir", type: "Process", minsAgo: 4 * D, doneDefault: { minsAgo: 4 * D - 1 * H, by: "A" } },
  { id: "a15", sev: "Warning", text: "Smart-meter gateway south offline for 40 minutes", detail: "About 3,100 meters missed one reading. The gateway restarted and the readings were collected.", where: "GW-S", stage: "Customer metering", type: "Equipment", minsAgo: 4 * D + 3 * H, doneDefault: { minsAgo: 4 * D + 2 * H, by: "A" } },
  { id: "a16", sev: "Warning", text: "Low chlorine in the clear-water tank (0.6 mg/L)", detail: "The chlorine pump lost prime. It was re-primed and the dose returned to 1.6 mg/L.", where: "AIT-201", stage: "Treatment plant", type: "Water quality", minsAgo: 5 * D },
  { id: "a17", sev: "Critical", text: "Chlorine gas leak alarm in the dosing room", detail: "The sensor tripped. The room was ventilated and checked. It was a false alarm from a faulty sensor, which was replaced.", where: "GAS-201", stage: "Treatment plant", type: "Safety", minsAgo: 5 * D + 2 * H, doneDefault: { minsAgo: 5 * D, by: "A" } },
  { id: "a18", sev: "Info", text: "PS-1 discharge pressure dipped to 4.9 bar", detail: "A short dip while pump 4 started to cover pump 2. Back to 5.8 bar in a minute.", where: "PT-01", stage: "Pump station PS-1", type: "Process", minsAgo: 6 * D, doneDefault: { minsAgo: 6 * D - 1 * H, by: "A" } },
  { id: "a19", sev: "Warning", text: "Transformer TR-1 winding temperature 82 C", detail: "Higher than usual during the afternoon peak. Check the cooling fans and the oil level.", where: "TR-1", stage: "Pump station PS-1", type: "Electrical", minsAgo: 6 * D + 2 * H },
  { id: "a20", sev: "Info", text: "Dead-end flushing finished in Banafseg 12", detail: "The mains were flushed for 40 minutes and the chlorine at the far end returned to 0.5 mg/L.", where: "WO-3090", stage: "Supply zones", type: "Process", minsAgo: 6 * D + 5 * H, doneDefault: { minsAgo: 6 * D + 4 * H, by: "A" } },
];

/** the limit that was crossed, the value at that moment and the signal quality, for the alarm grid */
const EXTRA: Record<string, Pick<LogAlarm, "limit" | "value" | "quality">> = {
  a1: { limit: "2.5 bar", value: "1.8 bar" }, a2: { limit: "60 dB", value: "71 dB" }, a3: { limit: "", value: "No signal", quality: "Bad" },
  a4: { limit: "2 L/s", value: "6 L/s" }, a5: { limit: "", value: "87 %" }, a6: { limit: "0.35 mg/L", value: "0.34 mg/L" },
  a7: { limit: "", value: "1,712 L/s" }, a8: { limit: "60 dB", value: "62 dB" }, a9: { limit: "120 A", value: "148 A" },
  a10: { limit: "7.1 mm/s", value: "6.8 mm/s" }, a11: { limit: "60 dB", value: "66 dB" }, a12: { limit: "50 NTU", value: "85 NTU" },
  a13: { limit: "0.3 bar", value: "0.6 bar" }, a14: { limit: "25 %", value: "19 %" }, a15: { limit: "", value: "Offline", quality: "Bad" },
  a16: { limit: "0.8 mg/L", value: "0.6 mg/L" }, a17: { limit: "1 ppm", value: "Fault", quality: "Bad" }, a18: { limit: "5 bar", value: "4.9 bar" },
  a19: { limit: "80 C", value: "82 C" }, a20: { limit: "0.35 mg/L", value: "0.5 mg/L" },
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
