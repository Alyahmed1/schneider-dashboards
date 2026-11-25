import { CheckCircle2, CreditCard, Inbox, Receipt, Smartphone, Wallet } from "lucide-react";
import { CITY } from "./data";
import { useCity } from "./model";
import { sp } from "./Overview";
import { ServiceDiagram } from "./Diagram";
import { Bars, Donut, Kpi, KpiRow, Meter, Panel, StatusPill, TimeChart, fmt } from "./ui";

const CATS = [["Billing questions", 0.26], ["Street lighting", 0.14], ["Waste collection", 0.13], ["Water supply", 0.12], ["Parking", 0.1], ["Permits and fees", 0.1], ["Other", 0.15]] as const;

export default function Citizens() {
  const m = useCity();
  const cats = CATS.map(([name, s]) => ({ name, v: Math.round(m.requests * s) }));
  return (
    <div className="tab">
      <KpiRow cols={6}>
        <Kpi n={0} label="Active app users" value={m.users} icon={Smartphone} tone="violet" sub="of 50,000 units" />
        <Kpi n={1} label="Requests today" value={m.requests} icon={Inbox} spark={sp(m.series.requests, "Requests")} />
        <Kpi n={2} label="Resolved in SLA" value={m.resolved} decimals={0} suffix="%" icon={CheckCircle2} tone="good" />
        <Kpi n={3} label="Bill collection" value={m.collection} decimals={1} suffix="%" icon={Receipt} tone="info" />
        <Kpi n={4} label="E-wallet payments" value={m.wallet} icon={Wallet} tone="warn" sub="today" />
        <Kpi n={5} label="Smart cards in use" value={Math.round(m.users * 0.62)} icon={CreditCard} tone="bad" />
      </KpiRow>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1.1fr) minmax(0,1fr)" }}>
          <Panel i={0} title="Citizen requests, raised vs resolved"><TimeChart rows={m.series.requests} legend keys={[{ k: "Requests", color: "var(--violet)" }, { k: "Resolved", color: "var(--good)", dash: true }]} /></Panel>
          <Panel i={1} title="Requests by service"><Bars vertical data={cats} color="#8a63c8" /></Panel>
        </div>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1fr) minmax(0,1fr)" }}>
          <Panel i={2} title="Unified billing, collection" aside={<StatusPill tone="info">sample</StatusPill>}>
            <div className="scroll">
              <Meter label="Electricity" value={Math.min(99, m.collection + 1.4)} decimals={1} tone="good" />
              <Meter label="Water" value={Math.min(99, m.collection - 2.1)} decimals={1} tone="info" />
              <Meter label="Gas" value={Math.min(99, m.collection - 0.6)} decimals={1} tone="warn" />
              <Meter label="Services and fees" value={Math.min(99, m.collection - 4.3)} decimals={1} tone="violet" />
            </div>
          </Panel>
          <Panel i={3} title="Payment channels"><Donut center={fmt(m.wallet)} sub="payments" data={[{ name: "E-wallet", v: Math.round(m.wallet * 0.46), color: "#8a63c8" }, { name: "Smart card", v: Math.round(m.wallet * 0.31), color: "#e0a526" }, { name: "City app", v: Math.round(m.wallet * 0.23), color: "#2f9bd6" }]} /></Panel>
        </div>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1fr) minmax(0,1fr)" }}>
          <Panel i={4} title="Citizen units used (5-year licence)">
            <div className="scroll">
              <Meter label="Active units" value={m.users} max={CITY.citizenUnits} unit="" tone="violet" note={`${fmt(CITY.citizenUnits - m.users)} units still free`} />
              <Meter label="Portal and app satisfaction" value={4.4} max={5} unit=" / 5" decimals={1} tone="good" />
              <Meter label="Average response time" value={7.2} max={24} unit=" h" decimals={1} tone="info" />
            </div>
          </Panel>
          <Panel i={5} title="Citizen request journey"><ServiceDiagram m={m} /></Panel>
        </div>
      </div>
    </div>
  );
}
