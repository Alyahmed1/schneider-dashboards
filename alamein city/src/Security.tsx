import { Bug, Cpu, Eye, HardDrive, Monitor, ShieldCheck, Timer } from "lucide-react";
import { CITY } from "./data";
import { useCity } from "./model";
import { sp } from "./Overview";
import { ArchDiagram } from "./Diagram";
import { Kpi, KpiRow, Meter, Panel, StatusPill, TimeChart, fmt } from "./ui";

const STACK = [["NG Firewall: internet", "Internet FW"], ["NG Firewall: OT", "OT FW"], ["NG Firewall: IoT", "IoT FW"], ["Web Application Firewall", "WAF"], ["Mail security", "Mail"], ["Endpoint detection (EDR)", "EDR"], ["SIEM and SOAR", "SIEM"], ["Identity and access (IAM)", "IAM"]] as const;
const RISKS = [["Field devices and IoT", "High"], ["OT and SCADA network", "High"], ["Citizen portal and app", "Medium"], ["Cloud and servers", "Medium"], ["Workstations", "Low"]] as const;

export default function Security() {
  const m = useCity();
  return (
    <div className="tab">
      <KpiRow cols={6}>
        <Kpi n={0} label="Threats blocked today" value={m.blocked} icon={ShieldCheck} tone="good" spark={sp(m.series.threats, "Blocked")} />
        <Kpi n={1} label="SIEM events / s" value={m.eps} icon={Eye} tone="info" />
        <Kpi n={2} label="Open vulnerabilities" value={m.openVulns} icon={Bug} tone="warn" />
        <Kpi n={3} label="Patch compliance" value={m.patch} decimals={1} suffix="%" icon={ShieldCheck} tone="good" />
        <Kpi n={4} label="Mean time to respond" value={m.mttr} decimals={0} suffix=" min" icon={Timer} tone="violet" />
        <Kpi n={5} label="Operator workstations" value={CITY.workstations} icon={Monitor} sub={`${CITY.operators} operators`} />
      </KpiRow>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1.1fr) minmax(0,1fr)" }}>
          <Panel i={0} title="Threats blocked per period"><TimeChart rows={m.series.threats} keys={[{ k: "Blocked", color: "var(--bad)" }]} /></Panel>
          <Panel i={1} title="Security stack in scope" aside={<StatusPill tone="good">all active</StatusPill>}>
            <ul className="rows scroll">{STACK.map(([n, k]) => <li key={k}><span>{n}</span><b className="good">online</b></li>)}</ul>
          </Panel>
        </div>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1fr) minmax(0,1fr)" }}>
          <Panel i={2} title="STRA risk register" aside={<StatusPill tone="info">sample</StatusPill>}>
            <ul className="rows scroll">{RISKS.map(([n, r]) => <li key={n}><span>{n}</span><b className={r === "High" ? "bad" : r === "Medium" ? "warn" : "good"}>{r}</b></li>)}</ul>
          </Panel>
          <Panel i={3} title="COC servers and storage (5-year sizing)">
            <div className="scroll">
              <Meter label="CPU" value={m.cpu} decimals={0} tone="info" /><Meter label="Memory" value={m.mem} decimals={0} tone="violet" />
              <Meter label="Storage" value={m.storage} decimals={0} tone={m.storage > 80 ? "warn" : "good"} />
            </div>
          </Panel>
        </div>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1.5fr) minmax(0,1fr)" }}>
          <Panel i={4} title="COC architecture" aside={<Cpu size={14} />}><ArchDiagram /></Panel>
          <Panel i={5} title="Backup and resilience" aside={<HardDrive size={14} />}>
            <div className="scroll"><Meter label="Backups completed" value={99.2} decimals={1} tone="good" /><Meter label="Recovery drill passed" value={96} decimals={0} tone="good" /><p className="note">{fmt(m.eps * 3600)} events analysed per hour (sample)</p></div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
