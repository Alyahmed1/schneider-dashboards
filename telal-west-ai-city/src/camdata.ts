// Simulated cameras for the AI video analytics demo. The views are pictures from the brief; the detections are made up and move along paths drawn on those pictures. No real video, no real people.
import type { Pt, ZoneId } from "./data";

export type Cls = "person" | "vehicle" | "cart" | "bike";
export type XY = [number, number];
export interface Obj { cls: Cls; path: XY[]; speed: number; phase: number }
export interface Cam {
  id: string; name: string; zone: ZoneId; at: Pt; /** viewing direction on the plan, degrees clockwise from east */ dir: number;
  img: string; kind: "objects" | "density" | "offline"; objs: Obj[]; density?: { x: number; y: number; r: number; v: number }[];
}

/** box size as a share of the picture width and height, for an object at the bottom of the view; it shrinks towards the horizon */
export const SIZE: Record<Cls, [number, number]> = { person: [0.032, 0.1], vehicle: [0.075, 0.07], cart: [0.05, 0.06], bike: [0.034, 0.075] };
export const CLS_LABEL: Record<Cls, string> = { person: "Person", vehicle: "Vehicle", cart: "Golf cart", bike: "Bicycle" };

export const CAMS: Cam[] = [
  { id: "C1", name: "West gate and avenue", zone: "commercial", at: [300, 610], dir: -40, img: "/cams/cam1.jpg", kind: "objects", objs: [
    { cls: "vehicle", path: [[0.97, 0.62], [0.88, 0.78], [0.8, 0.98]], speed: 0.07, phase: 0 },
    { cls: "vehicle", path: [[0.0, 0.62], [0.15, 0.75], [0.35, 0.99]], speed: 0.06, phase: 0.3 },
    { cls: "vehicle", path: [[0.35, 0.99], [0.15, 0.75], [0.0, 0.62]], speed: 0.055, phase: 0.7 },
  ] },
  { id: "C2", name: "Clubhouse promenade", zone: "golf", at: [556, 640], dir: 90, img: "/cams/cam2.jpg", kind: "objects", objs: [
    { cls: "person", path: [[0.45, 0.97], [0.3, 0.85], [0.15, 0.75], [0.08, 0.62]], speed: 0.05, phase: 0 },
    { cls: "person", path: [[0.05, 0.5], [0.25, 0.55], [0.4, 0.52]], speed: 0.035, phase: 0.2 },
    { cls: "person", path: [[0.4, 0.9], [0.25, 0.8], [0.1, 0.7]], speed: 0.045, phase: 0.55 },
    { cls: "bike", path: [[0.08, 0.62], [0.2, 0.75], [0.4, 0.92]], speed: 0.1, phase: 0.1 },
  ] },
  { id: "C3", name: "Golf, north corridor", zone: "golf", at: [505, 380], dir: 20, img: "/cams/cam3.jpg", kind: "objects", objs: [
    { cls: "cart", path: [[0.08, 0.72], [0.2, 0.6], [0.28, 0.66], [0.35, 0.75]], speed: 0.06, phase: 0 },
    { cls: "person", path: [[0.35, 0.3], [0.45, 0.35], [0.5, 0.4]], speed: 0.02, phase: 0.3 },
    { cls: "person", path: [[0.55, 0.42], [0.62, 0.38]], speed: 0.02, phase: 0.6 },
  ] },
  { id: "C4", name: "Lagoon bend", zone: "golf", at: [515, 705], dir: -20, img: "/cams/cam4.jpg", kind: "objects", objs: [
    { cls: "cart", path: [[0.4, 0.9], [0.55, 0.78], [0.7, 0.7], [0.82, 0.62]], speed: 0.06, phase: 0.2 },
    { cls: "person", path: [[0.8, 0.85], [0.9, 0.8]], speed: 0.02, phase: 0 },
  ] },
  { id: "C5", name: "South-east gate boulevard", zone: "villas", at: [775, 708], dir: 150, img: "/cams/cam5.jpg", kind: "objects", objs: [
    { cls: "vehicle", path: [[0.55, 0.98], [0.58, 0.85], [0.66, 0.75], [0.82, 0.65], [0.97, 0.58]], speed: 0.08, phase: 0 },
    { cls: "vehicle", path: [[0.97, 0.58], [0.82, 0.65], [0.66, 0.75], [0.58, 0.85], [0.55, 0.98]], speed: 0.07, phase: 0.45 },
  ] },
  { id: "C6", name: "Villa loop", zone: "villas", at: [440, 505], dir: 200, img: "/cams/cam6.jpg", kind: "objects", objs: [
    { cls: "vehicle", path: [[0.67, 1.0], [0.7, 0.85], [0.8, 0.72], [0.92, 0.62], [1.0, 0.58]], speed: 0.07, phase: 0.1 },
    { cls: "cart", path: [[1.0, 0.58], [0.92, 0.62], [0.8, 0.72], [0.7, 0.85], [0.67, 1.0]], speed: 0.05, phase: 0.6 },
  ] },
  { id: "C7", name: "Drone D1, town centre", zone: "apartments", at: [610, 420], dir: 100, img: "/cams/cam7.jpg", kind: "density", objs: [], density: [
    { x: 0.3, y: 0.62, r: 0.1, v: 0.82 }, { x: 0.62, y: 0.55, r: 0.07, v: 0.55 }, { x: 0.25, y: 0.3, r: 0.08, v: 0.35 },
  ] },
  { id: "C8", name: "North gate", zone: "school", at: [470, 203], dir: 90, img: "/cams/cam1.jpg", kind: "offline", objs: [] },
];

export interface Evt { id: string; cam: string; text: string; sev: "bad" | "warn" | "info"; minsAgo: number }
/** today's events, each a number of minutes before now so the list is never empty */
export const EVENTS: Evt[] = [
  { id: "e1", cam: "C8", text: "Camera offline: the network port at the north gate is down", sev: "bad", minsAgo: 14 },
  { id: "e2", cam: "C2", text: "Promenade crowd above 80% of comfortable capacity", sev: "warn", minsAgo: 38 },
  { id: "e3", cam: "C5", text: "Vehicle stopped near the south-east gate for over 3 minutes", sev: "warn", minsAgo: 71 },
  { id: "e4", cam: "C1", text: "Wrong-way vehicle on West Avenue, cleared in 40 seconds", sev: "bad", minsAgo: 126 },
  { id: "e5", cam: "C4", text: "Unattended bag near the clubhouse path", sev: "warn", minsAgo: 205 },
  { id: "e6", cam: "C6", text: "Three vehicles over 40 km/h on the villa loop", sev: "info", minsAgo: 290 },
];
export const timeAgo = (m: number) => { const d = new Date(Date.now() - m * 60000); return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); };
