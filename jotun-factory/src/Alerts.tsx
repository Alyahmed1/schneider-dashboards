import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, CheckCircle2, Info, Undo2 } from "lucide-react";
import { CATS, CAT_COLOR, SEVS, SEV_TONE, type Alert, type Cat, type Filters, type Sev, type Tone } from "./data";
import { Card, Chip, Detail, downloadCsv, ExportButton, Segmented, SearchBox, Select, useLast, type ModalTone } from "./ui";
import { useAlerts } from "./live";
import type { Go, TabId } from "./nav";

export type AlertStatus = "open" | "done";
export type AlertStatusMap = Record<string, AlertStatus>;

export const TONE_ICON: Record<Tone, { I: typeof Info; c: string }> = {
  bad: { I: AlertTriangle, c: "var(--bad)" }, warn: { I: AlertTriangle, c: "var(--warn)" },
  info: { I: Info, c: "var(--blue)" }, good: { I: CheckCircle2, c: "var(--good)" }, mute: { I: Info, c: "var(--muted)" },
};
export const SEV_ORDER: Record<Sev, number> = { Critical: 0, Warning: 1, Info: 2 };

const SEV_FILTERS = ["All", ...SEVS] as const;
type SevFilter = (typeof SEV_FILTERS)[number];
const ALL_CATS = ["All categories", ...CATS] as const;
const SHOWS = ["Open", "Done", "All"] as const;
type Show = (typeof SHOWS)[number];

const GO_PAGE: Partial<Record<Cat, TabId>> = { Production: "process", Quality: "quality", Equipment: "maintenance", Utilities: "utilities", Logistics: "logistics" };
const PAGE_LABEL: Record<TabId, string> = { overview: "overview", process: "production process", quality: "batches & quality", equipment: "equipment", maintenance: "maintenance", utilities: "utilities", logistics: "logistics", alerts: "alerts" };

/** Pop-up with the full alert and its actions. Used on the Alerts page and the Overview. */
export function AlertDetail({ alert, isDone, onClose, setStatus, go }:
  { alert: Alert | null; isDone: boolean; onClose: () => void; setStatus: (ids: string[], s: AlertStatus) => void; go: Go }) {
  const a = useLast(alert);
  if (!a) return null;
  const tone: ModalTone = a.sev === "Critical" ? "navy" : a.sev === "Warning" ? "orange" : "yellow";
  const page = GO_PAGE[a.cat as Cat];
  return (
    <Detail open={!!alert} onClose={onClose} tone={tone} eyebrow={`${a.id} · ${a.cat}`} title={a.title} big={a.sev} bigNote={a.time}
      rows={[["Source", a.source], ["Category", a.cat], ["Raised", a.time], ["Status", isDone ? "Done" : "Open"]]}
      actions={
        <>
          {isDone
            ? <button className="mbtn" onClick={() => { setStatus([a.id], "open"); onClose(); }}>Reopen alert</button>
            : <button className="mbtn" onClick={() => { setStatus([a.id], "done"); onClose(); }}>Mark done</button>}
          {page && <button className="mbtn ghost" onClick={() => { onClose(); go(page); }}>Open {PAGE_LABEL[page]}</button>}
        </>
      } />
  );
}

export default function Alerts({ f, status, setStatus, go, initialSev }:
  { f: Filters; status: AlertStatusMap; setStatus: (ids: string[], s: AlertStatus) => void; go: Go; initialSev?: string }) {
  const all = useAlerts(f);
  const [sel, setSel] = useState<Alert | null>(null);
  const [sev, setSev] = useState<SevFilter>((SEV_FILTERS as readonly string[]).includes(initialSev ?? "") ? (initialSev as SevFilter) : "All");
  const [cat, setCat] = useState<(typeof ALL_CATS)[number]>("All categories");
  const [q, setQ] = useState("");
  const [show, setShow] = useState<Show>("Open");

  const isDone = (id: string) => status[id] === "done";
  const open = useMemo(() => all.filter((a) => !isDone(a.id)), [all, status]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => all
    .filter((a) => (show === "All" || (show === "Done") === isDone(a.id)) && (sev === "All" || a.sev === sev) && (cat === "All categories" || a.cat === cat)
      && (!q || `${a.title} ${a.source} ${a.id}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev]), [all, status, sev, cat, q, show]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = (s: Sev) => open.filter((a) => a.sev === s).length;
  const exportCsv = () => downloadCsv("jotun-alerts", [{ title: "Alerts", rows: rows.map((a) => ({ ID: a.id, Severity: a.sev, Category: a.cat, Alert: a.title, Source: a.source, Raised: a.time, Status: isDone(a.id) ? "Done" : "Open" })) }]);

  return (
    <>
      <motion.div className="banner tall" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <img src="/stages/control-room.jpg" alt="Plant control room" />
        <div className="banner-live"><i />Control room · live feed</div>
        <div className="banner-in">
          <div><b>Control room</b><span>{open.length} open alerts across {f.line.toLowerCase()}</span></div>
          <div className="banner-chips">
            <div className="hero-stat"><b style={{ color: "var(--bad)" }}>{count("Critical")}</b><span>critical</span></div>
            <div className="hero-stat"><b style={{ color: "var(--warn)" }}>{count("Warning")}</b><span>warning</span></div>
            <div className="hero-stat"><b style={{ color: "var(--blue)" }}>{count("Info")}</b><span>info</span></div>
          </div>
        </div>
      </motion.div>

      <Card title="Alert log" sub={`${rows.length} shown`} i={1}
        right={
          <div className="table-tools">
            <Segmented value={sev} options={SEV_FILTERS} onChange={setSev} label="Severity" />
            <Select value={cat} options={ALL_CATS} onChange={setCat} label="Category" />
            <SearchBox value={q} onChange={setQ} placeholder="Search alerts…" />
            <Segmented value={show} options={SHOWS} onChange={setShow} label="Status" />
            <ExportButton onClick={exportCsv} />
          </div>
        }>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Severity</th><th>Category</th><th>Alert</th><th>Source</th><th>Raised</th><th /></tr></thead>
            <tbody>
              {rows.map((a) => (
                <motion.tr layout key={a.id} className={`clickable ${a.time === "just now" ? "row-new" : ""}`} style={{ opacity: isDone(a.id) ? 0.55 : 1 }}
                  tabIndex={0} onClick={() => setSel(a)} onKeyDown={(e) => { if (e.key === "Enter") setSel(a); }}>
                  <td className="mono">{a.id}</td>
                  <td><Chip tone={SEV_TONE[a.sev]}>{a.sev}</Chip></td>
                  <td><i style={{ color: CAT_COLOR[a.cat as Cat], fontStyle: "normal" }}>●</i> {a.cat}</td>
                  <td className="strong">{a.title}</td>
                  <td className="mono">{a.source}</td>
                  <td className="mono">{a.time}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {isDone(a.id)
                      ? <button className="tick-btn undo" title="Undo: reopen this alert" aria-label={`Reopen ${a.id}`} onClick={() => setStatus([a.id], "open")}><Undo2 size={14} /></button>
                      : <button className="tick-btn" title="Mark as done" aria-label={`Mark ${a.id} as done`} onClick={() => setStatus([a.id], "done")}><Check size={14} /></button>}
                  </td>
                </motion.tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="empty">{show === "Done" ? "Nothing marked done yet." : "No alerts match these filters."}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <AlertDetail alert={sel} isDone={sel ? isDone(sel.id) : false} onClose={() => setSel(null)} setStatus={setStatus} go={go} />
    </>
  );
}
