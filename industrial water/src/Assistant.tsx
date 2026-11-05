import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Send, Sparkles, X } from "lucide-react";
import { ask, SUGGESTED, type Action } from "./askengine";
import { useStore } from "./store";
import type { Go } from "./App";

interface Msg { who: "me" | "bot"; text: string; actions?: Action[]; chips?: string[] }

/** A small chat assistant. Free and offline: it answers from the same data as the screens, in the browser. */
export default function Assistant({ open, onClose, go, onWork }: { open: boolean; onClose: () => void; go: Go; onWork: () => void }) {
  const { scn, alarms, openWorkOrders, setScn, reset } = useStore();
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ who: "bot", text: "Hi, I'm the water assistant. Ask me about alarms, recycling, what MMM and CPG mean, or what happens in heavy rain.", chips: SUGGESTED }]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy, open]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, onClose]);

  const send = (q: string) => {
    const t = q.trim();
    if (!t || busy) return;
    setMsgs((m) => [...m, { who: "me", text: t }]);
    setText("");
    setBusy(true);
    // a short pause so it reads like a conversation
    window.setTimeout(() => {
      const a = ask(t, { scn, alarms, openWo: openWorkOrders });
      setMsgs((m) => [...m, { who: "bot", text: a.text, actions: a.actions, chips: a.chips }]);
      setBusy(false);
    }, 450);
  };

  const run = (a: Action) => {
    const d = a.do;
    if (d.type === "go") go(d.tab);
    else if (d.type === "scn") { setScn(d.area, d.id); go(d.area); }
    else if (d.type === "reset") reset();
    else onWork();
    if (window.matchMedia("(max-width: 900px)").matches) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.section className="as-panel" role="dialog" aria-label="Water assistant" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
          <header>
            <Sparkles size={16} />
            <div><b>Water assistant</b><small>Demo · runs in your browser, free</small></div>
            <button onClick={onClose} aria-label="Close the assistant"><X size={16} /></button>
          </header>
          <div className="as-log" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`as-msg ${m.who}`}>
                <p>{m.text}</p>
                {m.actions && <div className="as-acts">{m.actions.map((a) => <button key={a.label} className="as-go" onClick={() => run(a)}>{a.label} <ArrowRight size={13} /></button>)}</div>}
                {m.who === "bot" && m.chips && i === msgs.length - 1 && <div className="as-chips">{m.chips.map((c) => <button key={c} onClick={() => send(c)}>{c}</button>)}</div>}
              </div>
            ))}
            {busy && <div className="as-msg bot"><p className="as-dots"><i /><i /><i /></p></div>}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about the water…" aria-label="Your question" autoFocus />
            <button type="submit" disabled={!text.trim() || busy} aria-label="Send"><Send size={16} /></button>
          </form>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
