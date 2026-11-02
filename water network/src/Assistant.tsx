import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Send, Sparkles, X } from "lucide-react";
import { ask, SUGGESTED, type Answer } from "./askengine";
import type { Metric } from "./mapcolor";

interface Msg { who: "me" | "bot"; text: string; show?: Answer["show"]; chips?: string[] }
export type MapPreset = { hour: number; metric: Metric; n: number };

/** A small chat assistant. Free and offline: it answers from the same network model as the screens, in the browser. */
export default function Assistant({ open, onClose, onShow }: { open: boolean; onClose: () => void; onShow: (p: MapPreset) => void }) {
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ who: "bot", text: "Hi, I'm the network assistant. Ask me about consumption, leakage, pressure or what to fix first.", chips: SUGGESTED }]);
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
      setMsgs((m) => [...m, { who: "bot", text: a.text, show: a.show, chips: a.chips }]);
      setBusy(false);
    }, 450);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section className="as-panel" role="dialog" aria-label="Network assistant" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
            <header>
              <Sparkles size={16} />
              <div><b>Network assistant</b><small>Demo · runs in your browser, free</small></div>
              <button onClick={onClose} aria-label="Close the assistant"><X size={16} /></button>
            </header>
            <div className="as-log" aria-live="polite">
              {msgs.map((m, i) => (
                <div key={i} className={`as-msg ${m.who}`}>
                  <p>{m.text}</p>
                  {m.show && <button className="as-go" onClick={() => { onShow({ hour: m.show!.hour, metric: m.show!.metric, n: Date.now() }); if (window.matchMedia("(max-width: 900px)").matches) onClose(); }}><MapPin size={13} /> {m.show.label}</button>}
                  {m.who === "bot" && m.chips && i === msgs.length - 1 && <div className="as-chips">{m.chips.map((c) => <button key={c} onClick={() => send(c)}>{c}</button>)}</div>}
                </div>
              ))}
              {busy && <div className="as-msg bot"><p className="as-dots"><i /><i /><i /></p></div>}
              <div ref={end} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(text); }}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about the network…" aria-label="Your question" autoFocus />
              <button type="submit" disabled={!text.trim() || busy} aria-label="Send"><Send size={16} /></button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
