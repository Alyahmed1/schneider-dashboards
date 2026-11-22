import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles, X } from "lucide-react";
import { MINISTRIES, MINISTRY_BY_ID, MINISTRY_SCORE, type Go, type MinistryId } from "./data";
import { useLive, useSupply, waiting } from "./live";
import { STATIONS } from "./stations";
import "./pages.css";

interface Msg { who: "me" | "bot"; text: string; link?: { label: string; to: Parameters<Go>[0]; id?: string } }

const SUGGEST = ["How much water do we supply?", "What needs attention?", "How much do we lose?", "What if the Nile drops?", "Which ministry is behind?", "Tell me about El Hamam"];

/** a small rule-based assistant that answers from the same live numbers as the pages (no outside service) */
function useAnswer() {
  const { alarms } = useLive();
  const sup = useSupply();
  return (q: string): Msg => {
    const s = q.toLowerCase();
    const has = (...w: string[]) => w.some((x) => s.includes(x));
    const bot = (text: string, link?: Msg["link"]): Msg => ({ who: "bot", text, link });
    const mid = (["mwri", "mhuuc", "eeaa", "moalr"] as MinistryId[]).find((m) => s.includes(m));
    if (mid) {
      const m = MINISTRY_BY_ID[mid], sc = MINISTRY_SCORE[mid], mine = STATIONS.filter((x) => x.ministry === mid), ok = mine.filter((x) => x.status === "good").length;
      return bot(`${m.name}: score ${sc.score}, ${ok} of ${mine.length} stations on track. Main issue: ${sc.issue}.`, { label: `Open ${m.short}`, to: "ministry", id: mid });
    }
    if (has("hamam")) return bot("El Hamam is the farm-water reuse station in Ismailia, owned by MoALR. It takes about 1.04 M m³/day in and sends 1.00 to farms. The page has a 3D plant and a 7-step walkthrough.", { label: "Open El Hamam", to: "station", id: "hamam" });
    if (has("drought", "nile", "shortage")) {
      const low = (sup.sea + sup.river * 0.75 + sup.wells).toFixed(1), dr = (sup.sea + sup.river * 0.85 + sup.wells * 0.95).toFixed(1);
      return bot(`In a drought supply falls to about ${dr} M m³/day, in a low-Nile year to ${low}, against a demand of 17.5. The Water Balance page shows both, with ideas to close the gap.`, { label: "Open Water Balance", to: "balance" });
    }
    if (has("balance", "in and out")) return bot("Every cubic metre is accounted for: 17.5 in = 4.1 reused + 5.3 returned to nature + 4.4 used up + 3.7 lost. Difference 0.0.", { label: "Open Water Balance", to: "balance" });
    if (has("alert", "alarm", "attention", "problem", "critical", "issue", "wrong")) {
      const w = waiting(alarms).sort((a, b) => a.priority - b.priority || b.at - a.at);
      const top = w.slice(0, 3).map((a) => `${a.comment} (${a.name})`).join("; ");
      return bot(`${w.length} alarms are waiting, ${w.filter((a) => a.sev === "critical").length} critical. Top: ${top}.`, { label: "Open Alerts & Events", to: "alerts" });
    }
    if (has("loss", "lost", "leak")) return bot("Networks lose 24% of the drinking water, 3.7 M m³/day. At EGP 4.8 per m³ that is about EGP 6.5 bn a year. Fixing Zone 4 in Greater Cairo alone would save about 0.3 M m³/day.", { label: "Open Water Cycle", to: "cycle" });
    if (has("reuse", "recycl")) return bot("Reuse is 4.1 M m³/day, 23% of supply: 2.0 from homes, 0.6 from industry, 1.5 from farms. The target is 30% by 2028.", { label: "Open Sustainability", to: "sustainability" });
    if (has("cost", "price", "egp", "money", "budget")) return bot("Operating cost is EGP 4.8 per m³ and 78% of it is recovered (target 90%). Energy costs EGP 8.6 bn a year. Reuse and smart irrigation save EGP 3.4 bn a year.", { label: "Open Executive View", to: "executive" });
    if (has("co2", "emission", "energy", "green", "sustain")) return bot("CO₂ avoided is about 310 t/day. Sector emissions are down 12% against a 20% target for 2030, and the renewable share is 18% against 35%.", { label: "Open Sustainability", to: "sustainability" });
    if (has("behind", "worst", "lowest", "weak")) {
      const w = [...MINISTRIES].sort((a, b) => MINISTRY_SCORE[a.id].score - MINISTRY_SCORE[b.id].score)[0];
      const bad = STATIONS.filter((x) => x.status === "bad").map((x) => x.name).join(", ");
      return bot(`${w.short} has the lowest score (${MINISTRY_SCORE[w.id].score}): ${MINISTRY_SCORE[w.id].issue}. Stations that are behind: ${bad}.`, { label: "Open Performance", to: "performance" });
    }
    if (has("best", "top", "leading")) {
      const b = [...MINISTRIES].sort((a, c) => MINISTRY_SCORE[c.id].score - MINISTRY_SCORE[a.id].score)[0];
      return bot(`${b.short} leads with a score of ${MINISTRY_SCORE[b.id].score}.`, { label: "Open Performance", to: "performance" });
    }
    if (has("supply", "water do we", "how much water", "total")) return bot(`Total supply is ${sup.total.toFixed(1)} M m³/day right now: sea ${sup.sea.toFixed(1)}, Nile ${sup.river.toFixed(1)}, wells ${sup.wells.toFixed(1)}. It serves about 115 M people. These numbers update every 10 seconds.`, { label: "Open Water Cycle", to: "cycle" });
    return bot("I can answer about supply, losses, reuse, alerts, cost, a ministry (say MWRI, MHUUC, EEAA or MoALR), a drought, the water balance and El Hamam. Try one of the buttons.");
  };
}

export default function Assistant({ go, open, setOpen }: { go: Go; open: boolean; setOpen: (v: boolean) => void }) {
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ who: "bot", text: "Hello, I am the national assistant. Ask me about water supply, alerts, losses, reuse or a ministry. I answer from the same live numbers as the pages." }]);
  const answer = useAnswer();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, open]);
  const ask = (q: string) => {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { who: "me", text: q }]);
    setText("");
    window.setTimeout(() => setMsgs((m) => [...m, answer(q)]), 350);
  };
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div className="as-panel" role="dialog" aria-label="National assistant" initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }} transition={{ duration: 0.2 }}>
            <header><i><Sparkles size={16} /></i><b>National assistant</b><span>simulated data</span><button onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button></header>
            <div className="as-log">
              {msgs.map((m, i) => (
                <div key={i} className={`as-msg ${m.who}`}>
                  <p>{m.text}</p>
                  {m.link && <button onClick={() => { go(m.link!.to, m.link!.id); setOpen(false); }}>{m.link.label}</button>}
                </div>
              ))}
              <div ref={end} />
            </div>
            <div className="as-sug">{SUGGEST.map((s) => <button key={s} onClick={() => ask(s)}>{s}</button>)}</div>
            <form onSubmit={(e) => { e.preventDefault(); ask(text); }}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about the water sector" aria-label="Your question" />
              <button type="submit" aria-label="Send"><Send size={16} /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
</>
  );
}
