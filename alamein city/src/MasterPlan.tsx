import { useState } from "react";
import { Building2, Car, Droplets, Gauge, Lamp, Trash2 } from "lucide-react";
import { CITY, SHARE, ZONES, type LayerId } from "./data";
import { shareOf, useFilters } from "./state";
import CityMap from "./CityMap";
import { LayerChips } from "./Overview";
import { Kpi, KpiRow, Panel, Stat, fmt } from "./ui";

export default function MasterPlan() {
  const { zone, setZone } = useFilters();
  const [layers, setLayers] = useState<LayerId[]>(["poles", "water", "waste", "bus", "parking", "signage"]);
  const toggle = (id: LayerId) => setLayers((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const cur = ZONES.find((z) => z.id === zone);
  const n = (t: number, k: keyof typeof SHARE) => Math.round(t * shareOf(k, zone));
  return (
    <div className="tab">
      <KpiRow cols={6}>
        <Kpi n={0} label="Smart meters" value={n(CITY.meters, "meters")} icon={Gauge} />
        <Kpi n={1} label="Smart poles" value={n(CITY.poles, "poles")} icon={Lamp} tone="warn" />
        <Kpi n={2} label="Water sensors" value={n(CITY.waterSensors, "water")} icon={Droplets} tone="info" />
        <Kpi n={3} label="Waste bins" value={n(CITY.bins, "waste")} icon={Trash2} tone="good" />
        <Kpi n={4} label="Parking lots" value={n(CITY.parking, "parking")} icon={Car} tone="violet" />
        <Kpi n={5} label="IBMS points" value={n(CITY.ibmsPoints, "ibms")} icon={Building2} tone="bad" />
      </KpiRow>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,2.3fr) minmax(0,1fr)" }}>
        <Panel i={0} title="" className="planmap" aside={<LayerChips layers={layers} toggle={toggle} />}>
          <CityMap layers={layers} />
        </Panel>
        <div className="col" style={{ gridTemplateRows: "auto minmax(0,1fr)" }}>
          <Panel i={1} title={cur ? cur.name : "Whole city"} aside={cur && <button className="link" onClick={() => setZone("all")}>Show all</button>}>
            <p className="muted small">{cur ? cur.kind : "8 zones, sample shares of each device type"}</p>
            <p className="note">Zones are traced by hand and device dots are illustrative. Click a zone to filter every tab.</p>
            <div className="stats">
              <Stat label="Meters" value={fmt(n(CITY.meters, "meters"))} /><Stat label="Poles" value={fmt(n(CITY.poles, "poles"))} />
              <Stat label="Parking" value={fmt(n(CITY.parking, "parking"))} /><Stat label="Signage" value={fmt(n(CITY.signage, "signage"))} />
            </div>
          </Panel>
          <Panel i={2} title="Zones" className="grow">
            <div className="scroll">
              <table className="tbl">
                <thead><tr><th>Zone</th><th className="r">Meters</th><th className="r">Parking</th></tr></thead>
                <tbody>
                  {ZONES.map((z, i) => (
                    <tr key={z.id} className={zone === z.id ? "sel" : ""} onClick={() => setZone(zone === z.id ? "all" : z.id)}>
                      <td><b>{z.name}</b></td>
                      <td className="r">{fmt(Math.round(CITY.meters * SHARE.meters[i]))}</td>
                      <td className="r">{fmt(Math.round(CITY.parking * SHARE.parking[i]))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
