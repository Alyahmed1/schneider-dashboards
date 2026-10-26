import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useStoryCmd } from "./storytour";
import { Bot, CarFront, ClipboardList, DoorOpen, Gauge, MapPin, Send, TicketCheck, type LucideIcon } from "lucide-react";
import MasterMap from "./MasterMap";
import { SUGGESTIONS, reply, type Card, type Focus } from "./assistantengine";
import { FULL_BOX, GATES, LOTS, asPath, boxOf, zoneBox, zoneById } from "./plan";
import { inDays, useWorkOrders } from "./workorders";
import { useViewBox } from "./zoom";
import { Panel, REDUCE, useGrow } from "./ui";

interface Msg { id: number; role: "user" | "bot"; text: string; card?: Card }

/** an answer that writes itself out, then shows its card */
function Typed({ text, onDone, onTick }: { text: string; onDone: () => void; onTick: () => void }) {
  const [n, setN] = useState(REDUCE ? text.length : 0);
  const done = useRef(false);
  useEffect(() => {
    onTick();
    if (n >= text.length) { if (!done.current) { done.current = true; onDone(); } return; }
    const id = window.setTimeout(() => setN((v) => v + Math.max(1, Math.ceil(text.length / 80))), 16);
    return () => window.clearTimeout(id);
  }, [n, text]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{text.slice(0, n)}</>;
}

function CardView({ c }: { c: Card }) {
  if (c.t === "parking") return (
    <div className="ac parking"><b>{c.lot.name}</b><span>{c.free} free of {c.lot.cap}</span>
      <em><u style={{ width: `${c.occ * 100}%`, background: c.occ > 0.9 ? "var(--bad)" : c.occ > 0.7 ? "var(--warn)" : "var(--good)" }} /></em>
      <small>Enter by the {c.gate} · about {c.eta} {c.eta === 1 ? "minute" : "minutes"} by car</small></div>
  );
  if (c.t === "gates") return (
    <div className="ac gates">{c.rows.map((r) => <div key={r.id} className={r.best ? "best" : ""}><b>{r.id}</b><span>{r.name}</span><i>{r.cars} cars</i><u>{r.wait} min</u></div>)}</div>
  );
  if (c.t === "zone") return (
    <div className="ac zone"><b>{c.name}</b><span>{c.feddan} feddan</span><small>{c.mw.toFixed(1)} MW now · {Math.round(c.water)} m³/h water</small></div>
  );
  if (c.t === "pass") return (
    <div className="ac pass">
      <svg viewBox="0 0 11 11" shapeRendering="crispEdges" aria-label="Visitor pass code">{c.grid.map((row, y) => row.map((on, x) => on && <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />))}</svg>
      <div><b>{c.name}</b><span>{c.code}</span><small>{c.when}</small><small>{c.gate}</small></div>
    </div>
  );
  if (c.t === "issue") return <div className="ac issue"><b>{c.wo}</b><span>{c.text}</span><small>Sent to maintenance · you will see it in Assets</small></div>;
  return <div className="ac stats">{c.items.map((i) => <div key={i.label}><b>{i.value}</b><span>{i.label}</span></div>)}</div>;
}

const TILES: { icon: LucideIcon; label: string; ask: string }[] = [
  { icon: CarFront, label: "Find parking", ask: "Where can I park?" },
  { icon: DoorOpen, label: "Fastest gate", ask: "Which gate is quickest right now?" },
  { icon: TicketCheck, label: "Visitor pass", ask: "Create a visitor pass for Omar" },
  { icon: ClipboardList, label: "Report a problem", ask: "Report a problem" },
  { icon: MapPin, label: "Find a place", ask: "Where is the golf course?" },
  { icon: Gauge, label: "Usage today", ask: "How much water are we using?" },
];

/** Assistant: a resident chat and self-service portal; every answer also moves the map */
export default function Assistant() {
  const grow = useGrow(250);
  const { add } = useWorkOrders();
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: "bot", text: "Hello, I'm the Telal West assistant. Ask me about parking, gates, places, visitor passes, or tell me about a problem." }]);
  const [typing, setTyping] = useState(false);
  const [shown, setShown] = useState<Record<number, boolean>>({});
  const [pending, setPending] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [text, setText] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const seq = useRef(1);
  const scroll = () => { if (list.current) list.current.scrollTop = list.current.scrollHeight; };

  const send = (raw: string) => {
    const q = raw.trim();
    if (!q || typing) return;
    setMsgs((m) => [...m, { id: seq.current++, role: "user", text: q }]);
    setText("");
    setTyping(true);
    window.setTimeout(() => {
      const hour = new Date().getHours() + new Date().getMinutes() / 60;
      const r = reply(q, { hour, pendingIssue: pending, createOrder: (title) => add({ title: `Resident request: ${title}`, priority: "Medium", due: inDays(1), source: "Resident request" }) });
      setPending(r.ask === "issue");
      setFocus(r.focus ?? null);
      setMsgs((m) => [...m, { id: seq.current++, role: "bot", text: r.text, card: r.card }]);
      setTyping(false);
    }, 650);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); send(text); };
  useStoryCmd((c, a) => { if (c === "ai:ask" && a) send(a); });

  useEffect(scroll, [msgs, typing, shown]);

  const box = useMemo(() => (focus?.zone ? zoneBox(zoneById(focus.zone)) : focus?.route ? boxOf(focus.route) : FULL_BOX), [focus]);
  const vb = useViewBox(box);
  const lot = LOTS.find((l) => l.id === focus?.lot);
  const gate = GATES.find((g) => g.id === focus?.gate);

  return (
    <div className="as-chat">
      <Panel title="Resident assistant" className="chat" i={0} aside={<span className="loc-tag">demo · answers from live sample data</span>}>
        <div className="msgs" ref={list} aria-live="polite">
          {msgs.map((m, i) => (
            <div key={m.id} className={`msg ${m.role}`}>
              {m.role === "bot" && <span className="av"><Bot size={15} /></span>}
              <div className="bub">
                {m.role === "bot" && i === msgs.length - 1 && !shown[m.id]
                  ? <Typed text={m.text} onTick={scroll} onDone={() => setShown((s) => ({ ...s, [m.id]: true }))} />
                  : m.text}
                {m.card && (i < msgs.length - 1 || shown[m.id]) && <CardView c={m.card} />}
              </div>
            </div>
          ))}
          {typing && <div className="msg bot"><span className="av"><Bot size={15} /></span><div className="bub dots" aria-label="Typing"><i /><i /><i /></div></div>}
        </div>
        <div className="sugg">{SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => send(s)} disabled={typing}>{s}</button>)}</div>
        <form className="composer" onSubmit={submit}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={pending ? "Describe the problem and where it is" : "Ask about parking, gates, places, passes…"} aria-label="Message" />
          <button className="primary" type="submit" disabled={typing || !text.trim()}><Send size={14} /> Send</button>
        </form>
      </Panel>

      <div className="side">
        <Panel title="On the plan" className="grow" i={1} aside={focus ? <button className="chip" onClick={() => setFocus(null)}>Whole plan</button> : undefined}>
          <div className="map-wrap">
            <MasterMap muted grow={grow} viewBox={vb} fills={focus?.zone ? { [focus.zone]: "var(--gold)" } : undefined}>
              {focus?.route && <g className="route" aria-hidden><path className="route-line" d={asPath(focus.route)} /><circle r="6" className="route-dot"><animateMotion dur="3.2s" repeatCount="indefinite" path={asPath(focus.route)} /></circle></g>}
              {lot && <g className="lot on" transform={`translate(${lot.at[0]} ${lot.at[1]})`}><circle className="halo" r="26" /><circle className="lot-bg" r="16" /><text y="4.5" textAnchor="middle">P</text></g>}
              {gate && <g className="gate" transform={`translate(${gate.at[0]} ${gate.at[1]})`}><circle className="halo" r="22" style={{ fill: "none", stroke: "var(--gold)", strokeWidth: 2 }} /><rect x="-12" y="-12" width="24" height="24" rx="6" /><text y="5" textAnchor="middle">{gate.id}</text></g>}
            </MasterMap>
          </div>
        </Panel>
        <Panel title="Self-service" i={2}>
          <div className="tiles2">
            {TILES.map((t) => <button key={t.label} onClick={() => send(t.ask)} disabled={typing}><t.icon size={18} /><span>{t.label}</span></button>)}
          </div>
          <p className="map-note">Demo mode: the assistant writes its answers from this dashboard's live sample numbers. A production version would give the same data to a language model as tools, so it can answer anything the plan, traffic, parking and maintenance systems know.</p>
        </Panel>
      </div>
    </div>
  );
}
