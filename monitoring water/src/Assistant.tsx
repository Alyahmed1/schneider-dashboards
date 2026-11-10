import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { answer, SUGGESTIONS } from "./ask";
import type { Fleet } from "./model";
import type { PivotId } from "./pivots";

interface Msg { from: "me" | "bot"; text: string }

/** side panel inside the stage (never over the header); answers from the live state and is scoped to the pivot on screen */
export default function Assistant({ open, onClose, fleet, scope, detail }: { open: boolean; onClose: () => void; fleet: Fleet; scope: PivotId; detail: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "Hi, I can tell you about status, alerts, water use, soil moisture, tanks and schedules. Tap a suggestion or type a question." }]);
  const [q, setQ] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, open]);
  useEffect(() => { if (open) inp.current?.focus(); }, [open]);
  if (!open) return null;

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMsgs((m) => [...m, { from: "me", text: t }, { from: "bot", text: answer(t, fleet, scope) }]);
    setQ("");
  };
  return (
    <aside className="asst" aria-label="Assistant">
      <header>
        <h3><Bot size={19} className="sym" />Assistant<em>{detail ? `Pivot ${scope}` : "All pivots"}</em></h3>
        <button className="mdl-x" onClick={onClose} aria-label="Close the assistant"><X size={20} /></button>
      </header>
      <div className="as-msgs">
        {msgs.map((m, i) => <p key={i} className={m.from}>{m.text}</p>)}
        <div ref={end} />
      </div>
      <div className="as-sug">{SUGGESTIONS.map((s) => <button key={s} onClick={() => send(detail ? s : `${s} all`)}>{s}</button>)}</div>
      <form onSubmit={(e) => { e.preventDefault(); send(q); }}>
        <input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about a pivot…" aria-label="Your question" />
        <button type="submit" className="btn pri" aria-label="Send"><Send size={17} /></button>
      </form>
    </aside>
  );
}
