import { Activity, Gauge, Network, Siren, Users, Zap } from "lucide-react";
import { CITY, DOMAIN_COLOR, FIELD_DEVICES, LAYERS, SHARE, ZONES, type LayerId, type TabId } from "./data";
import { useCity } from "./model";
import { useAlerts, useFilters, zoneName } from "./state";
import CityMap from "./CityMap";
import { AlertList } from "./Alerts";
import { Bars, Kpi, KpiRow, Panel, TimeChart, fmt } from "./ui";

export const sp = (rows: Record<string, number | string>[], key: string) => rows.slice(-14).map((r) => Number(r[key]));

export const LayerChips = ({ layers, toggle }: { layers: LayerId[]; toggle: (id: LayerId) => void }) => (
  <div className="chips">{LAYERS.map((l) => <button key={l.id} className={`chip ${layers.includes(l.id) ? "on" : ""}`} onClick={() => toggle(l.id)} style={{ ["--c" as string]: l.color }}><i />{l.label}</button>)}</div>
);

const LAYERS_ON: LayerId[] = ["bus", "parking"];

export default function Overview({ go }: { go: (t: TabId) => void }) {
  const m = useCity();
  const { zone } = useFilters();
  const { alerts } = useAlerts();
  const critical = alerts.filter((a) => !a.ack && a.sev === "critical" && (zone === "all" || a.zone === zone)).length;
  const byZone = ZONES.map((z, i) => ({ name: z.name.split(" ")[0], v: Math.round((CITY.meters * SHARE.meters[i] + CITY.ibmsPoints * SHARE.ibms[i] + FIELD_DEVICES / 8)) }));
  const connected = m.meters + m.points + m.poles + m.sensors + m.bins + m.stations + m.screens + m.lots;
  return (
    <div className="tab">
      <KpiRow cols={6}>
        <Kpi n={0} label="Connected points" value={connected} icon={Network} sub={`${zoneName(zone)} · Excel quantities`} onClick={() => go("plan")} />
        <Kpi n={1} label="Smart meters online" value={m.metersOnlinePct} decimals={1} suffix="%" icon={Gauge} tone="good" sub={`${fmt(m.meters)} meters`} spark={sp(m.series.load, "Actual")} onClick={() => go("utilities")} />
        <Kpi n={2} label="City load" value={m.loadMW} decimals={1} suffix=" MW" icon={Zap} tone="warn" sub={`peak ${fmt(m.peakMW)} MW (sample)`} spark={sp(m.series.load, "Forecast")} onClick={() => go("utilities")} />
        <Kpi n={3} label="Platform health" value={m.overall} decimals={1} suffix="%" icon={Activity} tone="info" sub="9 domains" onClick={() => go("security")} />
        <Kpi n={4} label="Open critical alerts" value={critical} icon={Siren} tone={critical ? "bad" : "good"} sub="Live feed" />
        <Kpi n={5} label="Citizen app users" value={m.users} icon={Users} tone="violet" sub="of 50,000 units" spark={sp(m.series.requests, "Requests")} onClick={() => go("citizens")} />
      </KpiRow>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1.55fr) minmax(0,1fr) minmax(0,1fr)" }}>
        <div className="col" style={{ gridTemplateRows: "auto minmax(0,1fr)" }}>
          <section className="panel mapcard" style={{ ["--i" as string]: 0 }}>
            <CityMap layers={LAYERS_ON} labels={false} dotScale={1.1} />
            <button className="mapcard-open" onClick={() => go("plan")}>Open master plan</button>
          </section>
          <Panel i={1} title="Connected points by zone"><Bars data={byZone} color="var(--accent)" /></Panel>
        </div>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1.5fr) minmax(0,1fr)" }}>
          <Panel i={1} title="System health by domain" aside={<span className="muted">sample</span>}>
            <div className="hrows">{m.health.map((h) => (
              <div key={h.domain} className={`hrow tone-${h.score > 95 ? "good" : "info"}`}>
                <span title={h.domain}>{h.domain}</span>
                <div className="meter-bar"><i style={{ width: `${h.score}%` }} /></div>
                <b>{h.score.toFixed(1)}%</b>
              </div>
            ))}</div>
          </Panel>
          <Panel i={2} title="Electricity load (MW)"><TimeChart rows={m.series.load} unit=" MW" keys={[{ k: "Actual", color: "var(--accent)" }, { k: "Forecast", color: DOMAIN_COLOR["Utilities & energy"], dash: true }]} legend /></Panel>
        </div>
        <Panel i={3} title="Live alerts" className="grow"><AlertList /></Panel>
      </div>
    </div>
  );
}
