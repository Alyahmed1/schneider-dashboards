import { CITY } from "./data";
import type { CityModel } from "./model";
import { fmt } from "./ui";

/* small flow diagrams drawn in SVG; colours come from the theme so they work in light and dark */
interface N { id: string; x: number; y: number; w: number; h: number; title: string; lines?: string[]; color?: string }
interface E { a: string; b: string; label?: string; still?: boolean }

function Flow({ w, h, nodes, edges, label }: { w: number; h: number; nodes: N[]; edges: E[]; label: string }) {
  const by = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <div className="diagram">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
        <defs><marker id="arr" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--muted)" /></marker></defs>
        {edges.map((e, i) => {
          const a = by[e.a], b = by[e.b];
          const horiz = b.x >= a.x + a.w - 1;
          const [x1, y1, x2, y2] = horiz ? [a.x + a.w, a.y + a.h / 2, b.x, b.y + b.h / 2] : [a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, b.y];
          const d = horiz ? `M${x1} ${y1} C${x1 + (x2 - x1) / 2} ${y1} ${x1 + (x2 - x1) / 2} ${y2} ${x2} ${y2}` : `M${x1} ${y1} C${x1} ${y1 + (y2 - y1) / 2} ${x2} ${y1 + (y2 - y1) / 2} ${x2} ${y2}`;
          return (
            <g key={i}>
              <path d={d} className={`dg-edge ${e.still ? "" : "flow"}`} markerEnd="url(#arr)" />
              {e.label && <text className="dg-elabel" x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle">{e.label}</text>}
            </g>
          );
        })}
        {nodes.map((n) => (
          <g key={n.id}>
            <rect className="dg-node" x={n.x} y={n.y} width={n.w} height={n.h} rx={7} style={{ stroke: n.color ?? "var(--accent)" }} />
            <rect x={n.x} y={n.y} width={4} height={n.h} rx={2} fill={n.color ?? "var(--accent)"} />
            <text className="dg-title" x={n.x + n.w / 2 + 2} y={n.y + 16} textAnchor="middle">{n.title}</text>
            {n.lines?.map((l, i) => <text key={i} className="dg-sub" x={n.x + n.w / 2 + 2} y={n.y + 29 + i * 13} textAnchor="middle">{l}</text>)}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** field devices -> network -> platforms -> COC, with security wrapped around everything */
export function ArchDiagram() {
  return (
    <Flow w={440} h={212} label="COC architecture: field devices, network, platforms, operations center, security" nodes={[
      { id: "f", x: 0, y: 6, w: 98, h: 132, title: "Field", color: "var(--warn)", lines: ["156,360 meters", "1,600 poles", "5,000 sensors", "1,000 bins", "1,000 parking", "50 bus stops", "1,690 screens"] },
      { id: "n", x: 114, y: 6, w: 98, h: 132, title: "Network", color: "var(--info)", lines: ["EOR switches", "Existing core", "Internet FW", "OT FW", "IoT FW"] },
      { id: "p", x: 228, y: 6, w: 98, h: 132, title: "Platforms", color: "var(--violet)", lines: ["Unified SCADA", "ADMS · AMI", "GIS · IBMS", "Smart city apps", "Billing · Wallet", "Servers + storage"] },
      { id: "c", x: 342, y: 6, w: 98, h: 132, title: "COC", color: "var(--good)", lines: ["30 operators", "31 workstations", "Workforce Mgmt", "Service desk", "Citizen portal", "and city app"] },
      { id: "s", x: 0, y: 154, w: 440, h: 54, title: "Cybersecurity across every layer", color: "var(--bad)", lines: ["STRA report · NG firewall · WAF · EDR · SIEM · SOAR · IAM · mail security"] },
    ]} edges={[{ a: "f", b: "n" }, { a: "n", b: "p" }, { a: "p", b: "c" }]} />
  );
}

export function WaterDiagram({ m }: { m: CityModel }) {
  const f = m.flow;
  return (
    <Flow w={440} h={170} label="Water network schematic with live flow and pressure" nodes={[
      { id: "s", x: 0, y: 55, w: 84, h: 52, title: "Source", color: "var(--info)", lines: ["Desalination"] },
      { id: "p", x: 108, y: 55, w: 84, h: 52, title: "Pumping", color: "var(--info)", lines: [`${m.pressure.toFixed(1)} bar`] },
      { id: "t", x: 216, y: 55, w: 84, h: 52, title: "Storage", color: "var(--info)", lines: [`${fmt(f)} m³/h`] },
      { id: "a", x: 340, y: 0, w: 100, h: 46, title: "District A", color: "var(--accent)", lines: [`${fmt(f * 0.38)} m³/h`] },
      { id: "b", x: 340, y: 62, w: 100, h: 46, title: "District B", color: "var(--accent)", lines: [`${fmt(f * 0.34)} m³/h`] },
      { id: "c", x: 340, y: 124, w: 100, h: 46, title: "District C", color: "var(--accent)", lines: [`${fmt(f * 0.28)} m³/h`] },
    ]} edges={[{ a: "s", b: "p" }, { a: "p", b: "t" }, { a: "t", b: "a" }, { a: "t", b: "b" }, { a: "t", b: "c" }]} />
  );
}

export function WasteDiagram({ m }: { m: CityModel }) {
  return (
    <Flow w={440} h={150} label="Waste flow from smart bins to treatment" nodes={[
      { id: "b", x: 0, y: 49, w: 92, h: 52, title: "Smart bins", color: "var(--good)", lines: [`${fmt(m.bins)} bins`] },
      { id: "t", x: 124, y: 49, w: 92, h: 52, title: "Trucks", color: "var(--warn)", lines: [`${m.trucks} on route`] },
      { id: "x", x: 248, y: 49, w: 80, h: 52, title: "Transfer", color: "var(--info)", lines: ["station"] },
      { id: "r", x: 358, y: 0, w: 82, h: 42, title: "Recycling", color: "var(--good)", lines: ["32%"] },
      { id: "o", x: 358, y: 54, w: 82, h: 42, title: "Compost", color: "var(--violet)", lines: ["24%"] },
      { id: "l", x: 358, y: 108, w: 82, h: 42, title: "Landfill", color: "var(--muted)", lines: ["44%"] },
    ]} edges={[{ a: "b", b: "t" }, { a: "t", b: "x" }, { a: "x", b: "r" }, { a: "x", b: "o" }, { a: "x", b: "l" }]} />
  );
}

export function ServiceDiagram({ m }: { m: CityModel }) {
  return (
    <Flow w={440} h={150} label="Citizen request journey from app to resolved work order" nodes={[
      { id: "r", x: 0, y: 10, w: 130, h: 50, title: "Request", color: "var(--violet)", lines: ["App · portal · signage"] },
      { id: "d", x: 155, y: 10, w: 130, h: 50, title: "COC service desk", color: "var(--accent)", lines: [`${fmt(m.requests)} today`] },
      { id: "w", x: 310, y: 10, w: 130, h: 50, title: "Work order", color: "var(--warn)", lines: ["Workforce mgmt"] },
      { id: "f", x: 310, y: 90, w: 130, h: 50, title: "Field crew", color: "var(--info)", lines: ["dispatched on GIS"] },
      { id: "c", x: 155, y: 90, w: 130, h: 50, title: "Resolved", color: "var(--good)", lines: [`${m.resolved.toFixed(0)}% in SLA`] },
      { id: "b", x: 0, y: 90, w: 130, h: 50, title: "Billed / paid", color: "var(--violet)", lines: [`${CITY.citizenUnits / 1000}k units · wallet`] },
    ]} edges={[{ a: "r", b: "d" }, { a: "d", b: "w" }, { a: "w", b: "f" }, { a: "f", b: "c" }, { a: "c", b: "b" }]} />
  );
}
