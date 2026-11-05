import { M, type Equip, type Metric, type ScenarioDef } from "./diagram";

export const CPG_EQUIP: Equip[] = [
  { id: "rawt", n: 1, name: "Raw water tank", what: "Stores the incoming town or well water before it is treated.", why: "A buffer so the plant never runs dry during a supply dip." },
  { id: "pre", n: 2, name: "Carbon filter", what: "Removes particles, and the chlorine that would damage the RO membranes and change the taste.", why: "Clean feed water protects every machine after it." },
  { id: "soft", n: 3, name: "Softener", what: "Swaps hardness minerals (calcium and magnesium) for sodium, so scale does not build up in pipes and heaters.", why: "Scale wastes energy and blocks the filling machines." },
  { id: "ro", n: 4, name: "Reverse osmosis", what: "Pushes water through membranes that hold back salts, making the pure water that goes into drinks.", why: "Pure, consistent water means a product that tastes the same every day." },
  { id: "uv", n: 5, name: "UV disinfection", what: "Ultraviolet light kills bacteria and viruses without adding any chemical.", why: "Food safety: the last barrier before the water reaches the product." },
  { id: "ptank", n: 6, name: "Process tank", what: "Hygienic storage of the finished process water, ready for the lines.", why: "If the level falls too low, the lines stop." },
  { id: "fill", n: 7, name: "Filling line", what: "Fills, caps and labels the bottles. Water is the ingredient and also the rinse.", why: "Litres of water per litre of product is the number every plant manager watches." },
  { id: "cip", n: 8, name: "CIP cleaning", what: "Clean-in-place: hot caustic, rinse water and acid are pumped through pipes and tanks automatically, so nothing needs to be taken apart.", why: "Essential for hygiene, but it uses a lot of water and chemicals, so it is a big saving opportunity." },
  { id: "util", n: 9, name: "Steam & cooling", what: "Boiler steam for pasteurising and heating, and cooling water for chillers and compressors.", why: "The second biggest water user after the product itself." },
  { id: "etp", n: 10, name: "Wastewater", what: "Cleans the used water and the rinse water. The cleanest part is recovered and sent back to the start.", why: "Keeps the plant inside its discharge permit and lowers the water bill." },
];

export function cpgMetrics(id: string, s: string): Metric[] {
  const hot = s === "hot";
  const cip = s === "cip";
  switch (id) {
    case "rawt": return [
      M("level", "Tank level", "%", hot ? 55 : 78, 0, 0.01, hot ? "warn" : "good"),
      M("flow", "Inflow", "m³/h", hot ? 185 : 142, 0, 0.015),
      M("hard", "Hardness", "mg/L", 220, 0, 0.008),
      M("turb", "Turbidity", "NTU", 1.2, 1, 0.03),
    ];
    case "pre": return [
      M("dp", "Pressure drop", "bar", hot ? 0.55 : 0.4, 2, 0.02),
      M("cl", "Chlorine out", "mg/L", 0.02, 2, 0.05),
      M("turb", "Turbidity out", "NTU", 0.2, 1, 0.04),
      M("bw", "Next backwash in", "h", hot ? 9 : 14, 0, 0.01),
    ];
    case "soft": return [
      M("out", "Hardness out", "mg/L", hot ? 0.8 : 0.5, 1, 0.04, hot ? "warn" : "good"),
      M("left", "Resin capacity left", "%", hot ? 34 : 62, 0, 0.01, hot ? "warn" : "good"),
      M("flow", "Flow", "m³/h", hot ? 170 : 128, 0, 0.015),
      M("salt", "Salt use", "kg/day", hot ? 180 : 120, 0, 0.01),
    ];
    case "ro": return [
      M("cond", "Permeate conductivity", "µS/cm", hot ? 7 : 6, 0, 0.03),
      M("rec", "Recovery", "%", hot ? 74 : 75, 1, 0.004),
      M("press", "Feed pressure", "bar", hot ? 12.8 : 11.5, 1, 0.01, hot ? "warn" : "good"),
      M("rej", "Salt rejection", "%", 98.8, 1, 0.001),
    ];
    case "uv": return [
      M("dose", "UV dose", "mJ/cm²", hot ? 38 : 40, 0, 0.01),
      M("int", "Lamp intensity", "%", hot ? 91 : 94, 0, 0.006),
      M("uvt", "Transmittance", "%", 92, 0, 0.004),
      M("life", "Lamp life left", "h", 5800, 0, 0.0005),
    ];
    case "ptank": return [
      M("level", "Tank level", "%", hot ? 41 : 70, 0, 0.01, hot ? "warn" : "good"),
      M("cond", "Conductivity", "µS/cm", 8, 0, 0.03),
      M("temp", "Temperature", "°C", hot ? 26 : 22, 1, 0.008, hot ? "warn" : "good"),
      M("bact", "Bacteria", "CFU/100 mL", 0, 0, 0),
    ];
    case "fill": return [
      M("speed", "Line speed", "k bottles/h", hot ? 42 : 36, 0, 0.01, hot ? "warn" : "good"),
      M("wpl", "Water per litre of product", "L/L", cip ? 2.3 : hot ? 2.2 : 1.9, 1, 0.01, cip || hot ? "warn" : "good"),
      M("rej", "Rejected bottles", "%", cip ? 1.8 : hot ? 0.6 : 0.4, 1, 0.03, cip ? "warn" : "good"),
      M("temp", "Fill temperature", "°C", hot ? 14 : 8, 0, 0.01, hot ? "warn" : "good"),
    ];
    case "cip": return [
      M("cyc", "Cycles today", "", cip ? 15 : 12, 0, 0),
      M("rinse", "Rinse conductivity (target 5)", "µS/cm", cip ? 38 : 4, 0, 0.03, cip ? "bad" : "good"),
      M("caustic", "Caustic strength", "%", 1.8, 1, 0.01),
      M("wuse", "CIP water use", "m³/h", cip ? 34 : 18, 0, 0.02, cip ? "warn" : "good"),
    ];
    case "util": return [
      M("steam", "Steam output", "t/h", hot ? 11 : 8, 0, 0.012, hot ? "warn" : "good"),
      M("cool", "Cooling water", "m³/h", hot ? 95 : 60, 0, 0.015, hot ? "warn" : "good"),
      M("cond", "Feed water conductivity", "µS/cm", 12, 0, 0.03),
      M("chill", "Chiller temperature", "°C", hot ? 8 : 6, 1, 0.01, hot ? "warn" : "good"),
    ];
    case "etp": return [
      M("in", "Inflow", "m³/h", cip ? 130 : hot ? 110 : 85, 0, 0.02, cip || hot ? "warn" : "good"),
      M("reuse", "Water recovered", "%", cip ? 29 : hot ? 36 : 38, 1, 0.005, cip ? "warn" : "good"),
      M("cod", "COD out", "mg/L", cip ? 140 : hot ? 74 : 60, 0, 0.03, cip ? "warn" : "good"),
      M("ph", "Discharge pH", "", cip ? 9.2 : 7.1, 1, 0.006, cip ? "bad" : "good"),
    ];
    default: return [];
  }
}

export const CPG_SCENARIOS: ScenarioDef[] = [
  { id: "normal", label: "Normal day", story: "1.9 litres of water per litre of product. Click any equipment for details." },
  { id: "hot", label: "Hot day peak", story: "Hot day: cooling and filling demand jump and the process tank drains fast." },
  { id: "cip", label: "CIP rinse fault", story: "CIP rinse fault: caustic left in the rinse water, so water use and pH climb." },
];
