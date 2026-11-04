import { networkAt, ZONES, type ZoneId } from "./network";
import { GOOD, MID, type Metric } from "./mapcolor";
import { zoneInfo } from "./geo";

/** the three zones as a plain list: shown on a phone, where the map is small */
export default function ZoneList({ metric, hour, zone, onZone }: { metric: Metric; hour: number; zone: ZoneId | null; onZone: (z: ZoneId | null) => void }) {
  const s = networkAt(hour);
  const from: Record<string, string> = { Z1: "Fed from the hub", Z3: "Fed from the hub", Z4: "Fed from the PS-2 booster" };
  return (
    <ul className="ns-list" aria-label="The three zones">
      {ZONES.map((z) => {
        const q = s.zones[z.id], info = zoneInfo(metric, s, z.id);
        return (
          <li key={z.id}>
            <button type="button" className={`${GOOD === info.c ? "lv0" : MID === info.c ? "lv1" : "lv2"} ${zone === z.id ? "on" : ""}`} onClick={() => onZone(zone === z.id ? null : z.id)} aria-pressed={zone === z.id}>
              <b>{z.name}</b><span className="v">{info.big} <small>{info.unit}</small></span>
              <small>{q.pressure.toFixed(1)} bar · {(q.nrw * 100).toFixed(0)}% lost · {(q.loss * 86.4).toLocaleString("en-US", { maximumFractionDigits: 0 })} m³/day</small>
              <em>{from[z.id]}</em>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
