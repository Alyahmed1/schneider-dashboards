import { M, type Equip, type Metric, type ScenarioDef } from "./diagram";

export const EQUIP: Equip[] = [
  { id: "intake", n: 1, name: "Intake", what: "Pumps raw water from the river or a well through a screen that blocks leaves, fish and trash.", why: "Everything starts here. If intake is low or muddy, every stage after it works harder." },
  { id: "clarifier", n: 2, name: "Clarifier", what: "A chemical (coagulant) makes tiny dirt particles stick together so they sink. Clean water flows off the top, sludge is scraped off the bottom.", why: "It removes most of the mud, so the filters downstream last longer." },
  { id: "filter", n: 3, name: "Sand filter", what: "Water trickles down through layers of coal, sand and gravel that catch the fine particles the clarifier missed.", why: "When the filter gets dirty the pressure drop rises, and it is cleaned by a backwash." },
  { id: "uf", n: 4, name: "Ultrafiltration", what: "Thousands of hollow fibres with microscopic holes block bacteria and the finest particles.", why: "It protects the RO membranes. Clean feed water means a longer membrane life." },
  { id: "ro", n: 5, name: "Reverse osmosis", what: "A high-pressure pump pushes water through membranes that let water through and hold salts back. The salty reject stream goes to wastewater treatment.", why: "This is the biggest energy user and the heart of the quality. Fouled membranes cost power and purity." },
  { id: "tank", n: 6, name: "Treated tank", what: "Stores the clean water, with its pH and chlorine kept in range, ready to send to the users.", why: "The buffer that keeps production running while the treatment train changes speed." },
  { id: "cooling", n: 7, name: "Cooling tower", what: "Cools hot process water by letting some evaporate. Fresh make-up water replaces what is lost.", why: "One of the biggest water users on site. Saving water here saves money." },
  { id: "boiler", n: 8, name: "Boiler", what: "Turns very pure water into steam for heating and power. It needs almost no dissolved salt or oxygen.", why: "Poor boiler water scales and corrodes the tubes, which is expensive and unsafe." },
  { id: "process", n: 9, name: "Process use", what: "The factory lines that use the water to make products.", why: "This is the reason the plant exists. It needs steady flow, pressure and quality." },
  { id: "etp", n: 10, name: "Wastewater", what: "Cleans all used water and the RO reject. Most of it goes back to the intake for reuse, the rest is discharged within permit limits.", why: "It decides how much fresh water you must take in and keeps you compliant." },
];

export function metrics(id: string, s: string): Metric[] {
  const storm = s === "storm";
  const foul = s === "fouling";
  switch (id) {
    case "intake": return [
      M("flow", "Raw water flow", "m³/h", storm ? 820 : 770, 0, 0.015),
      M("turb", "Raw turbidity", "NTU", storm ? 180 : 25, 0, 0.04, storm ? "bad" : "good"),
      M("power", "Pump power", "kW", storm ? 124 : 112, 0, 0.01),
      M("level", "Intake level", "%", storm ? 91 : 82, 0, 0.004),
    ];
    case "clarifier": return [
      M("turb", "Settled turbidity", "NTU", storm ? 18 : 4.2, 1, 0.03, storm ? "warn" : "good"),
      M("dose", "Coagulant dose", "mg/L", storm ? 55 : 28, 0, 0.01, storm ? "warn" : "good"),
      M("blanket", "Sludge blanket", "m", storm ? 2.4 : 1.2, 1, 0.01, storm ? "warn" : "good"),
      M("hrt", "Retention time", "h", 2.4, 1, 0.005),
    ];
    case "filter": return [
      M("dp", "Pressure drop", "bar", storm ? 1.1 : 0.45, 2, 0.02, storm ? "warn" : "good"),
      M("turb", "Filtrate turbidity", "NTU", storm ? 0.9 : 0.3, 1, 0.04, storm ? "warn" : "good"),
      M("rate", "Filtration rate", "m/h", 9, 1, 0.01),
      M("bw", "Next backwash in", "h", storm ? 1.2 : 5.5, 1, 0.01, storm ? "warn" : "good"),
    ];
    case "uf": return [
      M("tmp", "Membrane pressure", "bar", storm ? 0.9 : 0.6, 2, 0.02, storm ? "warn" : "good"),
      M("turb", "Permeate turbidity", "NTU", 0.05, 2, 0.04),
      M("flux", "Flux", "L/m²/h", 62, 0, 0.01),
      M("sdi", "Silt index (SDI)", "", storm ? 3.8 : 2.4, 1, 0.02, storm ? "warn" : "good"),
    ];
    case "ro": return [
      M("press", "Feed pressure", "bar", foul ? 17.4 : 15.2, 1, 0.01, foul ? "warn" : "good"),
      M("dp", "Pressure drop", "bar", foul ? 2.9 : 1.4, 1, 0.02, foul ? "bad" : "good"),
      M("rec", "Recovery", "%", foul ? 71 : 78, 1, 0.004, foul ? "warn" : "good"),
      M("cond", "Permeate conductivity", "µS/cm", foul ? 96 : 42, 0, 0.02, foul ? "warn" : "good"),
      M("rej", "Salt rejection", "%", foul ? 98.1 : 99.2, 1, 0.001, foul ? "warn" : "good"),
      M("sec", "Specific energy", "kWh/m³", foul ? 1.78 : 1.42, 2, 0.01, foul ? "warn" : "good"),
    ];
    case "tank": return [
      M("level", "Tank level", "%", 74, 0, 0.01),
      M("flow", "Treated water flow", "m³/h", foul ? 590 : 640, 0, 0.012, foul ? "warn" : "good"),
      M("ph", "pH", "", 7.4, 1, 0.005),
      M("cl", "Residual chlorine", "mg/L", 0.5, 2, 0.02),
    ];
    case "cooling": return [
      M("makeup", "Make-up water", "m³/h", 38, 0, 0.02),
      M("coc", "Cycles of concentration", "", 5.2, 1, 0.01),
      M("cond", "Blowdown conductivity", "µS/cm", 1850, 0, 0.01),
      M("temp", "Basin temperature", "°C", 31.5, 1, 0.01),
    ];
    case "boiler": return [
      M("feed", "Feed water flow", "m³/h", 22, 0, 0.015),
      M("steam", "Steam output", "t/h", 20, 0, 0.012),
      M("cond", "Feed water conductivity", "µS/cm", foul ? 11 : 5, 0, 0.03, foul ? "warn" : "good"),
      M("o2", "Dissolved oxygen", "ppb", 6, 0, 0.04),
    ];
    case "process": return [
      M("demand", "Water demand", "m³/h", 310, 0, 0.02),
      M("cond", "Water conductivity", "µS/cm", foul ? 96 : 42, 0, 0.02, foul ? "warn" : "good"),
      M("press", "Line pressure", "bar", 4.2, 1, 0.01),
      M("spec", "Water per tonne of product", "m³/t", 2.1, 1, 0.01),
    ];
    case "etp": return [
      M("inflow", "Inflow", "m³/h", foul ? 215 : 190, 0, 0.02),
      M("reuse", "Reuse rate", "%", foul ? 74 : 79.4, 1, 0.004, foul ? "warn" : "good"),
      M("cod", "COD out", "mg/L", 42, 0, 0.03),
      M("ph", "Discharge pH", "", 7.2, 1, 0.005),
    ];
    default: return [];
  }
}

export const SCENARIOS: ScenarioDef[] = [
  { id: "normal", label: "Normal day", story: "Everything is in range. Click any equipment to see what it does." },
  { id: "storm", label: "Storm: muddy river", story: "Heavy rain: the river is muddy (180 NTU, normally 25). Watch the clarifier and filter." },
  { id: "fouling", label: "RO fouling", story: "RO membranes are clogging: pressure drop up, quality slipping, energy rising." },
];
