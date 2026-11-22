import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CalendarClock, Download, FileSpreadsheet, FileText, Lock, MapPinned, Printer, Scale, Send, TriangleAlert, Users } from "lucide-react";
import { BUDGET_USED, EXEC_KPIS, EXEC_TREND, INSIGHTS, MINISTRIES, MINISTRY_SCORE, NATIONAL_KPIS, OUTCOMES, OUTCOME_SCORE, STATUS_LABEL, ROLES, type Role } from "./data";
import { WATER_HANDLED } from "./ministryData";
import { GOV, fmtGrid, useLive, waiting } from "./live";
import { STATIONS, TYPE_INFO } from "./stations";
import { Panel } from "./parts";
import "./pages.css";

type RepId = "daily" | "weekly" | "monthly" | "balance" | "alerts" | "stations";
interface Rep { id: RepId; title: string; blurb: string; period: string; icon: typeof FileText; who: Role[]; csv?: boolean }
const REPS: Rep[] = [
  { id: "daily", title: "Daily national brief", blurb: "Key numbers and what needs attention today", period: "Today", icon: FileText, who: ["cabinet", "minister", "operator"] },
  { id: "weekly", title: "Weekly ministry report", blurb: "Score, water handled and budget for each ministry", period: "This week", icon: Users, who: ["cabinet", "minister"] },
  { id: "monthly", title: "Monthly Cabinet pack", blurb: "Money indicators, outcomes against targets and insights", period: "This month", icon: FileText, who: ["cabinet", "minister"] },
  { id: "balance", title: "Water balance statement", blurb: "Every source and every use, adding up to zero difference", period: "Normal year", icon: Scale, who: ["cabinet", "minister"] },
  { id: "alerts", title: "Alerts log", blurb: "All alarms and events with their state", period: "Last 7 days", icon: TriangleAlert, who: ["cabinet", "operator"], csv: true },
  { id: "stations", title: "Station register", blurb: "All 37 stations with owner, type, governorate and status", period: "Now", icon: MapPinned, who: ["cabinet", "minister", "operator"], csv: true },
];
const SCHEDULE = [
  { t: "Daily national brief", when: "Every day 06:00", to: "Cabinet office" },
  { t: "Weekly ministry report", when: "Sunday 08:00", to: "The four ministers" },
  { t: "Monthly Cabinet pack", when: "1st of the month", to: "Cabinet" },
];
const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

type Table = { head: string[]; rows: string[][] };
interface Content { sections: { title: string; table?: Table; list?: string[] }[] }

function useContent(id: RepId): Content {
  const { alarms } = useLive();
  return useMemo(() => {
    const wait = waiting(alarms).sort((a, b) => a.priority - b.priority || b.at - a.at);
    const kpiRows = NATIONAL_KPIS.map((k) => [k.label, `${k.prefix ?? ""}${k.value.toFixed(k.decimals)} ${k.unit}${k.sub ? ` ${k.sub}` : ""}`, `${k.delta.startsWith("vs") ? "" : "+"}${k.delta}`]);
    const ministries: Table = {
      head: ["Ministry", "Score", "Status", "Water handled (M m³/day)", "Budget used", "Top issue"],
      rows: MINISTRIES.map((m) => [m.name, String(MINISTRY_SCORE[m.id].score), STATUS_LABEL[MINISTRY_SCORE[m.id].status], WATER_HANDLED[m.id].toFixed(1), `${BUDGET_USED[m.id]}%`, MINISTRY_SCORE[m.id].issue]),
    };
    if (id === "daily") return { sections: [
      { title: "Key numbers", table: { head: ["Indicator", "Now", "Change"], rows: kpiRows } },
      { title: "Needs attention", table: { head: ["Alarm", "Station", "Ministry", "Since"], rows: wait.slice(0, 6).map((a) => [a.comment, a.name, a.group, fmtGrid(a.at)]) } },
    ] };
    if (id === "weekly") return { sections: [{ title: "Ministries", table: ministries }, { title: "Insights", list: INSIGHTS }] };
    if (id === "monthly") return { sections: [
      { title: "Money indicators (EGP)", table: { head: ["Indicator", "Now", "Change", "Target", "Progress"], rows: EXEC_KPIS.map((k) => [k.label, `${k.cur ? `${k.cur} ` : ""}${k.value.toFixed(k.decimals)} ${k.unit}`, k.delta, EXEC_TREND[k.id].target, `${EXEC_TREND[k.id].progress}%`]) } },
      { title: "National outcomes", table: { head: ["Outcome", "Score", "Target"], rows: OUTCOMES.map((o) => [o.label, String(OUTCOME_SCORE[o.id].score), String(OUTCOME_SCORE[o.id].target)]) } },
      { title: "Insights", list: INSIGHTS },
    ] };
    if (id === "balance") return { sections: [
      { title: "Water in (M m³/day)", table: { head: ["Source", "Amount"], rows: [["Sea (desalination)", "1.6"], ["Nile (river)", "7.5"], ["Wells", "8.4"], ["Total supply", "17.5"]] } },
      { title: "Water out (M m³/day)", table: { head: ["Use", "Amount"], rows: [["Reused", "4.1"], ["Returned to nature", "5.3"], ["Used up by crops and evaporation", "4.4"], ["Lost in networks", "3.7"], ["Total", "17.5"]] } },
      { title: "Check", list: ["In 17.5 = Out 17.5. Difference 0.0."] },
    ] };
    if (id === "alerts") return { sections: [{ title: "Alarms and events", table: { head: ["Time", "State", "Class", "Name", "Ministry", "Node", "Comment"], rows: [...alarms].sort((a, b) => b.at - a.at).map((a) => [fmtGrid(a.at), a.state || "-", a.cls, a.name, a.group, a.node, a.comment]) } }] };
    return { sections: [{ title: "Stations", table: { head: ["Station", "Ministry", "Type", "Governorate", "Status"], rows: STATIONS.map((s) => [s.name, s.ministry.toUpperCase(), TYPE_INFO[s.type].label, GOV[s.id] ?? "", s.status === "good" ? "On track" : s.status === "watch" ? "Watch" : "Behind"]) } }] };
  }, [id, alarms]);
}

function Sheet({ rep, content, limit }: { rep: Rep; content: Content; limit?: number }) {
  return (
    <div className="brief-sheet dark-scope rp-sheet" style={{ color: "#101f2e" }}>
      <div className="brief-head">
        <div><h1>Egypt National Water Platform</h1><p className="brief-sub">{rep.title} · {today()}</p></div>
        <img className="brief-logo" src="/img/schneider-green.png" alt="Schneider Electric" />
      </div>
      {content.sections.map((s) => (
        <div key={s.title}>
          <h2>{s.title}</h2>
          {s.table && (
            <table>
              <thead><tr>{s.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{(limit ? s.table.rows.slice(0, limit) : s.table.rows).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
            </table>
          )}
          {s.list && <ul>{s.list.map((t) => <li key={t}>{t}</li>)}</ul>}
        </div>
      ))}
      <p className="brief-note">All figures are simulated for demonstration.</p>
    </div>
  );
}

function download(rep: Rep, content: Content) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = content.sections.flatMap((s) => (s.table ? [esc(s.title), s.table.head.map(esc).join(","), ...s.table.rows.map((r) => r.map(esc).join(",")), ""] : []));
  const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${rep.id}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports({ role }: { role: Role }) {
  const [sel, setSel] = useState<RepId>("daily");
  const [note, setNote] = useState<string | null>(null);
  const rep = REPS.find((r) => r.id === sel)!;
  const content = useContent(sel);
  const allowed = rep.who.includes(role);
  const roleTitle = ROLES.find((r) => r.id === role)!.label;
  const flash = (t: string) => { setNote(t); window.setTimeout(() => setNote(null), 3000); };

  return (
    <motion.div className="pg rp" style={{ gridTemplateRows: "80px 1fr" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <header className="x-hero">
        <div className="x-hero-t"><h2>Reports</h2><p>Ready-made briefs to print, save as PDF or download as a spreadsheet · you are in the {roleTitle}</p></div>
      </header>

      <div className="pg-grid" style={{ gridTemplateColumns: "400px 500px 1fr" }}>
        <Panel icon={FileText} title="Report library" hint={`${REPS.filter((r) => r.who.includes(role)).length} of ${REPS.length} open to you`} i={0}>
          <div className="rp-lib">
            <ul>
              {REPS.map((r) => {
                const ok = r.who.includes(role);
                return (
                  <li key={r.id}>
                    <button className={`${sel === r.id ? "on" : ""} ${ok ? "" : "locked"}`} onClick={() => setSel(r.id)}>
                      <i className="x-ico"><r.icon size={18} /></i>
                      <span><b>{r.title}</b><em>{r.blurb}</em></span>
                      {ok ? <small>{r.period}</small> : <Lock size={15} aria-label="Not open to this view" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <h5><CalendarClock size={13} /> Scheduled (simulated)</h5>
            <ul className="rp-sch">{SCHEDULE.map((s) => <li key={s.t}><b>{s.t}</b><em>{s.when} · {s.to}</em></li>)}</ul>
          </div>
        </Panel>

        <Panel icon={FileText} title="Preview" hint="A4 page" i={1}>
          <div className="rp-prev"><div className="rp-scale"><Sheet rep={rep} content={content} limit={rep.id === "alerts" ? 12 : 16} /></div></div>
        </Panel>

        <Panel icon={Send} title={rep.title} hint={rep.period} i={2}>
          <div className="rp-side">
            <p>{rep.blurb}.</p>
            <dl>
              <div><dt>Open to</dt><dd>{rep.who.map((w) => ROLES.find((r) => r.id === w)!.label).join(", ")}</dd></div>
              <div><dt>Made from</dt><dd>The same live numbers as the other pages</dd></div>
              <div><dt>Formats</dt><dd>PDF (print), {rep.csv ? "spreadsheet (CSV)" : "spreadsheet of its tables (CSV)"}</dd></div>
            </dl>
            {!allowed && <div className="rp-lock"><Lock size={16} /> Not open to the {roleTitle}. Switch the view in the account menu.</div>}
            <div className="rp-btns">
              <button className="primary" disabled={!allowed} onClick={() => window.print()}><Printer size={16} /> Print or save as PDF</button>
              <button disabled={!allowed} onClick={() => { download(rep, content); flash("CSV downloaded"); }}><FileSpreadsheet size={16} /> Download CSV</button>
              <button disabled={!allowed} onClick={() => flash(`${rep.title} sent to your office (simulated)`)}><Download size={16} /> Send to my office</button>
            </div>
            {note && <div className="rp-note" role="status">{note}</div>}
          </div>
        </Panel>
      </div>
      {allowed && createPortal(<div className="rp-print"><Sheet rep={rep} content={content} /></div>, document.body)}
    </motion.div>
  );
}
