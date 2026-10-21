import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Hammer, Home, Moon, Sun } from "lucide-react";
import { activeAlarms, useAlarmLog } from "./AlarmsContext";
import { PLANT } from "./data";
import { Chip, CountUp } from "./ui";
import type { WorkOrder } from "./cmms";
import type { Go, Theme } from "./App";

/** the "A" avatar: who is signed in, what is on their plate, and a few quick actions */
export default function UserMenu({ go, theme, setTheme, wos, onStart }: { go: Go; theme: Theme; setTheme: (t: Theme) => void; wos: WorkOrder[]; onStart: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const { log, done } = useAlarmLog();
  const active = useMemo(() => activeAlarms(log, done).length, [log, done]);
  const mine = useMemo(() => Object.values(done).filter((d) => d.by === "AVEVA").length, [done]);
  const openWo = wos.filter((w) => w.status !== "Done").length;
  const signedIn = useMemo(() => new Date(new Date().setHours(7, 42, 0, 0)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), []);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  const jump = (fn: () => void) => { setOpen(false); fn(); };

  return (
    <div className="user-wrap" ref={box}>
      <button className={`user ${open ? "on" : ""}`} onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open} aria-label="Account: AVEVA, plant manager">
        <span>A</span>
        <div><b>AVEVA</b><em>Plant manager</em></div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="me-panel" role="dialog" aria-label="Account" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.18 }}>
            <div className="me-top">
              <div className="me-av" aria-hidden>A</div>
              <div><b>AVEVA</b><span>Plant manager</span></div>
              <Chip tone="good">Online</Chip>
            </div>
            <div className="me-info">
              <div><span>Plant</span><b>{PLANT.name}</b></div>
              <div><span>Shift</span><b>Day · 07:00 to 15:00</b></div>
              <div><span>Signed in</span><b>Today, {signedIn}</b></div>
              <div><span>Access</span><b>Operate and approve</b></div>
            </div>
            <div className="me-stats">
              <button onClick={() => jump(() => go("alarms"))}><b><CountUp value={active} /></b><span>Active alarms</span></button>
              <button onClick={() => jump(() => go("alarms"))}><b><CountUp value={mine} /></b><span>Done by you</span></button>
              <button onClick={() => jump(() => go("maintenance"))}><b><CountUp value={openWo} /></b><span>Open work orders</span></button>
            </div>
            <div className="me-actions">
              <button onClick={() => jump(() => go("alarms"))}><Bell size={16} /> My alarms</button>
              <button onClick={() => jump(() => go("maintenance"))}><Hammer size={16} /> Work orders</button>
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</button>
              <button onClick={() => jump(onStart)}><Home size={16} /> Back to the start screen</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
