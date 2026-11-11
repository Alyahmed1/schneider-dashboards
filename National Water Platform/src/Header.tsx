import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CircleHelp, PanelLeftClose, PanelLeftOpen, FileText, Home as HomeIcon, Info, OctagonAlert, ShieldCheck, TriangleAlert, Eye, UserRound, Wrench } from "lucide-react";
import { ALERTS, MINISTRY_BY_ID, ROLES, type Go, type Role, type Sev } from "./data";
import { useDismiss } from "./ui";

export const SEV_ICON = { critical: OctagonAlert, warning: TriangleAlert, info: Info } as const;
export const sevClass = (s: Sev) => s;

function Pop({ open, children, label }: { open: boolean; children: React.ReactNode; label: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="pop" role="dialog" aria-label={label} initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.18 }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Bell_({ go }: { go: Go }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);
  const crit = ALERTS.filter((a) => a.sev === "critical").length;
  return (
    <div className="hd-wrap" ref={ref}>
      <button className={`hd-btn ${open ? "on" : ""}`} onClick={() => setOpen((o) => !o)} aria-label={`Alerts: ${ALERTS.length} active`} aria-expanded={open}>
        <Bell size={19} /><span className="hd-badge">{ALERTS.length}</span>
      </button>
      <Pop open={open} label="Alerts">
        <div className="pop-top"><b>Active alerts</b><span>{crit} critical</span></div>
        <ul className="alert-list">
          {ALERTS.map((a) => {
            const Icon = SEV_ICON[a.sev];
            const m = MINISTRY_BY_ID[a.ministry];
            return (
              <li key={a.id}>
                <button onClick={() => { setOpen(false); go("alerts"); }}>
                  <span className={`sev ${sevClass(a.sev)}`}><Icon size={16} /></span>
                  <span className="al-t"><b>{a.text}</b><em>{m.short} · {a.where} · {a.ago}</em></span>
                </button>
              </li>
            );
          })}
        </ul>
        <button className="pop-link" onClick={() => { setOpen(false); go("alerts"); }}>Open all alerts &amp; events</button>
      </Pop>
    </div>
  );
}

function Help() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);
  return (
    <div className="hd-wrap" ref={ref}>
      <button className={`hd-btn ${open ? "on" : ""}`} onClick={() => setOpen((o) => !o)} aria-label="Help" aria-expanded={open}><CircleHelp size={19} /></button>
      <Pop open={open} label="Help">
        <div className="pop-top"><b>How to use the platform</b></div>
        <ul className="help-list">
          <li><span><HomeIcon size={15} /></span>Home shows the whole country. Click a number, a card or a pin to go deeper.</li>
          <li><span><Eye size={15} /></span>Executive View is the one-screen summary for decision makers.</li>
          <li><span><Wrench size={15} /></span>Each ministry opens its own sites and dashboards.</li>
          <li><span><Info size={15} /></span>All data is simulated for this demo.</li>
        </ul>
      </Pop>
    </div>
  );
}

function Account({ role, setRole, go, onStart }: { role: Role; setRole: (r: Role) => void; go: Go; onStart: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);
  const cur = ROLES.find((r) => r.id === role)!;
  const jump = (fn: () => void) => { setOpen(false); fn(); };
  return (
    <div className="hd-wrap" ref={ref}>
      <button className={`user ${open ? "on" : ""}`} onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open} aria-label={`Account: A, ${cur.title}`}>
        <span className="user-av"><UserRound size={17} /></span>
        <div><b>A</b><em>{cur.title}</em></div>
      </button>
      <Pop open={open} label="Account">
        <div className="me-top">
          <div className="me-av" aria-hidden>A</div>
          <div><b>A</b><span>{cur.title}</span></div>
          <span className="chip good">Online</span>
        </div>
        <div className="me-sub">Switch view</div>
        <div className="role-list" role="radiogroup" aria-label="View">
          {ROLES.map((r) => (
            <button key={r.id} role="radio" aria-checked={r.id === role} className={r.id === role ? "on" : ""} onClick={() => setRole(r.id)}>
              <ShieldCheck size={15} /><span><b>{r.label}</b><em>{r.access}</em></span>
            </button>
          ))}
        </div>
        <div className="me-actions">
          <button onClick={() => jump(() => go("alerts"))}><Bell size={16} /> My alerts</button>
          <button onClick={() => jump(() => go("reports"))}><FileText size={16} /> Reports</button>
          <button onClick={() => jump(onStart)}><HomeIcon size={16} /> Back to the start screen</button>
        </div>
      </Pop>
    </div>
  );
}

export default function Header({ go, role, setRole, onStart, collapsed, onToggle }: { go: Go; role: Role; setRole: (r: Role) => void; onStart: () => void; collapsed: boolean; onToggle: () => void }) {
  return (
    <header className="header">
      <button className="hd-btn hd-toggle" onClick={onToggle} aria-label={collapsed ? "Show the menu" : "Hide the menu"} aria-pressed={collapsed} title={collapsed ? "Show the menu" : "Hide the menu"}>
        {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
      </button>
      <button className="brand" onClick={() => go("home")} aria-label="Home">
        <img className="eagle" src="/img/eagle.png" alt="" draggable={false} />
        <div><b>Arab Republic of Egypt</b><em>National water sector</em></div>
      </button>
      <div className="title">
        <h1>Egypt National Water Platform</h1>
        <p>Unified View Across the Water Sector</p>
      </div>
      <div className="hd-right"><img className="hd-logo" src="/img/schneider-green.png" alt="Schneider Electric" draggable={false} /><Bell_ go={go} /><Help /><Account role={role} setRole={setRole} go={go} onStart={onStart} /></div>
    </header>
  );
}
