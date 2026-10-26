import { useMemo, useState } from "react";
import { Bar as RBar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, CheckCheck, Cog, Factory, FlaskConical, Layers, Zap } from "lucide-react";
import { ALERT_CATS, alertTrend, C, rangeLabel, type AlertCat, type Filters, type Kpi, type Severity, type Tone } from "./data";
import { LIVE_MS, useAlerts, useLiveKpis } from "./live";
import { axis, Card, Chip, downloadCsv, ExportButton, grid, KpiCard, Legend, SearchBox, Tip } from "./ui";

export const GROUPS = ["All", "Production", "Utilities", "Quality", "Equipment"] as const;
export type Group = (typeof GROUPS)[number];
const SUBS = ["All utilities", "Power", "Water"] as const;
const CAT_ICON = { All: Layers, Production: Factory, Utilities: Zap, Quality: FlaskConical, Equipment: Cog };
export const inGroup = (c: AlertCat, g: Group) => g === "All" || c === g || (g === "Utilities" && (c === "Power" || c === "Water"));
export const CAT_COLOR: Record<AlertCat, string> = { Production: C.molten, Power: C.ember, Water: C.blue, Quality: C.teal, Equipment: C.violet };
export const SEV_TONE: Record<Severity, Tone> = { Critical: "bad", Info: "info", OK: "good" };
const SEVS = ["All severities", "Critical", "Info", "OK"] as const;

interface Props { f: Filters; done: Set<string>; markDone: (ids: string[]) => void; initialGroup?: Group; initialSub?: (typeof SUBS)[number] }

export default function Alerts({ f, done, markDone, initialGroup = "All", initialSub = "All utilities" }: Props) {
  const all = useAlerts(f);
  const trend = useMemo(() => alertTrend(f), [f]);
  const [cat, setCat] = useState<Group>(initialGroup);
  const [sub, setSub] = useState<(typeof SUBS)[number]>(initialSub);
  const [sev, setSev] = useState<(typeof SEVS)[number]>("All severities");
  const [q, setQ] = useState("");

  const count = (g: Group) => all.filter((a) => inGroup(a.cat, g) && !done.has(a.id)).length;
  const rows = all.filter((a) => inGroup(a.cat, cat) && (cat !== "Utilities" || sub === "All utilities" || a.cat === sub)
    && (sev === "All severities" || a.sev === sev) && `${a.title} ${a.source} ${a.id}`.toLowerCase().includes(q.toLowerCase()));
  const open = rows.filter((a) => !done.has(a.id));
  const active = all.filter((a) => !done.has(a.id));
  const doneHere = all.filter((a) => done.has(a.id)).length;
  const byCat = ALERT_CATS.map((c) => ({ name: c, value: active.filter((a) => a.cat === c).length, color: CAT_COLOR[c] }));

  const critCount = active.filter((a) => a.sev === "Critical").length;
  const baseKpis = useMemo<Kpi[]>(() => [
    { label: "Active alerts", value: String(active.length), unit: "", delta: -4.2, good: "down", spark: trend.map((t) => t.critical + t.info + t.ok), color: C.molten, icon: "flag", note: "Not yet marked as done" },
    { label: "Critical", value: String(critCount), unit: "", delta: 8.1, good: "down", spark: trend.map((t) => t.critical), color: C.bad, icon: "flag", note: "Needs action now" },
    { label: "Marked as done", value: String(doneHere), unit: "", delta: 0, good: "up", spark: trend.map((t) => t.info), color: C.good, icon: "check", note: "This session" },
    { label: "Mean time to respond", value: "6.4", unit: "min", delta: -11.3, good: "down", spark: trend.map((t) => t.ok), color: C.teal, icon: "clock", note: "Target < 10 min" },
  ], [active.length, critCount, doneHere, trend]);
  const { kpis } = useLiveKpis(baseKpis);

  const exportCsv = () => downloadCsv(`alerts-${cat}${cat === "Utilities" && sub !== "All utilities" ? "-" + sub : ""}`.toLowerCase(), [
    { title: `Alerts - ${cat}${cat === "Utilities" ? ` / ${sub}` : ""} - ${f.area}`, rows: rows.map((a) => ({ id: a.id, severity: a.sev, category: a.cat, description: a.title, source: a.source, reading: a.value, raised: a.time, status: done.has(a.id) ? "Done" : "Open" })) },
    { title: `Alerts over time - ${rangeLabel(f.range)}`, rows: trend.map((t) => ({ period: t.t, critical: t.critical, info: t.info, ok: t.ok })) },
  ]);

  return (
    <>
      <div className="grid g-kpi">{kpis.map((k, i) => <KpiCard key={k.label} k={k} i={i} />)}</div>

      <div className="grid g-21">
        <Card title="Alerts over time" sub={`Raised per ${f.range === "24H" ? "hour" : f.range === "YTD" ? "month" : "day"} · ${rangeLabel(f.range)}`}
          right={<Legend items={[{ name: "Critical", color: C.bad }, { name: "Info", color: C.blue }, { name: "OK", color: C.good }]} />}>
          <div className="chart-h">
            <ResponsiveContainer>
              <BarChart data={trend} margin={{ left: -16, right: 6, top: 8 }}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...axis} width={40} allowDecimals={false} />
                <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <RBar dataKey="critical" stackId="a" fill={C.bad} />
                <RBar dataKey="info" stackId="a" fill={C.blue} />
                <RBar dataKey="ok" name="OK" stackId="a" fill={C.good} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Open by category" sub="Power and Water are the Utilities group">
          <div className="chart-h">
            <ResponsiveContainer>
              <BarChart data={byCat} layout="vertical" margin={{ left: 10, right: 12 }}>
                <CartesianGrid {...grid} horizontal={false} vertical />
                <XAxis type="number" {...axis} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axis} width={80} />
                <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <RBar dataKey="value" radius={[0, 6, 6, 0]}>{byCat.map((c) => <Cell key={c.name} fill={c.color} />)}</RBar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Alert register" sub="Every alert in one place · mark each as done when handled"
        right={<div className="table-tools">
          <select className="select" value={sev} onChange={(e) => setSev(e.target.value as (typeof SEVS)[number])} aria-label="Severity">{SEVS.map((s) => <option key={s}>{s}</option>)}</select>
          <SearchBox value={q} onChange={setQ} placeholder="Search alerts" />
          <button className="btn" disabled={!open.length} onClick={() => markDone(open.map((a) => a.id))}><CheckCheck size={14} />Mark all as done</button>
          <ExportButton onClick={exportCsv} />
        </div>}>
        <div className="seg" style={{ marginBottom: 14, display: "flex", overflowX: "auto" }}>
          {GROUPS.map((c) => {
            const I = CAT_ICON[c];
            return (
              <button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <I size={14} />{c}<span style={{ fontFamily: "var(--mono)", opacity: 0.75 }}>{count(c)}</span>
              </button>
            );
          })}
        </div>
        {cat === "Utilities" && (
          <div className="seg" style={{ marginBottom: 14, width: "fit-content" }}>
            {SUBS.map((s) => <button key={s} className={sub === s ? "on" : ""} onClick={() => setSub(s)}>{s}</button>)}
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Alert</th><th>Severity</th><th>Category</th><th>Description</th><th>Source</th><th>Reading</th><th>Raised</th><th></th></tr></thead>
            <tbody>
              {rows.map((a) => {
                const isDone = done.has(a.id);
                return (
                  <tr key={a.id} className={a.born && Date.now() - a.born < LIVE_MS ? "row-new" : undefined} style={{ opacity: isDone ? 0.45 : 1 }}>
                    <td className="mono">{a.id}</td>
                    <td><Chip tone={SEV_TONE[a.sev]}>{a.sev}</Chip></td>
                    <td><span style={{ color: CAT_COLOR[a.cat] }}>● </span>{a.cat}</td>
                    <td style={{ whiteSpace: "normal", minWidth: 240, textDecoration: isDone ? "line-through" : "none" }}>{a.title}</td>
                    <td>{a.source}</td><td className="mono">{a.value}</td><td className="mono">{a.time}</td>
                    <td>
                      <button className="btn sm" style={isDone ? { color: "var(--good)" } : undefined} disabled={isDone} onClick={() => markDone([a.id])}>
                        <Check size={13} />{isDone ? "Done" : "Mark as done"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={8} className="empty">No alerts match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
