import { useMemo, useState } from "react";
import { useStoryCmd } from "./storytour";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bell, Camera, Car, ClipboardPlus, Clock, EyeOff, ScanEye, Users, type LucideIcon } from "lucide-react";
import MasterMap from "./MasterMap";
import CameraFeed from "./CameraFeed";
import { CAMS, CLS_LABEL, EVENTS, timeAgo, type Cam, type Cls } from "./camdata";
import { inDays, useWorkOrders } from "./workorders";
import { useTick, wobble } from "./live";
import { CountUp, Panel, useGrow } from "./ui";

const g = (h: number, mu: number, s: number) => Math.exp(-Math.pow(Math.min(Math.abs(h - mu), 24 - Math.abs(h - mu)), 2) / (2 * s * s));
/** people and vehicles seen across the community at an hour of the day (sample) */
const people = (h: number) => 380 * (0.12 + 0.55 * g(h, 18.5, 4.2) + 0.3 * g(h, 9, 2));
const vehicles = (h: number) => 120 * (0.1 + 0.7 * g(h, 8, 1.5) + 0.8 * g(h, 18, 2.2));
const TIP = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 };

/** a viewing cone on the plan for a camera */
const cone = (c: Cam, r = 70, half = 28) => {
  const a0 = ((c.dir - half) * Math.PI) / 180, a1 = ((c.dir + half) * Math.PI) / 180;
  return `M${c.at[0]} ${c.at[1]} L${c.at[0] + r * Math.cos(a0)} ${c.at[1] + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${c.at[0] + r * Math.cos(a1)} ${c.at[1] + r * Math.sin(a1)} Z`;
};

/** Safety: AI video analytics. A control room of simulated cameras with detections, events, and counts that never need a face. */
export default function Safety({ focus }: { focus?: string }) {
  const t = useTick();
  const grow = useGrow(250);
  const { add } = useWorkOrders();
  const [sel, setSel] = useState<string>(() => (CAMS.some((c) => c.id === focus) ? (focus as string) : "C2"));
  useStoryCmd((c, a) => { if (c === "sf:cam" && a) setSel(a); });
  const [detect, setDetect] = useState(true);
  const [privacy, setPrivacy] = useState(true);
  const [made, setMade] = useState<Record<string, string>>({});
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const cam = CAMS.find((c) => c.id === sel) ?? CAMS[1];
  const online = CAMS.filter((c) => c.kind !== "offline").length;
  const ppl = Math.round(wobble(people(hour), 3, t, 0.01)), veh = Math.round(wobble(vehicles(hour), 4, t, 0.01));
  const events = EVENTS.filter((e) => e.minsAgo >= 0);

  const counts = useMemo(() => {
    const c: Partial<Record<Cls, number>> = {};
    cam.objs.forEach((o) => { c[o.cls] = (c[o.cls] ?? 0) + 1; });
    return c;
  }, [cam]);

  const series = useMemo(() => Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, "0")}:00`, people: Math.round(people(h)), vehicles: Math.round(vehicles(h)) })), []);

  const kpis: { icon: LucideIcon; label: string; v: number; s: string }[] = [
    { icon: Camera, label: `Cameras online of ${CAMS.length}`, v: online, s: "" },
    { icon: Users, label: "People seen now", v: ppl, s: "" },
    { icon: Car, label: "Vehicles seen now", v: veh, s: "" },
    { icon: Bell, label: "Events today", v: events.length, s: "" },
    { icon: Clock, label: "Average response", v: 2.4, s: " min" },
  ];

  const raise = (id: string, camId: string, text: string, sev: string) => {
    const c = CAMS.find((x) => x.id === camId);
    const wo = add({ title: `Check ${c?.name ?? camId}: ${text}`, priority: sev === "bad" ? "High" : "Medium", due: inDays(1), source: "Camera event" });
    setMade((m) => ({ ...m, [id]: wo }));
  };

  return (
    <div className="sf-grid">
      <div className="ut-kpis five">
        {kpis.map((k, i) => (
          <div className="kpi" key={k.label} style={{ ["--n" as string]: i }}>
            <k.icon size={16} /><span>{k.label}</span><b><CountUp value={k.v} decimals={k.s === " min" ? 1 : 0} suffix={k.s} ms={700} /></b>
          </div>
        ))}
      </div>

      <Panel title="Live view" className="sf-live" i={0} aside={
        <div className="map-tools">
          <button className={`chip ${detect ? "on" : ""}`} aria-pressed={detect} onClick={() => setDetect(!detect)}><ScanEye size={13} /> Detections</button>
          <button className={`chip ${privacy ? "on" : ""}`} aria-pressed={privacy} onClick={() => setPrivacy(!privacy)}><EyeOff size={13} /> Privacy mode</button>
        </div>
      }>
        <div className="feedbox"><CameraFeed key={cam.id} cam={cam} detect={detect} privacy={privacy} /></div>
        <div className="sf-info">
          <b>{cam.id} · {cam.name}</b>
          {cam.kind === "offline" ? <span className="pill bad">Offline</span> : cam.kind === "density" ? <span>Crowd density from the drone view; no individuals tracked.</span> :
            <span>{Object.entries(counts).map(([k, n]) => `${n} ${CLS_LABEL[k as Cls].toLowerCase()}${n! > 1 ? "s" : ""}`).join(", ")} in view</span>}
        </div>
        <div className="thumbs" role="list">
          {CAMS.map((c) => (
            <button key={c.id} role="listitem" className={c.id === sel ? "on" : ""} onClick={() => setSel(c.id)} aria-label={`${c.id} ${c.name}`} aria-pressed={c.id === sel}>
              <CameraFeed cam={c} detect={detect} privacy={privacy} small />
            </button>
          ))}
        </div>
        <p className="map-note">{privacy ? "Privacy mode is on: boxes hide detail and only counts are kept; no faces or number plates are stored." : "Privacy mode is off for this demo view."} The views are pictures from the brief and the detections are simulated.</p>
      </Panel>

      <div className="side">
        <Panel title="Cameras on the plan" className="grow" i={1}>
          <div className="map-wrap">
            <MasterMap muted grow={grow} viewBox="250 180 600 640">
              {CAMS.map((c) => (
                <g key={c.id} className={`cm ${c.kind === "offline" ? "off" : ""} ${c.id === sel ? "on" : ""}`} tabIndex={0} role="button" aria-label={`${c.id} ${c.name}`} onClick={() => setSel(c.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(c.id); } }}>
                  {c.kind !== "offline" && <path className="cone" d={cone(c)} />}
                  <g transform={`translate(${c.at[0]} ${c.at[1]})`}><circle r="12" /><text y="3.5" textAnchor="middle">{c.id.slice(1)}</text></g>
                  <title>{`${c.id} ${c.name}`}</title>
                </g>
              ))}
            </MasterMap>
          </div>
        </Panel>

        <Panel title="Events today" className="grow" i={2} aside={<span className="loc-tag">{events.length} events</span>}>
          <ul className="events">
            {events.map((e) => (
              <li key={e.id} className={e.cam === sel ? "on" : ""}>
                <i className={`sev ${e.sev}`} />
                <div>
                  <button className="etxt" onClick={() => setSel(e.cam)}>{e.text}</button>
                  <small>{timeAgo(e.minsAgo)} · {e.cam} {CAMS.find((c) => c.id === e.cam)?.name}</small>
                </div>
                {made[e.id] ? <span className="pill good">{made[e.id]}</span> : <button className="chip" onClick={() => raise(e.id, e.cam, e.text, e.sev)} title="Create a work order for this event"><ClipboardPlus size={12} /> Work order</button>}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="People and vehicles by hour" i={3}>
          <div className="fc-chart" aria-label="People and vehicles seen across the community through the day">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--line-2)" vertical={false} />
                <XAxis dataKey="label" interval={5} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={34} />
                <Tooltip contentStyle={TIP} />
                <Area dataKey="people" name="People" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.25} isAnimationActive={grow} />
                <Line dataKey="vehicles" name="Vehicles" stroke="var(--water)" strokeWidth={2} dot={false} isAnimationActive={grow} />
                <ReferenceLine x={`${String(Math.floor(hour)).padStart(2, "0")}:00`} stroke="var(--gold)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
