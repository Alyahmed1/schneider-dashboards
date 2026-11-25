import type { Scenario } from "./cams";

/* Variable message signs (VMS) on the road. The sign shows what the faults call for (auto), or what an operator published (manual).
   Everything here is SAMPLE: no real sign controller is connected. */
export type VmsLines = string[];
export const PRESETS: { label: string; lines: VmsLines }[] = [
  { label: "Drive safely", lines: ["DRIVE SAFELY", "MAX 100 KM/H", "KEEP YOUR DISTANCE"] },
  { label: "Slow down", lines: ["SLOW DOWN", "INCIDENT AHEAD", "MAX 60 KM/H"] },
  { label: "Lane closed", lines: ["LANE CLOSED AHEAD", "MERGE TO THE LEFT", "MAX 60 KM/H"] },
  { label: "Fog", lines: ["FOG AHEAD", "MAX 60 KM/H", "FOG LIGHTS ON"] },
  { label: "Sandstorm", lines: ["SANDSTORM", "MAX 50 KM/H", "LOW VISIBILITY"] },
  { label: "Roadworks", lines: ["ROADWORKS", "LANE 1 CLOSED", "MAX 80 KM/H"] },
  { label: "Road closed", lines: ["ROAD CLOSED", "TAKE THE EXIT", "FOLLOW THE DIVERSION"] },
];

/** the message a sign shows by itself for a given scene */
export function autoVms(sc: Scenario): VmsLines {
  if (sc.wrongWay) return ["WRONG-WAY VEHICLE", "STOP AND KEEP RIGHT", "REDUCE SPEED"];
  if (sc.pedestrian) return ["PEDESTRIAN ON ROAD", "SLOW DOWN", "MAX 40 KM/H"];
  if (sc.laneStop) return ["STOPPED VEHICLE", "LANE 2 BLOCKED", "MERGE LEFT"];
  if (sc.accident) return ["ACCIDENT AHEAD", "LANE 2 CLOSED", "MAX 40 KM/H"];
  if (sc.weather === "fog") return ["FOG AHEAD", "MAX 60 KM/H", "FOG LIGHTS ON"];
  if (sc.weather === "sand") return ["SANDSTORM", "MAX 50 KM/H", "LOW VISIBILITY"];
  if (sc.rain) return ["HEAVY RAIN", "MAX 60 KM/H", "SLIPPERY ROAD"];
  if (sc.debris) return ["DEBRIS ON ROAD", "KEEP LEFT", "MAX 60 KM/H"];
  if (sc.roadworks) return ["ROADWORKS", "LANE 1 CLOSED", "MAX 80 KM/H"];
  if (sc.queue) return ["QUEUE AHEAD", "PREPARE TO STOP", "MAX 40 KM/H"];
  if (sc.shoulder !== "none") return ["STOPPED VEHICLE", "SLOW DOWN", "KEEP LEFT"];
  if (sc.pothole) return ["ROAD DAMAGE", "KEEP RIGHT LANES CLEAR", "MAX 80 KM/H"];
  return ["DRIVE SAFELY", "MAX 100 KM/H", "KEEP YOUR DISTANCE"];
}
export type VmsMode = "auto" | "manual" | "offline";
