import { CITY, ZONES, type Zone } from "./data";
import { bounce, inside, makePath, type MapPath } from "./geo";
import { rng } from "./live";

/* Bus network drawn on the master plan picture (1327 x 682).
   REAL: 50 bus stations (CITY.busStations, from the Excel). SAMPLE: routes, buses, timings and loads. The routes follow the main roads of the picture, traced by eye. */
export interface Station { id: string; n: number; route: string; s: number; x: number; y: number; zone: Zone | null }
export interface Route { id: string; name: string; color: string; ctrl: [number, number][]; stops: number; buses: number; oneWayMin: number; headway: number; onTime: number; path: MapPath; stations: Station[] }
export interface Bus { id: string; route: string; u0: number; du: number; idx: number }

const DEFS: Omit<Route, "path" | "stations">[] = [
  { id: "R1", name: "Coastal Line", color: "#ff8a00", stops: 10, buses: 5, oneWayMin: 26, headway: 7, onTime: 92, ctrl: [[505, 228], [600, 206], [690, 205], [800, 232], [900, 285], [975, 326], [1090, 336], [1175, 362], [1225, 430], [1222, 510], [1200, 590]] },
  { id: "R2", name: "Spine Line", color: "#7c4dff", stops: 12, buses: 6, oneWayMin: 34, headway: 6, onTime: 89, ctrl: [[8, 80], [130, 150], [290, 215], [430, 268], [520, 308], [612, 350], [700, 420], [790, 500], [880, 540], [990, 552], [1100, 550], [1195, 565]] },
  { id: "R3", name: "South Link", color: "#0a8bff", stops: 11, buses: 5, oneWayMin: 32, headway: 8, onTime: 94, ctrl: [[8, 196], [100, 262], [220, 335], [310, 405], [430, 490], [560, 560], [640, 600], [780, 635], [900, 650], [1050, 660], [1120, 676]] },
  { id: "R4", name: "West Avenue", color: "#e91e8c", stops: 9, buses: 4, oneWayMin: 24, headway: 9, onTime: 90, ctrl: [[268, 14], [322, 150], [282, 262], [252, 340], [222, 440], [212, 550], [186, 650]] },
  { id: "R5", name: "Marina Link", color: "#14b86b", stops: 8, buses: 3, oneWayMin: 18, headway: 10, onTime: 96, ctrl: [[965, 334], [957, 430], [948, 520], [945, 565], [950, 625]] },
];

export const ROUTES: Route[] = DEFS.map((d) => {
  const path = makePath(d.ctrl, 22);
  const stations: Station[] = Array.from({ length: d.stops }, (_, i) => {
    const s = i / (d.stops - 1), p = path.at(s);
    return { id: `${d.id}-${String(i + 1).padStart(2, "0")}`, n: i + 1, route: d.id, s, x: p.x, y: p.y, zone: ZONES.find((z) => inside(p.x, p.y, z.poly)) ?? null };
  });
  return { ...d, path, stations };
});
export const ROUTE_BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r])) as Record<string, Route>;
export const STATIONS = ROUTES.flatMap((r) => r.stations);
export const STATIONS_TOTAL = STATIONS.length; // equals CITY.busStations (50)
if (STATIONS_TOTAL !== CITY.busStations) console.warn("Bus stations drawn on the map differ from the Excel count");

/** seconds for a bus to drive a route one way on screen */
const ONE_WAY_S = 110;
export const BUSES: Bus[] = ROUTES.flatMap((r, ri) => {
  const g = rng(500 + ri * 31);
  return Array.from({ length: r.buses }, (_, j) => ({ id: `${r.id}-${String(j + 1).padStart(2, "0")}`, route: r.id, idx: j, u0: ((j + 0.35) / r.buses) * 2, du: (1 / ONE_WAY_S) * (0.92 + g() * 0.16) }));
});

export interface BusNow { bus: Bus; route: Route; s: number; forward: boolean; x: number; y: number; angle: number }
export function busNow(b: Bus, t: number): BusNow {
  const route = ROUTE_BY_ID[b.route], u = b.u0 + b.du * t;
  const s = bounce(u), forward = (((u % 2) + 2) % 2) < 1;
  const p = route.path.at(s);
  return { bus: b, route, s, forward, x: p.x, y: p.y, angle: p.a };
}

/** the station a bus is heading to, and in how many (sample) minutes it gets there */
export function nextStop(n: BusNow) {
  const st = n.route.stations;
  const ahead = n.forward ? st.find((x) => x.s > n.s + 1e-6) : [...st].reverse().find((x) => x.s < n.s - 1e-6);
  const stop = ahead ?? (n.forward ? st[st.length - 1] : st[0]);
  return { stop, min: etaMin(n.bus, n.route, stop, n) };
}

/** minutes until the bus is next at this station, looking forward along its out-and-back trip */
export function etaMin(b: Bus, route: Route, st: Station, n: BusNow) {
  const cur = n.forward ? n.s : 2 - n.s; // position on the 0..2 loop
  const targets = [st.s, 2 - st.s];
  const d = Math.min(...targets.map((T) => (((T - cur) % 2) + 2) % 2));
  return (d / b.du / ONE_WAY_S) * route.oneWayMin;
}

/** sample load and speed of a bus, steady between live refreshes */
export const busLoad = (id: string, tick: number) => Math.round(25 + rng(id.charCodeAt(1) * 97 + id.charCodeAt(3) * 13 + tick * 7)() * 68);
export const busKmh = (id: string, tick: number) => Math.round(18 + rng(id.charCodeAt(1) * 31 + id.charCodeAt(4) * 17 + tick * 11)() * 26);
