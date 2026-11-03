import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { ASSETS, fmt, pivotsAt, PUMPS, series, STATIONS, stationNow } from "./farm";
import { LZONES, SENSORS, sensorValue, zonesAt } from "./landscape";
import { PARAMS } from "./grey";

type Cell = string | number;
const csv = (rows: Cell[][]) => rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
function download(name: string, rows: Cell[][]) {
  const url = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${name}.csv`; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const hourNow = () => Math.min(23.9, new Date().getHours() + new Date().getMinutes() / 60);

const ITEMS: { label: string; run: () => void }[] = [
  { label: "Pivots (CSV)", run: () => download("pivots", [["Pivot", "Crop", "Stage", "Status", "Soil moisture %", "Applied today mm"], ...pivotsAt(hourNow()).map((n) => [n.p.id, n.p.crop, n.p.stage, n.status, fmt(n.moist, 1), fmt(n.applied, 1)])]) },
  { label: "Pump stations (CSV)", run: () => download("pump-stations", [["Station", "Pump", "State", "Flow m3/h", "Power kW", "Vibration mm/s", "Motor temp C", "Run hours"], ...STATIONS.flatMap((s) => stationNow(s.id, hourNow()).pumps.map((p) => [s.id, p.def.id, p.state, fmt(p.q), fmt(p.kw, 1), fmt(p.vib, 1), fmt(p.temp), PUMPS.find((x) => x.id === p.def.id)!.hours]))]) },
  { label: "Water and energy, 7 days (CSV)", run: () => download("water-energy-7d", [["Day", "Applied m3", "Crop demand m3"], ...series({ range: "7D" }).map((p) => [p.t, p.applied, p.demand])]) },
  { label: "Landscape zones and sensors (CSV)", run: () => download("landscape", [["Zone", "Type", "Controller", "Status", "Soil moisture %"], ...zonesAt(hourNow()).map((n) => [n.z.id, n.z.type, n.z.ctrl, n.status, fmt(n.moist, 1)]), [], ["Sensor", "Type", "Reading", "Status"], ...SENSORS.map((s) => [s.id, s.kind, fmt(sensorValue(s, hourNow()), 1), s.status])]) },
  { label: "Grey water quality (CSV)", run: () => download("grey-water-quality", [["Parameter", "Unit", "Raw in", "Treated out", "Limit"], ...PARAMS.map((p) => [p.name, p.unit, p.inlet ?? "", p.outlet, `${p.min ?? ""}${p.min !== undefined && p.max !== undefined ? " to " : ""}${p.max ?? ""}`])]) },
  { label: "Work orders (CSV)", run: () => download("work-orders", [["Asset", "Status", "Next maintenance", "Work order", "Priority"], ...ASSETS.filter((a) => a.wo).map((a) => [a.id, a.status, a.next, a.wo!.status, a.wo!.priority])]) },
  { label: "Print or save as PDF", run: () => window.print() },
];

/** the export button in the top bar: a short list of downloads and a print option */
export default function ExportMenu() {
  const [show, setShow] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!show) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setShow(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setShow(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [show]);
  void LZONES;
  return (
    <div className="bell" ref={box}>
      <button className="icon-btn" onClick={() => setShow((s) => !s)} aria-label="Export data" aria-expanded={show} title="Export"><Download size={16} /></button>
      {show && (
        <div className="bell-pop menu" role="menu" aria-label="Export">
          {ITEMS.map((i) => <button key={i.label} role="menuitem" onClick={() => { i.run(); setShow(false); }}>{i.label}</button>)}
        </div>
      )}
    </div>
  );
}
