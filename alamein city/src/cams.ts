import type { RoadModel, RoadSev } from "./road";

/* The simulated road cameras. Every picture is generated in the browser (3D scene, no video) and every reading is SAMPLE data.
   A camera shows a fault when the matching road incident (road.ts) is active, plus a few faults of its own. */
export type Weather = "clear" | "fog" | "sand";
export type Env = "desert" | "coast" | "city";
export type FaultKind = "Accident" | "Debris" | "Stopped vehicle" | "Breakdown" | "Wrong-way driver" | "Road damage" | "Low visibility" | "Sandstorm" | "Roadworks" | "Queue" | "Lamp fault" | "Lens dust" | "VMS offline" | "Pedestrian" | "Pedestrians" | "Heavy rain";

/** `stream` is an optional real video address (MP4/HLS); when set the screen plays it instead of the simulated 3D road */
export interface Cam { photo?: "p1" | "p2" | "p3" | "p4" | "p5" | "p6"; stream?: string; id: string; n: number; name: string; s: number; env: Env; link?: number; height: number; xOff: number; lookX: number }
export const CAMS: Cam[] = [
  { id: "C1", n: 1, name: "Fouka", s: 0.14, env: "coast", height: 8.5, xOff: 0, lookX: 0.5 },
  { id: "C2", n: 2, name: "Ras El Hekma", s: 0.22, env: "coast", link: 3, height: 9, xOff: 0, lookX: -1 },
  { id: "C3", n: 3, name: "Sidi Abdel Rahman", s: 0.34, env: "desert", link: 1, height: 8, xOff: 0, lookX: 0 },
  { id: "C4", n: 4, name: "New Alamein interchange", s: 0.5, env: "city", link: 7, height: 9.5, xOff: 0, lookX: 0 },
  { id: "C5", n: 5, name: "El Alamein", s: 0.59, env: "desert", link: 2, height: 8, xOff: 0, lookX: -0.5 },
  { id: "C6", n: 6, name: "Alamein south", s: 0.69, env: "desert", link: 5, height: 8.5, xOff: 0, lookX: 0.8 },
  { id: "C7", n: 7, name: "Hammam", s: 0.8, env: "desert", link: 4, height: 8, xOff: 0, lookX: 0 },
  { id: "C8", n: 8, name: "Borg El Arab", s: 0.9, env: "city", link: 6, height: 9, xOff: 0, lookX: 0 },
  { id: "P1", n: 9, name: "Towers boulevard", s: 0.52, env: "city", photo: "p1", height: 0, xOff: 0, lookX: 0 },
  { id: "P2", n: 10, name: "Lagoon promenade", s: 0.55, env: "city", photo: "p2", height: 0, xOff: 0, lookX: 0 },
  { id: "P3", n: 11, name: "Palm avenue", s: 0.58, env: "city", photo: "p3", height: 0, xOff: 0, lookX: 0 },
  { id: "P4", n: 12, name: "Roadworks bend", s: 0.62, env: "city", photo: "p4", height: 0, xOff: 0, lookX: 0 },
  { id: "P5", n: 13, name: "Rooftop view", s: 0.66, env: "city", photo: "p5", height: 0, xOff: 0, lookX: 0 },
  { id: "P6", n: 14, name: "Aerial boulevard", s: 0.7, env: "city", photo: "p6", height: 0, xOff: 0, lookX: 0 },
];

export interface Scenario {
  weather: Weather;
  accident: boolean; debris: boolean;
  shoulder: "none" | "right" | "left"; shoulderTruck: boolean;
  roadworks: boolean; lampOut: boolean; queue: boolean; wrongWay: boolean; pothole: boolean; dust: boolean; vmsOffline: boolean;
  laneStop: boolean; pedestrian: boolean; rain: boolean;
}
export interface Fault { id: string; cam: string; kind: FaultKind; sev: RoadSev; title: string; detail: string; mins: number; conf: number }

const base = (): Scenario => ({ weather: "clear", accident: false, debris: false, shoulder: "none", shoulderTruck: false, roadworks: false, lampOut: false, queue: false, wrongWay: false, pothole: false, dust: false, vmsOffline: false, laneStop: false, pedestrian: false, rain: false });

/** the scene and the faults of one camera at this moment (tick = live refresh count) */
export function readCam(cam: Cam, road: RoadModel, tick: number): { sc: Scenario; faults: Fault[] } {
  const sc = base(), faults: Fault[] = [];
  const inc = cam.link ? road.incidents.find((i) => i.id === cam.link) : undefined;
  const add = (kind: FaultKind, sev: RoadSev, title: string, detail: string, mins: number, conf = 94 + ((cam.n * 7 + kind.length) % 6)) =>
    faults.push({ id: `${cam.id}-${kind}`, cam: cam.id, kind, sev, title, detail, mins, conf });
  const mins = inc?.mins ?? 0;

  switch (cam.id) {
    case "C1":
      sc.pothole = true;
      add("Road damage", "warning", "Pothole in lane 3", "about 40 cm wide, 6 cm deep, maintenance ticket raised", 310 + Math.floor((tick * 8) / 60));
      if (tick % 12 < 4) { sc.wrongWay = true; add("Wrong-way driver", "critical", "Wrong-way vehicle", "fast lane, driving towards the camera at about 80 km/h", 0); }
      break;
    case "C2":
      if (inc) { sc.weather = "fog"; add("Low visibility", "warning", "Dense fog", "visibility about 280 m, speed limit lowered to 60 km/h", mins); }
      break;
    case "C3":
      if (inc) {
        sc.accident = true; sc.debris = true;
        add("Accident", "critical", "Accident, lane 2 blocked", "two vehicles, ambulance and patrol on scene", mins);
        add("Debris", "warning", "Debris on the carriageway", "vehicle parts across lanes 2 and 3", mins);
      }
      break;
    case "C4":
      if (inc) { sc.shoulder = "right"; add("Stopped vehicle", "warning", "Stopped vehicle on the hard shoulder", "hazard lights on, patrol on the way", mins); }
      break;
    case "C5":
      sc.vmsOffline = true;
      add("VMS offline", "warning", "Message sign offline", "no reply from the sign controller, last message frozen", 95 + Math.floor((tick * 8) / 60));
      if (inc) { sc.shoulder = "left"; sc.shoulderTruck = true; add("Breakdown", "warning", "Truck broken down", "hard shoulder, Matrouh-bound, tow requested", mins); }
      break;
    case "C6":
      sc.lampOut = true;
      add("Lamp fault", "warning", "Street light out", "one pole dark, work order created", 540 + Math.floor((tick * 8) / 60));
      if (inc) { sc.roadworks = true; add("Roadworks", "info", "Lane 1 closed for resurfacing", "taper and arrow board in place, until 18:00", mins); }
      break;
    case "C7":
      if (inc) {
        sc.weather = "sand"; sc.dust = true;
        add("Sandstorm", "warning", "Sandstorm", "blowing sand, visibility about 1.6 km, wind 46 km/h", mins);
        add("Lens dust", "info", "Dust on the camera lens", "image quality reduced, cleaning scheduled", mins + 6);
      }
      break;
    case "P1":
      if (tick % 14 < 10) { sc.laneStop = true; add("Stopped vehicle", "warning", "Stopped vehicle in lane 2", "hazard lights on, traffic merging left", 2 + Math.floor(((tick % 14) * 8) / 60)); }
      break;
    case "P2":
      sc.rain = true;
      add("Heavy rain", "warning", "Heavy rain", "wet pavement, reduced grip on the promenade", 38 + Math.floor((tick * 8) / 60));
      add("Pedestrians", "info", "Pedestrians on the promenade", "2 people walking, no action needed", 3);
      break;
    case "P3":
      sc.debris = true;
      add("Debris", "warning", "Debris in lane 3", "object on the carriageway, patrol requested", 17 + Math.floor((tick * 8) / 60));
      if (tick % 10 < 4) { sc.pedestrian = true; add("Pedestrian", "critical", "Pedestrian on the carriageway", "crossing the road, traffic slowing", 0); }
      break;
    case "P4":
      sc.roadworks = true;
      add("Roadworks", "info", "Lane closed for roadworks", "cones and barrier in place, crew on the pavement", 96 + Math.floor((tick * 8) / 60));
      if (tick % 8 < 3) add("Pedestrian", "warning", "Worker near the carriageway", "outside the cone line, traffic slowing", 1);
      break;
    case "P5":
      if (tick % 9 < 3) { sc.wrongWay = true; add("Wrong-way driver", "critical", "Wrong-way vehicle", "fast lane of the far carriageway, driving against traffic", 0); }
      break;
    case "P6":
      if (tick % 12 < 8) { sc.queue = true; add("Queue", "info", "Slow traffic, queue forming", "queue about 300 m on the right carriageway", 6 + Math.floor(((tick % 12) * 8) / 60)); }
      break;
    case "C8":
      if (inc) { sc.queue = true; add("Queue", "info", "Slow traffic, queue forming", "queue about 650 m, average 14 km/h", mins); }
      break;
  }
  return { sc, faults };
}

export const scenarioKey = (sc: Scenario) => JSON.stringify(sc);
