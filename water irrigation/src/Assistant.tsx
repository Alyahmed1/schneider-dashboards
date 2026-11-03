import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X } from "lucide-react";
import { answer, SUGGESTIONS, type Answer } from "./askengine";
import type { Go } from "./App";

interface Msg { who: "me" | "ai"; text: string; a?: Answer }
const HELLO: Msg = { who: "ai", text: "Hello. Ask me about the pivots, pump stations, water and energy, the landscape or the grey water plant. I answer from this dashboard's own data, offline." };

/** the offline assistant: a side panel that sits beside the page, so nothing is covered */
export default function Assistant({ open, onClose, go }: { open: boolean; onClose: () => void; go: Go }) {
  const [msgs, setMsgs] = useState<Msg[]>([HELLO]);
  const [q, setQ] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, open]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const a = answer(t, Math.min(23.9, new Date().getHours() + new Date().getMinutes() / 60));
    setMsgs((m) => [...m, { who: "me", text: t }, { who: "ai", text: a.text, a }]);
    setQ("");
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.aside className="assistant" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} aria-label="Assistant">
          <header><b>Assistant</b><span>offline · answers from the farm data</span><button className="icon-btn" onClick={onClose} aria-label="Close the assistant"><X size={16} /></button></header>
          <div className="as-msgs">
            {msgs.map((m, i) => (
              <div key={i} className={`as-msg ${m.who}`}>
                <p>{m.text}</p>
                {m.a?.view && <button className="btn" onClick={() => go(m.a!.view!, m.a!.target)}>Open it</button>}
              </div>
            ))}
            <div ref={end} />
          </div>
          <div className="as-sug">{SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>
          <form onSubmit={(e) => { e.preventDefault(); send(q); }}>
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about the farm" aria-label="Your question" />
            <button className="btn pri" type="submit" aria-label="Send"><Send size={15} /></button>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
