import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Check } from "lucide-react";
import { ALARMS, type Alarm } from "./farm";
import type { Go } from "./App";

interface Ctx { done: Record<string, boolean>; toggle: (id: string) => void }
const AlarmsCtx = createContext<Ctx>({ done: {}, toggle: () => {} });
export const useAlarms = () => useContext(AlarmsCtx);

export function AlarmsProvider({ children }: { children: ReactNode }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  return <AlarmsCtx.Provider value={{ done, toggle: (id) => setDone((d) => ({ ...d, [id]: !d[id] })) }}>{children}</AlarmsCtx.Provider>;
}

/** alarms nobody has acknowledged yet */
export const useOpenAlarms = () => {
  const { done } = useAlarms();
  return ALARMS.filter((a) => !done[a.id]);
};

const SEV_CLASS: Record<Alarm["sev"], string> = { Critical: "bad", Warning: "warn", Info: "info" };

/** the bell in the top bar: a count, and a short list that opens under it */
export function AlertsBell({ go }: { go: Go }) {
  const open = useOpenAlarms();
  const [show, setShow] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!show) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setShow(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setShow(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [show]);
  return (
    <div className="bell" ref={box}>
      <button className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={`${open.length} open alarms`} aria-expanded={show}>
        <Bell size={16} />{open.length > 0 && <i>{open.length}</i>}
      </button>
      {show && (
        <div className="bell-pop" role="dialog" aria-label="Alarms">
          <ul>
            {open.slice(0, 4).map((a) => (
              <li key={a.id}><span className={`sev ${SEV_CLASS[a.sev]}`}>{a.sev}</span><b>{a.source}</b><em>{a.time}</em><p>{a.text}</p></li>
            ))}
            {open.length === 0 && <li className="none">No open alarms</li>}
          </ul>
          <button className="btn" onClick={() => { setShow(false); go("alarms"); }}>Open all alarms</button>
        </div>
      )}
    </div>
  );
}

export function AlarmsPage() {
  const { done, toggle } = useAlarms();
  return (
    <section className="pn al-page">
      <h3>Alarms</h3>
      <div className="al-list">
        {ALARMS.map((a) => (
          <div key={a.id} className={`al-row ${done[a.id] ? "done" : ""}`}>
            <span className={`sev ${SEV_CLASS[a.sev]}`}>{a.sev}</span>
            <b>{a.source}</b>
            <p>{a.text}</p>
            <em>{a.time}</em>
            <button className="btn" onClick={() => toggle(a.id)}>{done[a.id] ? <>Reopen</> : <><Check size={14} /> Acknowledge</>}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
