import { M, type Equip, type Metric, type ScenarioDef } from "./diagram";

export const MMM_EQUIP: Equip[] = [
  { id: "pit", n: 1, name: "Pit & borefield", what: "Pumps rainwater and groundwater out of the open pit and draws fresh water from bores when the site needs more.", why: "Fresh water is the scarce, costly part. The less you draw here, the better the site performs." },
  { id: "mill", n: 2, name: "Grinding mill", what: "A huge rotating drum with steel balls crushes the ore into fine powder, and water is added to make a slurry.", why: "Water per tonne of ore is the headline efficiency number for a mine." },
  { id: "flot", n: 3, name: "Flotation", what: "Air bubbles carry the valuable metal particles to the top as froth, while the waste rock sinks.", why: "This is where the metal is captured. It needs the right water chemistry (pH and salts)." },
  { id: "thick", n: 4, name: "Thickener", what: "Settles the waste slurry so most of the water can be taken off the top and reused instead of being lost with the waste.", why: "Every cubic metre recovered here is a cubic metre of fresh water you do not have to buy." },
  { id: "tail", n: 5, name: "Tailings dam", what: "A large pond with an embankment that stores the waste solids and holds the water that comes with them.", why: "Safety first: freeboard (free height below the dam crest) must never get too small." },
  { id: "pond", n: 6, name: "Return pond", what: "A barge pump collects clear water from the dam and sends it back to the plant.", why: "It is the heart of recycling. Salts build up here when water is scarce." },
  { id: "dust", n: 7, name: "Dust suppression", what: "Water trucks spray haul roads and stockpiles to keep dust down.", why: "Protects workers and the neighbours, and it is a big water user in dry weather." },
  { id: "crush", n: 8, name: "Crusher", what: "Breaks big rocks into smaller pieces. Fine water sprays catch the dust at the source.", why: "Dry crushing makes dust. A little water here saves a lot of trouble later." },
  { id: "svc", n: 9, name: "Plant services", what: "Cooling water and seal water that keep pumps, motors and gearboxes from overheating.", why: "A small flow, but a pump without seal water fails fast." },
  { id: "wtp", n: 10, name: "Water treatment", what: "Neutralises acidic runoff with lime and removes dissolved metals before the water is reused or released.", why: "It keeps the site inside its discharge permit, with copper below 0.1 mg/L." },
];

export function mmmMetrics(id: string, s: string): Metric[] {
  const rain = s === "rain";
  const dry = s === "drought";
  switch (id) {
    case "pit": return [
      M("make", "Fresh water make-up", "m³/h", rain ? 120 : dry ? 520 : 310, 0, 0.015, dry ? "bad" : "good"),
      M("sump", "Pit sump level", "%", rain ? 82 : dry ? 22 : 38, 0, 0.01, rain ? "bad" : "good"),
      M("dewater", "Dewatering flow", "m³/h", rain ? 940 : dry ? 300 : 540, 0, 0.015, rain ? "warn" : "good"),
      M("power", "Pump power", "kW", rain ? 1420 : dry ? 610 : 880, 0, 0.01, rain ? "warn" : "good"),
    ];
    case "mill": return [
      M("feed", "Ore feed", "t/h", dry ? 780 : 850, 0, 0.01, dry ? "warn" : "good"),
      M("water", "Water added", "m³/h", dry ? 780 : 935, 0, 0.012, dry ? "warn" : "good"),
      M("dens", "Slurry density", "% solids", dry ? 76 : rain ? 70 : 72, 0, 0.006, dry ? "warn" : "good"),
      M("wpt", "Water per tonne of ore", "m³/t", dry ? 1.25 : rain ? 1.0 : 1.1, 2, 0.01, dry ? "warn" : "good"),
    ];
    case "flot": return [
      M("rec", "Copper recovery", "%", dry ? 85.1 : rain ? 87.8 : 88.2, 1, 0.004, dry ? "warn" : "good"),
      M("ph", "Pulp pH", "", dry ? 10.9 : 10.6, 1, 0.006),
      M("air", "Air flow", "Nm³/min", 62, 0, 0.015),
      M("grade", "Concentrate grade", "% Cu", dry ? 26.4 : 27.5, 1, 0.005, dry ? "warn" : "good"),
    ];
    case "thick": return [
      M("under", "Underflow density", "% solids", rain ? 58 : dry ? 66 : 62, 0, 0.008, rain || dry ? "warn" : "good"),
      M("clar", "Overflow clarity (TSS)", "mg/L", rain ? 260 : dry ? 140 : 150, 0, 0.03, rain ? "warn" : "good"),
      M("floc", "Flocculant dose", "g/t", rain ? 24 : 18, 0, 0.01),
      M("torque", "Rake torque", "%", rain ? 55 : dry ? 44 : 38, 0, 0.015, rain ? "warn" : "good"),
    ];
    case "tail": return [
      M("fb", "Freeboard", "m", rain ? 0.8 : dry ? 3.1 : 2.4, 1, 0.01, rain ? "bad" : "good"),
      M("level", "Pond level", "%", rain ? 91 : dry ? 48 : 62, 0, 0.006, rain ? "bad" : "good"),
      M("seep", "Seepage", "L/s", rain ? 11 : dry ? 5 : 6, 0, 0.02, rain ? "warn" : "good"),
      M("ph", "Pond pH", "", dry ? 9.4 : rain ? 8.6 : 8.9, 1, 0.005),
    ];
    case "pond": return [
      M("level", "Pond level", "%", rain ? 94 : dry ? 28 : 71, 0, 0.008, rain ? "warn" : dry ? "bad" : "good"),
      M("ret", "Return flow", "m³/h", rain ? 700 : dry ? 420 : 640, 0, 0.012, dry ? "warn" : "good"),
      M("recy", "Water recycled", "%", rain ? 88 : dry ? 68 : 82, 1, 0.004, dry ? "warn" : "good"),
      M("cond", "Conductivity", "µS/cm", rain ? 1700 : dry ? 3900 : 2400, 0, 0.01, dry ? "warn" : "good"),
      M("so4", "Sulphate", "mg/L", rain ? 640 : dry ? 1350 : 880, 0, 0.012, dry ? "warn" : "good"),
    ];
    case "dust": return [
      M("use", "Water use", "m³/h", rain ? 8 : dry ? 62 : 55, 0, 0.02, dry ? "warn" : "good"),
      M("trucks", "Water trucks active", "", rain ? 1 : 6, 0, 0),
      M("moist", "Road moisture", "%", rain ? 9 : dry ? 2.1 : 4.5, 1, 0.02, dry ? "warn" : "good"),
      M("pm10", "Dust (PM10)", "µg/m³", rain ? 12 : dry ? 96 : 38, 0, 0.03, dry ? "warn" : "good"),
    ];
    case "crush": return [
      M("thr", "Throughput", "t/h", dry ? 960 : 1050, 0, 0.01),
      M("spray", "Spray water", "m³/h", rain ? 20 : dry ? 36 : 28, 0, 0.02),
      M("dust", "Dust at crusher", "mg/m³", dry ? 3.4 : 1.8, 1, 0.03, dry ? "warn" : "good"),
      M("wear", "Liner wear", "%", 62, 0, 0.004),
    ];
    case "svc": return [
      M("flow", "Service water flow", "m³/h", 35, 0, 0.015),
      M("temp", "Cooling water temp", "°C", dry ? 38 : 32, 1, 0.01, dry ? "warn" : "good"),
      M("press", "Seal water pressure", "bar", 5.2, 1, 0.01),
      M("seal", "Seal water flow", "L/min", 140, 0, 0.015),
    ];
    case "wtp": return [
      M("in", "Inflow", "m³/h", rain ? 330 : dry ? 90 : 140, 0, 0.02, rain ? "warn" : "good"),
      M("cu", "Copper out (limit 0.1)", "mg/L", rain ? 0.09 : dry ? 0.03 : 0.04, 2, 0.04, rain ? "warn" : "good"),
      M("ph", "Discharge pH", "", rain ? 7.2 : dry ? 7.8 : 7.6, 1, 0.005),
      M("sludge", "Sludge produced", "t/day", rain ? 48 : dry ? 15 : 22, 0, 0.02, rain ? "warn" : "good"),
    ];
    default: return [];
  }
}

export const MMM_SCENARIOS: ScenarioDef[] = [
  { id: "normal", label: "Normal day", story: "The mine recycles 82% of its water. Click any equipment for its readings." },
  { id: "rain", label: "Heavy rain", story: "Heavy rain: the pit is filling and the dam freeboard is down to 0.8 m." },
  { id: "drought", label: "Drought", story: "Drought: fresh water is scarce, salts build up and dust control is rationed." },
];
