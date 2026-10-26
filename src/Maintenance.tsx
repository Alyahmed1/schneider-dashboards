import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Eye, FileText, X } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PLANT, rng, type Filters } from "./data";
import { assetsIn, woInArea, type Asset, type WorkOrder } from "./cmms";
import { Bars, Panel } from "./charts";
import { C, CountUp, Tip } from "./ui";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import ExportMenu from "./ExportMenu";
import { downloadCsv, downloadPdf, type ReportSpec } from "./exportReport";

type AssetStatus = "Running" | "Idle" | "Under maintenance";
/** which asset a work order is about, and the few assets that are not simply running (sample data) */
const WO_OF: Record<string, string> = { "WO-2417": "Diffusers · Lane B", "WO-2421": "Grit classifier 2", "WO-2409": "Blower B-401C", "WO-2412": "Polymer dosing pump 2", "WO-2399": "Influent pump 2", "WO-2388": "Reuse pump 1" };
const STATUS: Record<string, AssetStatus> = { "Grit classifier 2": "Under maintenance", "Polymer dosing pump 2": "Idle", "Reuse pump 1": "Idle" };
const PILL = { Running: "run", Idle: "idle", "Under maintenance": "under" } as const;
const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const woText = (w?: WorkOrder) => (!w ? "" : w.status === "Done" ? "Closed" : w.late ? "Delayed" : w.status);
const woClass = (s: string) => (s === "Closed" ? "closed" : s === "Delayed" ? "late" : s === "In progress" ? "idle" : "open");

const STATUS_TONE: Record<string, "teal" | "ink" | "warn" | "bad" | "mute"> = { Running: "teal", Open: "teal", Idle: "ink", "In progress": "ink", "Under maintenance": "warn", Delayed: "bad", Closed: "mute" };

interface Row { a: Asset; status: AssetStatus; wo?: WorkOrder }
/** the work-order boxes filter the table too; then it lists work orders instead of assets, so the numbers match */
type WoFilter = "All" | WorkOrder["status"];
const WO_NAME: Record<WoFilter, string> = { All: "all", Open: "open", "In progress": "in-progress", Done: "closed" };

/** a ring with its number in the middle and a small arrow for the trend */
function Ring({ frac, label, up, good = true, grow }: { frac: number; label: string; up: boolean; good?: boolean; grow: boolean }) {
  const C2 = 2 * Math.PI * 40;
  const Arrow = up ? ArrowUp : ArrowDown;
  return (
    <div className="mx-ring">
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle className="bg" cx="50" cy="50" r="40" />
        <circle className="fg" cx="50" cy="50" r="40" strokeDasharray={`${grow ? C2 * Math.max(0.03, Math.min(1, frac)) : 0} ${C2}`} transform="rotate(-90 50 50)" />
      </svg>
      <div><b>{label}</b><Arrow size={12} className={good ? "up" : "down"} /></div>
    </div>
  );
}

function Stat({ label, value, i }: { label: string; value: number; i: number }) {
  return (
    <section className="hm-p mx-stat" style={{ ["--i" as string]: i }}>
      <span>{label}</span>
      <b><CountUp value={value} decimals={0} /></b>
    </section>
  );
}

/** Maintenance: the plant's upkeep on one screen: work, compliance, repair times, downtime, spare parts, cost and every asset */
export default function Maintenance({ f, wos }: { f: Filters; wos: WorkOrder[] }) {
  const t = useTick();
  const grow = useGrow();
  const [sel, setSel] = useState<Row | null>(null);
  const [filter, setFilter] = useState<AssetStatus | null>(null);
  const [woFilter, setWoFilter] = useState<WoFilter | null>(null);
  const [selWo, setSelWo] = useState<WorkOrder | null>(null);
  const settled = useGrow(2300); // the first entrance is slower; later changes are quick

  const list = useMemo(() => wos.filter((w) => woInArea(w, f)), [wos, f]);
  const open = list.filter((w) => w.status === "Open").length;
  const prog = list.filter((w) => w.status === "In progress").length;
  const done = list.filter((w) => w.status === "Done").length;

  const rows: Row[] = useMemo(() => assetsIn(f).map((a) => {
    const wo = list.filter((w) => WO_OF[w.id] === a.name).sort((x, y) => Number(x.status === "Done") - Number(y.status === "Done"))[0];
    return { a, status: STATUS[a.name] ?? "Running", wo };
  }), [f, list]);
  const woShown = useMemo(() => (woFilter ? list.filter((w) => woFilter === "All" || w.status === woFilter) : []), [list, woFilter]);
  const pickAsset = (st: AssetStatus) => { setWoFilter(null); setFilter((cur) => (cur === st ? null : st)); };
  const pickWo = (st: WoFilter) => { setFilter(null); setWoFilter((cur) => (cur === st ? null : st)); };
  const clearAll = () => { setFilter(null); setWoFilter(null); };
  const rowMotion = (n: number) => ({
    layout: "position" as const,
    initial: { opacity: 0, x: -18 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 18, transition: { duration: 0.18 } },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: settled ? n * 0.04 : 0.75 + n * 0.08 },
  });
  const shown = useMemo(() => (filter ? rows.filter((r) => r.status === filter) : rows), [rows, filter]);
  const running = rows.filter((r) => r.status === "Running").length;
  const idle = rows.filter((r) => r.status === "Idle").length;
  const under = rows.filter((r) => r.status === "Under maintenance").length;

  // sample figures for the charts; they stay the same between visits
  const sample = useMemo(() => {
    const r = rng(777);
    return {
      pm: MONTHS.map((m, i) => ({ t: m, v: +(90 + i * 0.5 + (r() - 0.5) * 4).toFixed(1) })),
      comp: [98, 97, 94, 96],
      cost: [6.0, 5.9, 6.1, 5.8],
    };
  }, []);
  const compliance = sample.comp.reduce((s, v) => s + v, 0) / sample.comp.length;
  const mttr = wobble(3.4, 91, t, 0.01);
  const mtbf = wobble(412, 92, t, 0.004);
  const stock = wobble(87.4, 93, t, 0.003);
  const used = wobble(41, 94, t, 0.006);

  const chips: { label: string; value: number; big?: boolean; status?: AssetStatus; wo?: WoFilter; all?: boolean }[] = [
    { label: "Total", value: rows.length, big: true, all: true },
    { label: "Running", value: running, status: "Running" },
    { label: "Idle", value: idle, status: "Idle" },
    { label: "Under maintenance", value: under, status: "Under maintenance" },
    { label: "Total work orders", value: list.length, wo: "All" },
    { label: "Open", value: open, wo: "Open" },
    { label: "In progress", value: prog, wo: "In progress" },
    { label: "Closed", value: done, wo: "Done" },
  ];

  /** what the table shows right now, as a report: the same filter, the same rows */
  const buildReport = (): ReportSpec => {
    const when = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    const base = { subtitle: `${PLANT.name}  |  generated ${when}  |  sample data`, summary: chips.map((c): [string, string] => [c.label, String(c.value)]) };
    if (woFilter) {
      return {
        ...base, file: "work-orders", title: "Equipment info: work orders",
        note: `Showing ${WO_NAME[woFilter]} work orders: ${woShown.length} of ${list.length}`,
        columns: ["Work order", "Title", "Asset", "Status", "Due", "Priority", "Crew", "Planned hours"],
        rows: woShown.map((w) => [w.id, w.title, w.asset, woText(w), w.due, w.prio, w.crew, String(w.hours)]),
        widths: [1.1, 3, 1.6, 1.3, 1.1, 1, 1.6, 1.1],
        tone: (_r, c, t) => (c === 3 ? STATUS_TONE[t] : undefined),
      };
    }
    return {
      ...base, file: "equipment-info", title: "Equipment info",
      note: filter ? `Showing ${filter.toLowerCase()} assets: ${shown.length} of ${rows.length}` : `All ${rows.length} assets`,
      columns: ["Asset", "Status", "Recent inspection", "Upcoming maintenance", "Work order", "Priority"],
      rows: shown.map((r) => [r.a.name, r.status, r.a.lastService, r.a.nextPm, woText(r.wo) || "-", r.wo && r.wo.status !== "Done" ? r.wo.prio : "-"]),
      widths: [2.4, 1.6, 1.4, 1.6, 1.4, 1],
      tone: (_r, c, t) => (c === 1 || c === 4 ? STATUS_TONE[t] : undefined),
    };
  };

  return (
    <div className="mx">
      <div className="mx-col">
        <div className="mx-stats">
          <Stat label="Maintenance activity" value={list.length} i={0} />
          <Stat label="Open work orders" value={open + prog} i={1} />
          <Stat label="Pending requests" value={open} i={2} />
          <Stat label="Completed tasks" value={done} i={3} />
        </div>
        <Panel title="Compliance with regulatory standards" className="mx-grow" i={4}>
          <div className="mx-row">
            <Ring frac={compliance / 100} label={`${Math.round(compliance)}%`} up grow={grow} />
            <Bars labels={["6 am", "12 pm", "6 pm", "12 am"]} values={sample.comp} unit="%" max={100} grow={grow} />
          </div>
        </Panel>
        <div className="mx-pair">
          <Panel title="MTTR" i={5}><div className="mx-center"><Ring frac={mttr / 6} label={`${mttr.toFixed(1)} h`} up={false} grow={grow} /></div></Panel>
          <Panel title="MTBF" i={6}><div className="mx-center"><Ring frac={mtbf / 600} label={`${Math.round(mtbf)} h`} up grow={grow} /></div></Panel>
        </div>
        <Panel title="Downtime" className="mx-grow2" i={7}>
          <div className="mx-down">
            <div className="mx-center"><Ring frac={0.65} label="65%" up={false} good={false} grow={grow} /><small>planned share</small></div>
            <div><small>Top 5 by hours</small><Bars labels={["Blw", "Dos", "Dif", "Grt", "Inf"]} values={[14, 11, 9, 6, 4]} unit="h" compact grow={grow} /></div>
            <div><small>Top 5 by stops</small><Bars labels={["Blw", "Dos", "Dif", "Grt", "Inf"]} values={[6, 5, 4, 3, 2]} unit="" compact grow={grow} /></div>
          </div>
        </Panel>
      </div>

      <div className="mx-col">
        <Panel title="Spare parts inventory" i={8}>
          <div className="mx-two">
            <div className="mx-box"><span>Stock availability</span><b><CountUp value={stock} decimals={0} /> %<ArrowUp size={14} className="up" /></b></div>
            <div className="mx-box"><span>Consumed this month</span><b><CountUp value={used} decimals={0} /> %<ArrowDown size={14} className="up" /></b></div>
          </div>
        </Panel>
        <Panel title="Operating cost of treatment" className="mx-grow" i={9}><Bars labels={["Q1", "Q2", "Q3", "Q4"]} values={sample.cost} unit="LE/m³" max={8} grow={grow} /></Panel>
        <Panel title="Preventive maintenance done on time (%)" className="mx-grow" i={10}>
          <div className="mx-line">
            <ResponsiveContainer>
              <LineChart data={sample.pm} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="t" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} width={38} domain={[80, 100]} tickCount={3} />
                <Tooltip content={<Tip unit="%" />} cursor={{ stroke: C.teal, strokeOpacity: 0.3 }} />
                <Line type="monotone" dataKey="v" name="On time" stroke="var(--teal)" strokeWidth={1.8} dot={false} isAnimationActive animationDuration={1100} animationBegin={400} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Equipment info" className="mx-eq" i={11} right={<ExportMenu onPdf={() => downloadPdf(buildReport())} onCsv={() => downloadCsv(buildReport())} />}>
        <div className="mx-chips">
          {chips.map((c, n) => {
            const inner = <><span>{c.label}</span><b><CountUp value={c.value} decimals={0} /></b></>;
            const style = { ["--n" as string]: n };
            if (c.all) return <button key={c.label} className={`mx-chip big ${filter === null && woFilter === null ? "" : "dim"}`} style={style} onClick={clearAll} aria-label="Show all assets" title="Show all assets">{inner}</button>;
            if (c.status) {
              const on = filter === c.status;
              return <button key={c.label} className={`mx-chip pick ${on ? "on" : ""}`} style={style} aria-pressed={on} onClick={() => pickAsset(c.status!)} aria-label={on ? "Show all assets" : `Show only ${c.label.toLowerCase()} assets`} title={on ? "Click again to show all" : `Show only ${c.label.toLowerCase()}`}>{inner}</button>;
            }
            if (c.wo) {
              const on = woFilter === c.wo;
              return <button key={c.label} className={`mx-chip pick ${on ? "on" : ""}`} style={style} aria-pressed={on} onClick={() => pickWo(c.wo!)} aria-label={on ? "Back to the asset list" : `List ${WO_NAME[c.wo]} work orders`} title={on ? "Click again to go back to assets" : `List ${WO_NAME[c.wo]} work orders`}>{inner}</button>;
            }
            return <div key={c.label} className="mx-chip" style={style}>{inner}</div>;
          })}
        </div>
        <p className="mx-filter" aria-live="polite">
          {woFilter ? <>Showing <b>{WO_NAME[woFilter]}</b> work orders: {woShown.length} of {list.length}. <button onClick={clearAll}>Back to assets</button></>
            : filter ? <>Showing <b>{filter.toLowerCase()}</b> assets: {shown.length} of {rows.length}. <button onClick={clearAll}>Show all</button></>
            : <>All {rows.length} assets. Click a status box to filter the table.</>}
        </p>
        <div className="mx-table-wrap">
          <table className={`mx-table ${filter || woFilter ? "filtered" : ""}`}>
            <thead>
              {woFilter
                ? <tr><th>Work order</th><th>Title</th><th>Asset</th><th>Status</th><th>Due</th><th>Priority</th><th>Actions</th></tr>
                : <tr><th>Asset</th><th>Status</th><th>Recent inspection</th><th>Upcoming maintenance</th><th>Work order</th><th>Priority</th><th>Actions</th></tr>}
            </thead>
            <tbody key={woFilter ? "wo" : "asset"}>
              <AnimatePresence initial>
                {woFilter ? woShown.map((w, n) => {
                  const wt = woText(w);
                  return (
                    <motion.tr key={w.id} style={{ ["--n" as string]: n }} {...rowMotion(n)}>
                      <td className="id">{w.id}</td>
                      <td className="title">{w.title}</td>
                      <td>{w.asset}</td>
                      <td><span className={`mx-pill ${woClass(wt)}`}>{wt}</span></td>
                      <td className={w.late ? "over" : ""}>{w.due}</td>
                      <td>{w.prio}</td>
                      <td><span className="mx-act"><button onClick={() => setSelWo(w)} aria-label={`${w.id}: details`} title="Details"><Eye size={16} /></button></span></td>
                    </motion.tr>
                  );
                }) : shown.map((r, n) => {
                  const wt = woText(r.wo);
                  return (
                    <motion.tr key={r.a.name} style={{ ["--n" as string]: n }} {...rowMotion(n)}>
                      <td className="id">{r.a.name}</td>
                      <td><span className={`mx-pill ${PILL[r.status]}`}>{r.status}</span></td>
                      <td>{r.a.lastService}</td>
                      <td className={r.a.nextPm === "Overdue" ? "over" : ""}>{r.a.nextPm}</td>
                      <td>{wt ? <span className={`mx-pill ${woClass(wt)}`}>{wt}</span> : "—"}</td>
                      <td>{r.wo && r.wo.status !== "Done" ? r.wo.prio : "—"}</td>
                      <td>
                        <span className="mx-act">
                          <button onClick={() => setSel(r)} aria-label={`${r.a.name}: details`} title="Details"><Eye size={16} /></button>
                          {r.wo && <button onClick={() => setSel(r)} aria-label={`${r.a.name}: work order ${r.wo.id}`} title={r.wo.id}><FileText size={16} /></button>}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {(woFilter ? woShown : shown).length === 0 && <tr><td colSpan={7} className="empty">Nothing in this state.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <AnimatePresence>
        {sel && (
          <motion.div className="pop-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={() => setSel(null)}>
            <motion.div className="pop" role="dialog" aria-modal="true" aria-label="Asset details" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} onClick={(e) => e.stopPropagation()}>
              <button className="pop-x" onClick={() => setSel(null)} aria-label="Close"><X size={16} /> Close</button>
              <div className="pop-head"><div><h3>{sel.a.name}</h3><p>{sel.a.area} · criticality {sel.a.crit}</p></div><span className={`mx-pill ${PILL[sel.status]}`}>{sel.status}</span></div>
              <div className="pop-rows three">
                <div><span>Health</span><b>{sel.a.health}<em> %</em></b></div>
                <div><span>Remaining life</span><b>{sel.a.rul}<em> days</em></b></div>
                <div><span>Next maintenance</span><b className="small">{sel.a.nextPm}</b></div>
              </div>
              <p className="pop-note">{sel.wo ? `${sel.wo.id}: ${sel.wo.title}. ${sel.wo.note}` : "No work order is open for this asset."} Last inspection {sel.a.lastService}. All figures are sample data.</p>
            </motion.div>
          </motion.div>
        )}
        {selWo && (
          <motion.div className="pop-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={() => setSelWo(null)}>
            <motion.div className="pop" role="dialog" aria-modal="true" aria-label="Work order details" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} onClick={(e) => e.stopPropagation()}>
              <button className="pop-x" onClick={() => setSelWo(null)} aria-label="Close"><X size={16} /> Close</button>
              <div className="pop-head"><div><h3>{selWo.id}</h3><p>{selWo.title}</p></div><span className={`mx-pill ${woClass(woText(selWo))}`}>{woText(selWo)}</span></div>
              <div className="pop-rows three">
                <div><span>Due</span><b className="small">{selWo.due}</b></div>
                <div><span>Crew</span><b className="small">{selWo.crew}</b></div>
                <div><span>Planned hours</span><b>{selWo.hours}<em> h</em></b></div>
              </div>
              <p className="pop-note">{selWo.asset} · {selWo.type.toLowerCase()} work, {selWo.prio.toLowerCase()} priority. {selWo.note}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
