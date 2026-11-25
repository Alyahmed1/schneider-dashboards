import { useState } from "react";
import { Check } from "lucide-react";
import { DOMAIN_COLOR, ZONE_BY_ID, type Domain } from "./data";
import { ago, useAlerts, useFilters, type Sev } from "./state";
import { Seg } from "./ui";

const SEV: { id: "all" | Sev; label: string }[] = [{ id: "all", label: "All" }, { id: "critical", label: "Critical" }, { id: "warning", label: "Warning" }, { id: "info", label: "Info" }];

/** the live alert feed: follows the zone filter, can be narrowed by severity, and every alert can be acknowledged */
export function AlertList({ domains, compact = false }: { domains?: Domain[]; compact?: boolean }) {
  const { alerts, ack, ackAll } = useAlerts();
  const { zone } = useFilters();
  const [sev, setSev] = useState<"all" | Sev>("all");
  const list = alerts.filter((a) => (zone === "all" || a.zone === zone) && (!domains || domains.includes(a.domain)) && (sev === "all" || a.sev === sev));
  const open = list.filter((a) => !a.ack).length;
  return (
    <div className="alerts-wrap">
      <div className="alerts-bar">
        {!compact && <Seg label="Severity" value={sev} options={SEV} onChange={setSev} />}
        <span className="muted">{open} open</span>
        <button className="link" onClick={ackAll}>Acknowledge all</button>
      </div>
      <ul className="alerts">
        {list.length === 0 && <li className="empty">No alerts for this selection.</li>}
        {list.map((a) => (
          <li key={a.id} className={`alert sev-${a.sev} ${a.ack ? "acked" : ""}`}>
            <i className="sev-dot" />
            <div><p>{a.text}</p><small><span style={{ color: `color-mix(in srgb, ${DOMAIN_COLOR[a.domain]} 62%, var(--ink))` }}>{a.domain}</span> · {ZONE_BY_ID[a.zone].name} · {ago(a.at)}</small></div>
            <button className="ack" onClick={() => ack(a.id)} disabled={a.ack} aria-label={a.ack ? "Acknowledged" : "Acknowledge alert"} title={a.ack ? "Acknowledged" : "Acknowledge"}><Check size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
