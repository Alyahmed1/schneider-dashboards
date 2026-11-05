import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Hammer, Play, RotateCcw, X } from "lucide-react";
import { AREA_NAME, useStore, type WoStatus } from "./store";
import type { Go } from "./App";

const FILTERS = ["Open", "Done", "All"] as const;
type Filter = (typeof FILTERS)[number];

/** the work orders: pick one to read it, tick off its steps, start it, finish it, reopen it, or jump to its alarm or tab */
export default function WorkOrders({ open, onClose, go }: { open: boolean; onClose: () => void; go: Go }) {
  const { workOrders, openWorkOrders, setWoStatus } = useStore();
  const [filter, setFilter] = useState<Filter>("Open");
  const [sel, setSel] = useState<string | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, onClose]);

  const list = workOrders.filter((w) => filter === "All" || (filter === "Done") === (w.status === "Done"));
  // the detail stays on the work order you picked, even right after it leaves this list (for example when you mark it done)
  const cur = workOrders.find((w) => w.id === sel) ?? list[0] ?? null;
  const inProgress = workOrders.filter((w) => w.status === "In progress").length;
  const count = (f: Filter) => (f === "Open" ? openWorkOrders.length : f === "Done" ? workOrders.length - openWorkOrders.length : workOrders.length);
  const set = (id: string, s: WoStatus) => setWoStatus(id, s);
  const jump = (fn: () => void) => { onClose(); fn(); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="wo-veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div className="wo" role="dialog" aria-label="Work orders" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }} transition={{ duration: 0.2 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="wo-h">
              <span><Hammer size={17} /></span>
              <div><b>Work orders</b><em>{openWorkOrders.length} open · {inProgress} in progress. Pick one to open it.</em></div>
              <div className="seg wo-seg" role="tablist" aria-label="Work order status">
                {FILTERS.map((f) => <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? "on" : ""} onClick={() => { setFilter(f); setSel(null); }}>{f} {count(f)}</button>)}
              </div>
              <button className="wo-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
            </div>

            <div className="wo-body">
              <div className="wo-list" role="listbox" aria-label="Work orders">
                {list.map((w) => (
                  <button key={w.id} role="option" aria-selected={cur?.id === w.id} className={`wo-item ${cur?.id === w.id ? "on" : ""} ${w.status === "Done" ? "done" : ""}`} onClick={() => setSel(w.id)}>
                    <code>{w.id}</code>
                    <span className="wo-t"><b>{w.title}</b><em>{w.where}</em></span>
                    <i className={`pr ${w.priority.toLowerCase()}`}>{w.priority}</i>
                    <u className={w.status === "In progress" ? "prog" : w.status === "Done" ? "fin" : ""}>{w.status}</u>
                  </button>
                ))}
                {!list.length && <p className="wo-none">{filter === "Done" ? "Nothing is done yet. Finish a work order and it shows up here." : "No work orders in this list."}</p>}
              </div>

              <div className="wo-detail">
                {cur ? (
                  <>
                    <div className="wd-top">
                      <code>{cur.id}</code>
                      <i className={`pr ${cur.priority.toLowerCase()}`}>{cur.priority}</i>
                      <u className={cur.status === "In progress" ? "prog" : cur.status === "Done" ? "fin" : ""}>{cur.status}</u>
                    </div>
                    <h3>{cur.title}</h3>
                    <dl className="wd-meta">
                      <div><dt>Where</dt><dd>{cur.where}</dd></div>
                      <div><dt>Due</dt><dd>{cur.due}</dd></div>
                      {cur.tag && <div><dt>Tag</dt><dd>{cur.tag}</dd></div>}
                      {cur.alarmValue && <div><dt>Reading</dt><dd>{cur.alarmValue} <span>normal {cur.alarmLimit}</span></dd></div>}
                    </dl>
                    <p className="wd-text">{cur.detail}</p>
                    <div className="wd-steps">
                      <b>Steps</b>
                      {cur.steps.map((st, i) => {
                        const k = `${cur.id}:${i}`;
                        const on = cur.status === "Done" || !!ticked[k];
                        return (
                          <label key={k} className={on ? "on" : ""}>
                            <input type="checkbox" checked={on} disabled={cur.status === "Done"} onChange={() => setTicked((t) => ({ ...t, [k]: !t[k] }))} />
                            <span>{st}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="wd-act">
                      {cur.status === "Open" && <button className="wo-btn" onClick={() => set(cur.id, "In progress")}><Play size={14} /> Start work</button>}
                      {cur.status !== "Done" && <button className="wo-btn go" onClick={() => set(cur.id, "Done")}><Check size={14} /> Mark as done</button>}
                      {cur.status === "In progress" && <button className="wo-btn" onClick={() => set(cur.id, "Open")}><RotateCcw size={14} /> Back to open</button>}
                      {cur.status === "Done" && <button className="wo-btn" onClick={() => set(cur.id, "Open")}><RotateCcw size={14} /> Reopen</button>}
                      {cur.alarmId && <button className="wo-btn link" onClick={() => jump(() => go("alarms", cur.alarmId))}><Bell size={14} /> View the alarm</button>}
                      <button className="wo-btn link" onClick={() => jump(() => go(cur.area))}>Open the {AREA_NAME[cur.area]} tab</button>
                    </div>
                    {cur.alarmId && cur.status === "Done" && <p className="wd-note">The alarm for this work order was marked as done too.</p>}
                  </>
                ) : <p className="wo-none">Pick a work order on the left.</p>}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
