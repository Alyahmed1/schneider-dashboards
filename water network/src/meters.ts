import { INSTRUMENTS, NODES, pipeById, ZONES } from "./network";

/** every meter, grouped by what it belongs to: the four supply pieces first, then each zone */
const FACILITY: { name: string; ids: string[] }[] = [
  { name: "Treatment plant", ids: ["FT-01"] },
  { name: "PS-1 pumps", ids: ["PU-01", "PT-01"] },
  { name: "Reservoir", ids: ["LT-01", "AT-01"] },
  { name: "PS-2 booster", ids: ["PU-02", "PRV-01"] },
];
const inFacility = new Set(FACILITY.flatMap((f) => f.ids));

const zoneOf = (id: string) => {
  const inst = INSTRUMENTS.find((i) => i.id === id)!;
  if (inst.at.node) return NODES.find((n) => n.id === inst.at.node)?.zone;
  const p = pipeById(inst.at.pipe!);
  return p.zone === "trunk" ? undefined : p.zone;
};

export const METER_GROUPS: { name: string; ids: string[] }[] = [
  ...FACILITY,
  ...ZONES.map((z) => ({ name: z.name, ids: INSTRUMENTS.filter((m) => !inFacility.has(m.id) && zoneOf(m.id) === z.id).map((m) => m.id) })).filter((g) => g.ids.length),
];
