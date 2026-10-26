// Story mode: a guided tour that moves through the tabs and drives them. The tour sends small commands; each tab listens for the ones it understands.
import { useEffect, useRef } from "react";
import type { TabId } from "./data";

export const storyCmd = (cmd: string, arg?: string) => window.dispatchEvent(new CustomEvent("story", { detail: { cmd, arg } }));

/** a tab calls this to react to the tour's commands (only while it is on screen) */
export function useStoryCmd(handler: (cmd: string, arg?: string) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail as { cmd: string; arg?: string }; ref.current(d.cmd, d.arg); };
    window.addEventListener("story", on);
    return () => window.removeEventListener("story", on);
  }, []);
}

export interface Step { tab: TabId; secs: number; title: string; text: string; cmds?: { t: number; cmd: string; arg?: string }[] }

/** the tour, about ninety seconds. Captions use the brief's own words where it has them. */
export const STEPS: Step[] = [
  { tab: "home", secs: 7, title: "Telal West at a glance", text: "A future-focused community of 380 feddan: 80% residential, 20% mixed-use. One screen for all of it.",
    cmds: [{ t: 2.4, cmd: "home:zone", arg: "commercial" }, { t: 4.8, cmd: "home:zone", arg: "villas" }] },
  { tab: "plan", secs: 7, title: "A plan you can explore", text: "Eight zones traced from the brief's zoning map. Zoom to a zone and colour the whole plan by power, water or occupancy.",
    cmds: [{ t: 1.5, cmd: "plan:metric", arg: "power" }, { t: 3, cmd: "plan:select", arg: "commercial" }, { t: 6, cmd: "plan:select", arg: "" }] },
  { tab: "plan", secs: 5, title: "Central. Connected. Convenient.", text: "Landmarks within 5, 10 and 15 kilometres, and the drive times from the brief.",
    cmds: [{ t: 0.4, cmd: "plan:metric", arg: "use" }, { t: 0.8, cmd: "plan:view", arg: "location" }] },
  { tab: "mobility", secs: 8, title: "AI traffic management", text: "Predict traffic flow and optimize mobility across the community. Watch the evening peak build, road by road.",
    cmds: [{ t: 1.2, cmd: "mob:hour", arg: "16.5" }, { t: 1.4, cmd: "mob:play" }] },
  { tab: "mobility", secs: 5, title: "Smart parking management", text: "Real-time parking availability and guidance for residents and visitors, from the gate to the bay.",
    cmds: [{ t: 0.4, cmd: "mob:lot", arg: "p2" }] },
  { tab: "utilities", secs: 7, title: "Energy optimization", text: "Optimize energy usage for higher efficiency and lower costs. Move flexible load out of the evening peak and the bill falls.",
    cmds: [{ t: 1.4, cmd: "ut:view", arg: "energy" }, { t: 2.2, cmd: "ut:shift", arg: "70" }] },
  { tab: "utilities", secs: 6, title: "Water monitoring", text: "Smart monitoring and optimization of water consumption, down to a suspected leak in one district.",
    cmds: [{ t: 0.4, cmd: "ut:view", arg: "water" }] },
  { tab: "assets", secs: 7, title: "Predictive maintenance", text: "AI detects issues before failures occur, reducing downtime and maintenance costs. Each asset shows when it will reach its limit.",
    cmds: [{ t: 1.4, cmd: "as:select", arg: "PS-2" }, { t: 4.2, cmd: "as:select", arg: "AH-2" }] },
  { tab: "safety", secs: 7, title: "AI video analytics", text: "Intelligent monitoring and analysis to enhance safety and security, with privacy built in: counts, never faces.",
    cmds: [{ t: 1, cmd: "sf:cam", arg: "C2" }, { t: 4, cmd: "sf:cam", arg: "C5" }] },
  { tab: "assistant", secs: 11, title: "AI resident assistant", text: "A chatbot and self-service portal for quick access to services. Every answer moves the map.",
    cmds: [{ t: 1.2, cmd: "ai:ask", arg: "Where can I park near the hotel?" }, { t: 6.4, cmd: "ai:ask", arg: "Which gate is quickest right now?" }] },
  { tab: "platform", secs: 8, title: "Digital data platform", text: "A connected AI platform that integrates data and enables future city services, with no new pipeline for each one.",
    cmds: [{ t: 1.2, cmd: "pf:select", arg: "lake" }, { t: 3.2, cmd: "pf:future", arg: "f1" }, { t: 5.2, cmd: "pf:future", arg: "f2" }] },
  { tab: "home", secs: 6, title: "More than a home. A smarter way to live.", text: "Eight AI services on one platform, designed to evolve into a scalable AI-powered community." },
];
export const TOTAL_SECS = STEPS.reduce((s, x) => s + x.secs, 0);
