import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Lock, ShieldCheck, UserRound, Wifi, WifiOff } from "lucide-react";
import { can, needs, type Level, type Role, type Who } from "./model";
import { PIVOTS, type PivotId } from "./pivots";

/** simulated roles: the same screens, but some controls are locked until the role is high enough. Real sign-in comes with the backend. */
const Ctx = createContext<Who>({ name: "A", role: "Admin" });
export const RoleProvider = ({ who, children }: { who: Who; children: ReactNode }) => <Ctx.Provider value={who}>{children}</Ctx.Provider>;
export const useWho = () => useContext(Ctx);
/** `ok` is false when the role is too low; `why` is the reason to show on the locked control */
export function useCan(level: Level) {
  const { role } = useWho();
  const ok = can(role, level);
  return { ok, why: ok ? "" : `${needs(level)} role required` };
}
export const Locked = ({ why }: { why: string }) => <span className="lock" title={why}><Lock size={14} /></span>;

const ROLES: { role: Role; note: string }[] = [
  { role: "Operator", note: "Start and stop pivots, open and close nozzles, acknowledge alarms." },
  { role: "Supervisor", note: "Everything an operator can do, plus speed, irrigation windows, and resetting faults." },
  { role: "Admin", note: "Everything, plus the dry soil limit and the pumping schedule." },
];

export function UserMenu({ who, setRole, links, setLink }: { who: Who; setRole: (r: Role) => void; links: Record<PivotId, boolean>; setLink: (id: PivotId, lost: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const initials = who.name.split(" ").map((s) => s[0]).join("").slice(0, 2);
  const cur = ROLES.find((r) => r.role === who.role)!;
  return (
    <div className="um" ref={box}>
      <button className="um-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`${who.name}, ${who.role}. Open the user menu`}>
        <span>{initials}</span>
      </button>
      {open && (
        <div className="um-pop" role="dialog" aria-label="User">
          <div className="um-head">
            <span className="um-av">{initials}</span>
            <div><b>{who.name}</b><em>{who.role}</em></div>
          </div>
          <p className="um-lab"><ShieldCheck size={15} />Role (simulated)</p>
          <div className="seg um-seg" role="group" aria-label="Role">
            {ROLES.map((r) => <button key={r.role} className={who.role === r.role ? "on" : ""} aria-pressed={who.role === r.role} onClick={() => setRole(r.role)}>{r.role}</button>)}
          </div>
          <p className="um-note"><UserRound size={15} />{cur.note}</p>
          <p className="um-lab"><Wifi size={15} />Demo: cut the signal</p>
          <div className="um-links">
            {PIVOTS.map((p) => (
              <button key={p.id} className={`sw ${links[p.id] ? "" : "on"}`} role="switch" aria-checked={links[p.id]} onClick={() => setLink(p.id, links[p.id])}>
                {links[p.id] ? <Wifi size={15} /> : <WifiOff size={15} />}{p.id}
              </button>
            ))}
          </div>
          <p className="um-fine">Switch a pivot off to see how the dashboard shows a lost signal.</p>
        </div>
      )}
    </div>
  );
}
