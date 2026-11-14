import { useEffect, useRef, useState } from "react";
import { Bell, Home, Moon, Sun } from "lucide-react";
import { FARM, pivotsAt } from "./farm";
import { useAlarms, useOpenAlarms } from "./alarms";
import type { Go, Theme } from "./App";

const NAME = "Administrator";
const ROLE = "Farm manager";

/** the person in the top bar: a click opens their profile card with shift, access, a few live numbers and shortcuts */
export default function UserMenu({ theme, setTheme, go, toStart }: { theme: Theme; setTheme: (t: Theme) => void; go: Go; toStart: () => void }) {
  const [show, setShow] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const open = useOpenAlarms();
  const { done } = useAlarms();
  const mine = Object.values(done).filter((d) => d.by === NAME).length;
  const irrigating = pivotsAt(new Date().getHours()).filter((n) => n.status === "Irrigating").length;

  useEffect(() => {
    if (!show) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setShow(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setShow(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [show]);

  const run = (fn: () => void) => () => { setShow(false); fn(); };
  return (
    <div className="um" ref={box}>
      <button className="user" onClick={() => setShow((s) => !s)} aria-expanded={show} aria-haspopup="dialog" aria-label={`${NAME}, ${ROLE}: open the profile`}>
        <span>A</span><div><b>{NAME}</b><em>{ROLE}</em></div>
      </button>
      {show && (
        <div className="um-pop" role="dialog" aria-label="Profile">
          <div className="um-head">
            <span className="um-av" aria-hidden>A</span>
            <div><b>{NAME}</b><em>{ROLE}</em></div>
            <i className="um-on">Online</i>
          </div>
          <dl className="um-rows">
            <div><dt>Farm</dt><dd>{FARM.name}</dd></div>
            <div><dt>Shift</dt><dd>Day · 07:00 to 15:00</dd></div>
            <div><dt>Signed in</dt><dd>Today, 07:42</dd></div>
            <div><dt>Access</dt><dd>Operate and approve</dd></div>
          </dl>
          <div className="um-stats">
            <div><b>{open.length}</b><span>Active alarms</span></div>
            <div><b>{mine}</b><span>Done by you</span></div>
            <div><b>{irrigating}</b><span>Pivots irrigating</span></div>
          </div>
          <div className="um-links">
            <button onClick={run(() => go("alarms"))}><Bell size={16} />My alarms</button>
            <button onClick={run(() => setTheme(theme === "dark" ? "light" : "dark"))}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</button>
            <button onClick={run(toStart)}><Home size={16} />Back to the start screen</button>
          </div>
        </div>
      )}
    </div>
  );
}
