import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { ask, SUGGESTED, type Answer } from "./askengine";
import type { Go } from "./App";

interface Msg { who: "me" | "bot"; text: string; go?: Answer["go"]; chips?: string[] }

/** A small chat assistant. Free and offline: it answers from the same sample data as the screens, in the browser. */
export default function Assistant({ go }: { go: Go }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ who: "bot", text: "Hi, I'm the plant assistant. Ask me about alarms, the RO trains, water quality, energy or what to fix first.", chips: SUGGESTED }]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy, open]);

  const send = (q: string) => {
    const t = q.trim();
    if (!t || busy) return;
    setMsgs((m) => [...m, { who: "me", text: t }]);
    setText("");
    setBusy(true);
    // a short pause so it reads like a conversation
    window.setTimeout(() => {
      const a = ask(t);
      setMsgs((m) => [...m, { who: "bot", text: a.text, go: a.go, chips: a.chips }]);
      setBusy(false);
    }, 450);
  };

  return (
    <>
      <button className={`as-fab ${open ? "on" : ""}`} onClick={() => setOpen((o) => !o)} aria-label={open ? "Close the assistant" : "Open the assistant"} aria-expanded={open}>
        {open ? <X size={20} /> : <MessageCircle size={20} />}<span>{open ? "Close" : "Ask the assistant"}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.section className="as-panel" role="dialog" aria-label="Plant assistant" initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
            <header>
              <Sparkles size={16} />
              <div><b>Plant assistant</b><small>Demo · runs in your browser, free</small></div>
              <button onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button>
            </header>
            <div className="as-log" aria-live="polite">
              {msgs.map((m, i) => (
                <div key={i} className={`as-msg ${m.who}`}>
                  <p>{m.text}</p>
                  {m.go && <button className="as-go" onClick={() => { go(m.go!.tab, m.go!.stage); setOpen(false); }}><ArrowRight size={13} /> {m.go.label}</button>}
                  {m.who === "bot" && m.chips && i === msgs.length - 1 && <div className="as-chips">{m.chips.map((c) => <button key={c} onClick={() => send(c)}>{c}</button>)}</div>}
                </div>
              ))}
              {busy && <div className="as-msg bot"><p className="as-dots"><i /><i /><i /></p></div>}
              <div ref={end} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(text); }}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about the plant…" aria-label="Your question" autoFocus />
              <button type="submit" disabled={!text.trim() || busy} aria-label="Send"><Send size={16} /></button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
