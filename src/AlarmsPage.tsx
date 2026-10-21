import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Search, Undo2 } from "lucide-react";
import { ago, ALARM_TYPES, atOf, fmtWhen, type AlarmSev, type AlarmType } from "./alarmLog";
import { activeAlarms, useAlarmLog } from "./AlarmsContext";
import { Chip, CountUp, rise } from "./ui";
import { LivePill } from "./live";
import type { Go } from "./App";

const SEV_TONE = { Critical: "bad", Warning: "warn", Info: "info" } as const;
const SEV_ORDER: Record<AlarmSev, number> = { Critical: 0, Warning: 1, Info: 2 };
const STATUS = ["Active", "Done", "All"] as const;
type Status = (typeof STATUS)[number];

/** every alarm in one place: what happened, where, when, what type, and whether it is done */
export default function AlarmsPage({ go, focus }: { go: Go; focus?: string }) {
  const { log, done, markDone, undo } = useAlarmLog();
  const [status, setStatus] = useState<Status>(focus && done[focus] ? "All" : "Active");
  const [sev, setSev] = useState<"All" | AlarmSev>("All");
  const [type, setType] = useState<"All" | AlarmType>("All");
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState<string | null>(focus ?? null);

  // coming from the bell: scroll to that alarm and highlight it for a moment
  useEffect(() => {
    if (!focus) return;
    const id = window.setTimeout(() => document.getElementById(`alarm-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 500);
    const off = window.setTimeout(() => setFlash(null), 3200);
    return () => { window.clearTimeout(id); window.clearTimeout(off); };
  }, [focus]);

  const active = activeAlarms(log, done);
  const critical = active.filter((a) => a.sev === "Critical").length;
  const doneToday = log.filter((a) => done[a.id] && Date.now() - done[a.id].at < 24 * 3600 * 1000).length;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return log
      .filter((a) => (status === "All" || (status === "Done") === !!done[a.id]) && (sev === "All" || a.sev === sev) && (type === "All" || a.type === type)
        && (!needle || `${a.text} ${a.detail} ${a.where} ${a.stage} ${a.wo ?? ""}`.toLowerCase().includes(needle)))
      .sort((a, b) => (done[a.id] ? 1 : 0) - (done[b.id] ? 1 : 0) || SEV_ORDER[a.sev] - SEV_ORDER[b.sev] || atOf(b) - atOf(a));
  }, [log, done, status, sev, type, q]);

  const cards = [
    { label: "Active alarms", value: active.length, note: "waiting for action", tone: active.length ? "warn" : "good" },
    { label: "Critical", value: critical, note: "need attention now", tone: critical ? "bad" : "good" },
    { label: "Done in the last 24 h", value: doneToday, note: "marked as done", tone: "good" },
    { label: "Total this week", value: log.length, note: "all alarms listed", tone: "info" },
  ] as const;

  return (
    <>
      <div className="page-head">
        <div><h1>Alarms</h1><p>Everything that went wrong or needs a look, with when and where. Mark an alarm as done when it is handled.</p></div>
        <div className="filters"><LivePill /></div>
      </div>

      <div className="grid al-cards">
        {cards.map((c, i) => (
          <motion.div key={c.label} className={`mini-kpi tone-${c.tone}`} {...rise(i)}>
            <span>{c.label}</span>
            <b><CountUp value={c.value} /></b>
            <em>{c.note}</em>
          </motion.div>
        ))}
      </div>

      <motion.section className="card al-card" {...rise(2)}>
        <div className="al-filters">
          <div className="seg" role="tablist" aria-label="Alarm status">
            {STATUS.map((s) => <button key={s} role="tab" aria-selected={status === s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>{s}{s === "Active" ? ` ${active.length}` : ""}</button>)}
          </div>
          <div className="chips">
            {(["All", "Critical", "Warning", "Info"] as const).map((x) => <button key={x} className={`fchip ${sev === x ? "on" : ""}`} onClick={() => setSev(x)}>{x}</button>)}
          </div>
          <label className="select"><span className="sr">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as "All" | AlarmType)}>
              <option value="All">All types</option>
              {ALARM_TYPES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="search"><Search size={14} /><span className="sr">Search alarms</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search alarms" /></label>
        </div>

        <div className="al-table" role="table" aria-label="Alarms">
          <div className="al-row al-head" role="row">
            <span>Severity</span><span>What happened</span><span>Where</span><span>When</span><span>Type</span><span>Status</span>
          </div>
          <AnimatePresence initial={false}>
            {rows.map((a) => {
              const d = done[a.id];
              const at = atOf(a);
              return (
                <motion.article key={a.id} id={`alarm-${a.id}`} layout role="row" className={`al-row sev-${a.sev} ${d ? "is-done" : ""} ${flash === a.id ? "flash" : ""}`}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}>
                  <div className="al-sev"><Chip tone={SEV_TONE[a.sev]}>{a.sev}</Chip></div>
                  <div className="al-desc">
                    <b>{a.text}</b>
                    <p>{a.detail}</p>
                    {a.wo && <button className="wo-link" onClick={() => go("maintenance")}>{a.wo}</button>}
                  </div>
                  <div className="al-where"><b>{a.where}</b><span>{a.stage}</span></div>
                  <div className="al-when"><b>{fmtWhen(at)}</b><span>{ago(at)}</span></div>
                  <div className="al-type"><Chip tone="mute">{a.type}</Chip></div>
                  <div className="al-act">
                    {d ? (
                      <>
                        <span className="al-by"><Check size={13} /> Done by {d.by}<small>{fmtWhen(d.at)}</small></span>
                        <button className="btn" onClick={() => undo(a.id)}><Undo2 size={13} /> Undo</button>
                      </>
                    ) : (
                      <button className="btn on" onClick={() => markDone(a.id)}><Check size={13} /> Mark as done</button>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
          {!rows.length && <div className="al-empty">No alarms match these filters.</div>}
        </div>
      </motion.section>
    </>
  );
}
