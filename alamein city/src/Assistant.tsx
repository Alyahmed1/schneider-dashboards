import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, Send, User } from "lucide-react";
import { answer, SUGGESTIONS, type Reply } from "./engine";
import { useCity } from "./model";
import { useAlerts, useFilters, zoneName } from "./state";
import { useRoad } from "./road";
import type { TabId } from "./data";
import { Panel } from "./ui";

interface Msg { from: "me" | "bot"; text: string; goto?: Reply["goto"] }

export default function Assistant({ go }: { go: (t: TabId) => void }) {
  const m = useCity();
  const { alerts } = useAlerts();
  const { zone } = useFilters();
  const road = useRoad();
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "Hello, I am the New Alamein COC assistant. Ask me about the BoQ, the city numbers, the North Coast road or the live status. I work from the Excel quantities and the dashboard's sample readings." }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, busy]);

  const ask = (q: string) => {
    const t = q.trim();
    if (!t || busy) return;
    setMsgs((p) => [...p, { from: "me", text: t }]);
    setText(""); setBusy(true);
    window.setTimeout(() => {
      const r = answer(t, { m, alerts, zoneLabel: zoneName(zone), road });
      setMsgs((p) => [...p, { from: "bot", ...r }]);
      setBusy(false);
    }, 450);
  };

  return (
    <div className="tab tab-chat">
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gridTemplateRows: "minmax(0,1fr)" }}>
        <Panel i={0} title="Assistant" aside={<span className="muted">rule-based · answers from your data</span>} className="chat">
          <div className="msgs">
            {msgs.map((x, i) => (
              <div key={i} className={`msg ${x.from}`}>
                <span className="av">{x.from === "bot" ? <Bot size={15} /> : <User size={15} />}</span>
                <div className="bubble">{x.text.split("\n").map((l, k) => <p key={k}>{l}</p>)}
                  {x.goto && <button className="btn go" onClick={() => go(x.goto!.tab)}>Open {x.goto.label} <ArrowRight size={13} /></button>}
                </div>
              </div>
            ))}
            {busy && <div className="msg bot"><span className="av"><Bot size={15} /></span><div className="bubble typing"><i /><i /><i /></div></div>}
            <div ref={end} />
          </div>
          <form className="composer" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about poles, meters, alerts, the North Coast road..." aria-label="Ask the assistant" />
            <button className="send" type="submit" aria-label="Send" disabled={!text.trim() || busy}><Send size={16} /></button>
          </form>
        </Panel>
        <Panel i={1} title="Try asking" className="grow">
          <ul className="sugg scroll">{SUGGESTIONS.map((s) => <li key={s}><button onClick={() => ask(s)}>{s}</button></li>)}</ul>
        </Panel>
      </div>
    </div>
  );
}
