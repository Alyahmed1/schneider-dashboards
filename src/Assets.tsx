import { useMemo, useState } from "react";
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, ClipboardPlus, Clock, Search, ShieldCheck, TriangleAlert, Wrench, type LucideIcon } from "lucide-react";
import { ZONES, type ZoneId } from "./data";
import MasterMap from "./MasterMap";
import { ASSETS, STATUS_TONE, avoided, days, type Asset, type Status } from "./assetdata";
import { downloadCsv, downloadPdf, type ReportSpec } from "./exportReport";
import ExportMenu from "./ExportMenu";
import { inDays, useWorkOrders } from "./workorders";
import { CountUp, Panel, useGrow } from "./ui";

const TIP = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 };
const STATUSES: ("All" | Status)[] = ["All", "Alert", "Watch", "OK"];
const zoneName = (id: ZoneId) => ZONES.find((z) => z.id === id)?.name ?? id;
const rulText = (a: Asset) => (a.rul === null ? ">90 days" : `${a.rul} days`);

/** Assets: predictive maintenance. The AI watches one sensor per asset and says when it will reach its limit. */
export default function Assets({ focus }: { focus?: string }) {
  const grow = useGrow(250);
  const { orders, add, advance } = useWorkOrders();
  const [status, setStatus] = useState<"All" | Status>("All");
  const [zone, setZone] = useState<"all" | ZoneId>("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"list" | "plan">("list");
  const [sel, setSel] = useState<string>(() => (ASSETS.some((a) => a.id === focus) ? (focus as string) : ASSETS[0].id));

  const list = useMemo(() => ASSETS.filter((a) => (status === "All" || a.status === status) && (zone === "all" || a.zone === zone) && (`${a.id} ${a.name} ${a.type}`.toLowerCase().includes(q.trim().toLowerCase()))), [status, zone, q]);
  const a = ASSETS.find((x) => x.id === sel) ?? ASSETS[0];
  const risk = ASSETS.filter((x) => x.status !== "OK");
  const saved = avoided(ASSETS);
  const expected = ASSETS.reduce((s, x) => s + x.prob30, 0);
  const has = orders.find((w) => w.asset === a.id && w.status !== "Done");

  const chart = useMemo(() => {
    const pts: { d: number; actual?: number; forecast?: number }[] = a.past.map((v, i) => ({ d: i - 30, actual: v }));
    pts[30].forecast = a.now;
    a.future.forEach((v, i) => pts.push({ d: i + 1, forecast: v }));
    return pts;
  }, [a]);
  const top = Math.max(a.limit * 1.12, ...a.future);

  const kpis: { icon: LucideIcon; label: string; v: number; d: number; s: string }[] = [
    { icon: Wrench, label: "Assets watched", v: ASSETS.length, d: 0, s: "" },
    { icon: TriangleAlert, label: "Need attention", v: risk.length, d: 0, s: ` (${ASSETS.filter((x) => x.status === "Alert").length} alerts)` },
    { icon: Clock, label: "Failures expected in 30 days", v: expected, d: 1, s: "" },
    { icon: CalendarClock, label: "Downtime avoided", v: saved.hours, d: 0, s: " h" },
    { icon: ShieldCheck, label: "Cost avoided", v: saved.egp / 1000, d: 0, s: " k EGP" },
  ];

  const spec = (): ReportSpec => ({
    file: "telal-west-predictive-maintenance",
    title: "Predictive maintenance report",
    subtitle: `Telal West AI City  |  ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    summary: [["Assets in this report", String(list.length)], ["Need attention", String(list.filter((x) => x.status !== "OK").length)], ["Alerts", String(list.filter((x) => x.status === "Alert").length)], ["Failures expected in 30 days", list.reduce((s, x) => s + x.prob30, 0).toFixed(1)]],
    note: `Showing: status ${status === "All" ? "all" : status}, zone ${zone === "all" ? "all" : zoneName(zone)}${q.trim() ? `, search "${q.trim()}"` : ""}. Sorted by failure risk.`,
    columns: ["ID", "Asset", "Zone", "Status", "Health", "Risk in 30 days", "Reaches limit in", "Watched sensor", "Recommended action"],
    rows: list.map((x) => [x.id, x.name, zoneName(x.zone), x.status, `${x.health}%`, `${Math.round(x.prob30 * 100)}%`, rulText(x), `${x.sensor} (${x.now} ${x.unit}, limit ${x.limit})`, x.action]),
    widths: [7, 20, 11, 8, 7, 9, 10, 20, 28],
    tone: (_r, c, text) => (c === 3 ? STATUS_TONE[text as Status] : undefined),
  });

  const raise = () => add({ title: `${a.action}, ${a.name}`, asset: a.id, priority: a.status === "Alert" ? "High" : "Medium", due: inDays(Math.max(1, Math.min(a.rul ?? 30, 14))), source: "AI forecast" });

  return (
    <div className="as-grid">
      <div className="ut-kpis five">
        {kpis.map((k, i) => (
          <div className="kpi" key={k.label} style={{ ["--n" as string]: i }}>
            <k.icon size={16} /><span>{k.label}</span><b><CountUp value={k.v} decimals={k.d} suffix={k.s} ms={700} /></b>
          </div>
        ))}
      </div>

      <Panel title="Predictive maintenance" className="as-list" i={0} aside={<ExportMenu onPdf={() => downloadPdf(spec())} onCsv={() => downloadCsv(spec())} />}>
        <div className="as-tools">
          <label className="search"><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assets" aria-label="Search assets" /></label>
          {STATUSES.map((s) => <button key={s} className={`chip ${status === s ? "on" : ""}`} aria-pressed={status === s} onClick={() => setStatus(s)}>{s}</button>)}
          <select value={zone} onChange={(e) => setZone(e.target.value as "all" | ZoneId)} aria-label="Zone">
            <option value="all">All zones</option>
            {ZONES.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          <span className="vsw"><button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>List</button><button className={view === "plan" ? "on" : ""} onClick={() => setView("plan")}>On the plan</button></span>
        </div>
        {view === "list" ? (
          <div className="as-table" role="table" aria-label="Assets by failure risk">
            <div className="as-row head" role="row"><span>Asset</span><span>Zone</span><span>Health</span><span>Limit in</span><span>Risk</span><span>Status</span></div>
            {list.map((x) => (
              <button key={x.id} role="row" className={`as-row ${x.id === a.id ? "on" : ""}`} onClick={() => setSel(x.id)}>
                <span className="nm"><b>{x.id}</b> {x.name}</span>
                <span>{zoneName(x.zone)}</span>
                <span className="hb"><em><u style={{ width: grow ? `${x.health}%` : 0, background: `var(--${STATUS_TONE[x.status]})` }} /></em>{x.health}</span>
                <span>{x.rul === null ? ">90 d" : `${x.rul} d`}</span>
                <span>{Math.round(x.prob30 * 100)}%</span>
                <span className={`pill ${STATUS_TONE[x.status]}`}>{x.status}</span>
              </button>
            ))}
            {!list.length && <p className="empty">No asset matches these filters.</p>}
          </div>
        ) : (
          <div className="map-wrap">
            <MasterMap muted grow={grow}>
              {list.map((x) => (
                <g key={x.id} className={`am ${STATUS_TONE[x.status]} ${x.id === a.id ? "on" : ""}`} transform={`translate(${x.at[0]} ${x.at[1]})`} tabIndex={0} role="button" aria-label={`${x.name}, ${x.status}`} onClick={() => setSel(x.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(x.id); } }}>
                  {x.status === "Alert" && <circle className="am-pulse" r="21" />}
                  <circle r="14" /><text y="4" textAnchor="middle">{x.id.slice(0, 2)}</text><title>{`${x.id} ${x.name}: ${x.status}`}</title>
                </g>
              ))}
            </MasterMap>
          </div>
        )}
      </Panel>

      <div className="side">
        <Panel title={`${a.id}  ${a.name}`} i={1} aside={<span className={`pill ${STATUS_TONE[a.status]}`}>{a.status}</span>}>
          <div className="as-facts">
            <div><b>{a.health}%</b><span>health</span></div>
            <div><b>{Math.round(a.prob30 * 100)}%</b><span>failure risk, 30 days</span></div>
            <div><b>{rulText(a)}</b><span>to reach the limit</span></div>
          </div>
          <div className="ut-chart" aria-label={`${a.sensor} over the last 30 days and the forecast`}>
            <ResponsiveContainer width="100%" height={170}>
              <ComposedChart data={chart} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--line-2)" vertical={false} />
                <XAxis dataKey="d" type="number" domain={[-30, 30]} ticks={[-30, -15, 0, 15, 30]} tickFormatter={(d) => (d === 0 ? "today" : d > 0 ? `+${d}d` : `${d}d`)} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis domain={[Math.min(a.base * 0.9, a.base), top]} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={38} unit="" />
                <Tooltip contentStyle={TIP} labelFormatter={(d) => (d === 0 ? "today" : d > 0 ? `in ${d} days` : `${-d} days ago`)} formatter={(v, n) => [`${v} ${a.unit}`, n]} />
                <ReferenceLine y={a.limit} stroke="var(--bad)" strokeDasharray="4 3" label={{ value: `limit ${a.limit}`, fill: "var(--bad)", fontSize: 10, position: "insideTopLeft" }} />
                <ReferenceLine x={0} stroke="var(--gold)" />
                <Line dataKey="actual" name={a.sensor} stroke="var(--green-2)" strokeWidth={2.4} dot={false} connectNulls={false} isAnimationActive={grow} />
                <Line dataKey="forecast" name="AI forecast" stroke="var(--gold)" strokeWidth={2.4} strokeDasharray="6 4" dot={false} isAnimationActive={grow} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="why"><b>Why the AI says so:</b> {a.sensor.toLowerCase()} is {a.now} {a.unit} (normal about {a.base}, limit {a.limit}) and rising{a.rul === null ? ", but the limit is more than 90 days away" : `; at this pace it reaches the limit around ${days(a.rul)}`}. Confidence {a.confidence}%.</p>
          <p className="why"><b>Recommended:</b> {a.action}.</p>
          {has ? <p className="ok">Work order {has.id} is {has.status.toLowerCase()}, due {has.due}.</p> : <button className="primary" onClick={raise}><ClipboardPlus size={15} /> Create work order</button>}
        </Panel>

        <Panel title="Work orders" i={2} aside={<span className="loc-tag">{orders.filter((w) => w.status !== "Done").length} open</span>}>
          <ul className="wos">
            {orders.map((w) => (
              <li key={w.id}>
                <div><b>{w.id}</b> <span className={`pill ${w.priority === "High" ? "bad" : w.priority === "Medium" ? "warn" : "good"}`}>{w.priority}</span><p>{w.title}</p><small>{w.source} · due {w.due}{w.asset ? ` · ${w.asset}` : ""}</small></div>
                <button className={`chip ${w.status === "Done" ? "on" : ""}`} onClick={() => advance(w.id)} title="Move to the next step">{w.status}</button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

