import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Bell, Info } from "lucide-react";
import { ago, atOf, type AlarmSev } from "./alarmLog";
import { activeAlarms, useAlarmLog } from "./AlarmsContext";
import type { Go } from "./App";

const ICON = { Critical: AlertTriangle, Warning: AlertTriangle, Info } as const;
const COLOR: Record<AlarmSev, string> = { Critical: "var(--bad)", Warning: "var(--warn)", Info: "var(--blue)" };

/** bell in the top bar: a quick look at the newest alarms, every item opens the full Alarms page */
export default function AlertsBell({ go }: { go: Go }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const { log, done } = useAlarmLog();
  const active = useMemo(() => activeAlarms(log, done), [log, done]);
  const attention = active.filter((a) => a.sev !== "Info").length;

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  const openPage = (id?: string) => { setOpen(false); go("alarms", id); };

  return (
    <div className="bell-wrap" ref={box}>
      <button className={`icon-btn ${open ? "on" : ""}`} onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open} aria-label={`Alarms, ${attention} need attention`}>
        <Bell size={18} />
        {attention > 0 && <i>{attention}</i>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="bell-panel" role="dialog" aria-label="Alarms" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.18 }}>
            <header>
              <div><b>Alarms</b><span>{attention} need attention · {active.length} active</span></div>
              <button className="link" onClick={() => openPage()}>All alarms <ArrowRight size={13} /></button>
            </header>
            <ul>
              {active.slice(0, 6).map((a) => {
                const I = ICON[a.sev];
                return (
                  <li key={a.id}>
                    <button onClick={() => openPage(a.id)}>
                      <span className="b-ico" style={{ color: COLOR[a.sev], background: `color-mix(in srgb, ${COLOR[a.sev]} 12%, transparent)` }}><I size={15} /></span>
                      <span className="b-txt"><b>{a.text}</b><small>{a.where} · {a.stage} · {ago(atOf(a))}</small></span>
                      <ArrowRight size={14} className="b-go" />
                    </button>
                  </li>
                );
              })}
              {!active.length && <li className="b-empty">No active alarms</li>}
            </ul>
            <footer>
              <button className="link" onClick={() => openPage()}>Open the full Alarms page <ArrowRight size={13} /></button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
