import { createContext, useContext, useId, type ReactNode } from "react";
import { equipKey, useEquip } from "./Equip";

export type TagState = "Running" | "Standby" | "Alarm" | "Normal";
export interface Row { label: string; value: number | string; unit?: string; d?: number }
export interface TagDef {
  id: string; tag: string; name: string; x: number; y: number; // x, y in the 800 × 450 picture
  show?: { v: number; unit: string; d?: number };
  kind?: "pump" | "valve"; state: TagState; load?: number; rows: Row[]; special?: "trains" | "quality"; note?: string;
}
export interface Scene { Art: () => ReactNode; tags: TagDef[] }

/** the stage a drawing belongs to, so a pump knows which operator switch is its own */
const StageCtx = createContext("");
function withStage(id: string, Comp: () => ReactNode) {
  return function Staged() { return <StageCtx.Provider value={id}>{Comp()}</StageCtx.Provider>; };
}

/** what a pump or valve is doing right now, after the operator's start/stop or on/off */
export function effective(tag: TagDef, stageId: string, on: Record<string, boolean>): { on: boolean; state: TagState } {
  const defaultOn = tag.kind === "valve" ? true : tag.state !== "Standby";
  const isOn = tag.kind ? (on[equipKey(stageId, tag.id)] ?? defaultOn) : true;
  if (tag.kind === "pump") return { on: isOn, state: isOn ? (tag.state === "Alarm" ? "Alarm" : "Running") : "Standby" };
  if (tag.kind === "valve") return { on: isOn, state: isOn ? "Normal" : "Standby" };
  return { on: true, state: tag.state };
}

/** the Overview draws pipes and icons larger than the stage pictures so they stay readable when small */
export const ScaleCtx = createContext({ pipe: 1, icon: 1 });

type Kind = "sea" | "clean" | "brine" | "chem" | "product";

/* ---------- drawing pieces (flat 2D, coloured by theme variables in step7.css) ---------- */
export function Pipe({ d, kind = "sea", flow = true, w: w0 = 9 }: { d: string; kind?: Kind; flow?: boolean; w?: number }) {
  const w = w0 * useContext(ScaleCtx).pipe;
  return (
    <g className={`pipe k-${kind}`}>
      <path d={d} className="pipe-edge" strokeWidth={w + 4} />
      <path d={d} className="pipe-in" strokeWidth={w} />
      {flow && <path d={d} className="pipe-flow" strokeWidth={Math.max(2.4, w - 5)} />}
    </g>
  );
}
export function Pump({ x, y, state = "Running", s = 1, id }: { x: number; y: number; state?: TagState; s?: number; id?: string }) {
  const stage = useContext(StageCtx);
  const eq = useEquip();
  const sc = useContext(ScaleCtx).icon;
  const isOn = id ? (eq.on[equipKey(stage, id)] ?? state !== "Standby") : state !== "Standby";
  state = isOn ? (state === "Standby" ? "Running" : state) : "Standby";
  return (
    <g transform={`translate(${x} ${y}) scale(${s * sc})`} className={`pump st-${state}`}>
      <rect x="-10" y="-42" width="20" height="28" rx="5" className="eq-motor" />
      <rect x="-14" y="-18" width="28" height="6" rx="2" className="eq-motor" />
      <circle r="18" className="eq" />
      <path d="M-6 -9 L10 0 L-6 9 Z" className="eq-mark" />
      {state === "Running" && <circle r="22" className="spin" />}
    </g>
  );
}
export function Tank({ x, y, w, h, level, tone = "clean" }: { x: number; y: number; w: number; h: number; level: number; tone?: Kind }) {
  const id = useId();
  const top = y + h * (1 - level);
  return (
    <g className={`tank k-${tone}`}>
      <clipPath id={id}><rect x={x} y={y} width={w} height={h} rx="10" /></clipPath>
      <rect x={x} y={y} width={w} height={h} rx="10" className="eq" />
      <g clipPath={`url(#${id})`}>
        <rect x={x} y={top} width={w} height={y + h - top} className="liquid" />
        <path className="wave-line" d={`M${x - 40} ${top} q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0`} />
      </g>
      <rect x={x} y={y} width={w} height={h} rx="10" className="eq-line" />
    </g>
  );
}
export function Cyl({ x, y, w, h, bands = 3, alarm = false, spin = false }: { x: number; y: number; w: number; h: number; bands?: number; alarm?: boolean; spin?: boolean }) {
  return (
    <g className={alarm ? "st-Alarm" : ""}>
      <rect x={x} y={y} width={w} height={h} rx={Math.min(w / 2, 16)} className="eq" />
      {Array.from({ length: bands }, (_, i) => <line key={i} x1={x + 6} x2={x + w - 6} y1={y + 18 + ((h - 36) / Math.max(1, bands - 1)) * i} y2={y + 18 + ((h - 36) / Math.max(1, bands - 1)) * i} className="eq-band" />)}
      {spin && <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) / 3} className="spin" />}
    </g>
  );
}
export function Vessel({ x, y, w, h = 22, alarm = false }: { x: number; y: number; w: number; h?: number; alarm?: boolean }) {
  return (
    <g className={alarm ? "st-Alarm" : ""}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} className="eq" />
      {[0.2, 0.4, 0.6, 0.8].map((p) => <line key={p} x1={x + w * p} x2={x + w * p} y1={y + 3} y2={y + h - 3} className="eq-band" />)}
    </g>
  );
}
export function Cap({ x, y, children, a = "middle" }: { x: number; y: number; children: ReactNode; a?: "start" | "middle" | "end" }) {
  return <text x={x} y={y} textAnchor={a} className="sc-cap">{children}</text>;
}
export function Valve({ x, y, id }: { x: number; y: number; id?: string }) {
  const stage = useContext(StageCtx);
  const eq = useEquip();
  const sc = useContext(ScaleCtx).icon;
  const isOn = id ? (eq.on[equipKey(stage, id)] ?? true) : true;
  return <path transform={`translate(${x} ${y}) scale(${sc})`} d="M-8 -8 L8 8 V-8 L-8 8 Z" className={`eq-valve ${isOn ? "" : "closed"}`} />;
}
export const WAVES = "M-900 0 q20 -10 40 0" + " t40 0".repeat(50);

/* ---------- 1. sea intake ---------- */
function Intake() {
  return (
    <g>
      <clipPath id="sc-sea"><rect x="-900" y="-200" width="1140" height="850" /></clipPath>
      <rect x="-900" y="-200" width="1140" height="850" className="sea" />
      <g clipPath="url(#sc-sea)">{[50, 130, 210, 290, 370].map((y, i) => <path key={y} d={WAVES} transform={`translate(0 ${y})`} className="wave-line sea-wave" style={{ animationDelay: `${-i * 0.9}s` }} />)}</g>
      <rect x="236" y="-200" width="26" height="850" className="wall" />
      {[110, 225, 340].map((y) => (
        <g key={y}>
          <rect x="240" y={y - 36} width="18" height="72" rx="4" className="eq" />
          {[-24, -12, 0, 12, 24].map((o) => <line key={o} x1="243" x2="255" y1={y + o} y2={y + o} className="eq-band" />)}
          <Pipe d={`M262 ${y} H360`} />
          <Pipe d={`M400 ${y} H520`} />
          <Valve x={455} y={y} id={y === 110 ? "xv1" : y === 225 ? "xv2" : "xv3"} />
          <Pump x={380} y={y} state={y === 340 ? "Standby" : "Running"} id={y === 110 ? "p1" : y === 225 ? "p2" : "p3"} />
        </g>
      ))}
      <Pipe d="M520 110 V340" w={11} />
      <Pipe d="M520 225 H1700" w={12} />
      <Cap x={120} y={425}>Red Sea</Cap>
      <Cap x={249} y={28}>Screens</Cap>
      <Cap x={650} y={268}>To pre-treatment</Cap>
    </g>
  );
}

/* ---------- 2. pre-treatment ---------- */
function Pre() {
  return (
    <g>
      <Pipe d="M-900 290 H230" />
      <Pipe d="M80 165 V215 H230 V262" kind="chem" />
      <Tank x={40} y={65} w={80} h={100} level={0.6} tone="chem" />
      <Pump x={150} y={130} s={0.8} />
      <rect x="200" y="272" width="60" height="36" rx="6" className="eq" />
      <path d="M208 290 l11 -10 l11 20 l11 -20 l11 20 l8 -10" className="eq-zig" />
      <Pipe d="M260 290 H280" />
      <Tank x={280} y={235} w={110} h={110} level={0.8} tone="sea" />
      <Pipe d="M390 285 H420 V100 H720" />
      {[480, 580, 680].map((x, i) => (
        <g key={x} className={i === 2 ? "st-Alarm" : ""}>
          <Pipe d={`M${x} 100 V150`} w={7} />
          <rect x={x - 42} y="150" width="84" height="172" rx="10" className="eq" />
          <rect x={x - 42} y="150" width="84" height="26" rx="10" className="liquid" />
          <rect x={x - 38} y="236" width="76" height="34" className="media-a" />
          <rect x={x - 38} y="270" width="76" height="40" className="media-b" />
          <Pipe d={`M${x} 322 V370`} kind="clean" w={7} />
        </g>
      ))}
      <Pipe d="M480 370 H1700" kind="clean" />
      <Pump x={745} y={420} s={0.7} state="Standby" id="bw" />
      <Pipe d="M745 402 V378" kind="clean" w={6} />
      <Cap x={80} y={190}>Ferric dosing</Cap>
      <Cap x={335} y={365}>Flocculation</Cap>
      <Cap x={580} y={82}>Gravity filters</Cap>
      <Cap x={640} y={440}>Backwash</Cap>
    </g>
  );
}

/* ---------- 3. HP pumps ---------- */
function Hp() {
  return (
    <g>
      <Pipe d="M-900 225 H62 M62 190 V262 M62 190 H92 M62 262 H162" />
      {[112, 182].map((x, i) => (
        <g key={x}>
          <Cyl x={x - 22} y={150} w={44} h={150} bands={4} alarm={false} />
          <Pipe d={`M${x + 22} ${i ? 262 : 190} H250`} kind="clean" w={7} />
        </g>
      ))}
      <Pipe d="M250 190 V262 M250 225 H300 V400 H640" kind="clean" />
      {[380, 500, 620].map((x, i) => (
        <g key={x}>
          <Pipe d={`M${x} 400 V318`} kind="clean" w={8} />
          <Pipe d={`M${x} 282 V120`} w={9} />
          <Pump x={x} y={300} state={i === 2 ? "Alarm" : "Running"} s={1.15} id={["pa", "pb", "pc"][i]} />
        </g>
      ))}
      <Pipe d="M380 120 H1700" w={12} />
      <Cap x={147} y={325}>Cartridge filters</Cap>
      <Cap x={500} y={438}>Low pressure feed</Cap>
      <Cap x={690} y={106}>High pressure to RO</Cap>
    </g>
  );
}

/* ---------- 4. RO membranes ---------- */
function Ro() {
  const trains = [{ y: 70 }, { y: 180 }, { y: 290 }];
  return (
    <g>
      <Pipe d="M-900 225 H100 M100 82 V372" />
      <Pipe d="M640 346 V54 H1700" kind="clean" w={11} />
      <Pipe d="M680 94 V396 H1700" kind="brine" w={11} />
      {trains.map((t, i) => (
        <g key={t.y}>
          <Pipe d={`M100 ${t.y + 32} H178`} w={8} />
          {[0, 1, 2].map((v) => <Vessel key={v} x={180} y={t.y + v * 30} w={380} h={22} alarm={i === 1} />)}
          <Pipe d={`M560 ${t.y + 24} H640`} kind="clean" w={6} />
          <Pipe d={`M560 ${t.y + 40} H680`} kind="brine" w={6} />
          <Cap x={170} y={t.y + 50} a="end">Train {"ABC"[i]}</Cap>
        </g>
      ))}
      <Tank x={30} y={385} w={70} h={48} level={0.5} tone="chem" />
      <Pipe d="M100 408 H130 V372 H100" kind="chem" w={6} />
      <Cap x={65} y={376}>CIP skid</Cap>
      <Cap x={735} y={42}>Permeate</Cap>
      <Cap x={735} y={414}>Brine</Cap>
    </g>
  );
}

/* ---------- 5. energy recovery ---------- */
function Erd() {
  return (
    <g>
      <Pipe d="M-900 225 H1700" w={9} />
      <Pipe d="M-900 100 H570" kind="brine" w={11} />
      <Pipe d="M295 100 V140 M415 100 V140 M535 100 V140" kind="brine" w={8} />
      <Pipe d="M295 310 V380 H1700 M415 310 V380 M535 310 V380" kind="brine" w={8} />
      {[260, 380, 500].map((x) => (
        <g key={x}>
          <Cyl x={x} y={140} w={70} h={170} bands={0} spin />
          <path d={`M${x + 18} 205 a17 17 0 1 1 34 0`} className="eq-arc" />
          <path d={`M${x + 52} 245 a17 17 0 1 1 -34 0`} className="eq-arc" />
        </g>
      ))}
      <Pump x={690} y={225} s={1.1} id="bp" />
      <Cap x={16} y={78} a="start">High pressure brine in</Cap>
      <Cap x={640} y={402}>Low pressure brine out</Cap>
      <Cap x={150} y={248}>Sea water</Cap>
      <Cap x={690} y={282}>Boosted feed to RO</Cap>
    </g>
  );
}

/* ---------- 6. post-treatment ---------- */
function Post() {
  return (
    <g>
      <Pipe d="M-900 120 H690 V180" kind="clean" w={10} />
      {[185, 325, 485].map((x, i) => (
        <g key={x}>
          <Pipe d={`M${x} 262 V120`} kind="chem" w={6} />
          {i === 0 ? <path d={`M${x - 46} 262 h92 l-14 100 h-64 z`} className="eq" /> : <Cyl x={x - 26} y={262} w={52} h={100} bands={2} />}
        </g>
      ))}
      <rect x="548" y="104" width="64" height="32" rx="6" className="eq" />
      <path d="M556 120 l10 -9 l10 18 l10 -18 l10 18 l6 -9" className="eq-zig" />
      <Tank x={600} y={180} w={170} h={180} level={0.74} tone="product" />
      <Pipe d="M690 360 V420 H1700" kind="product" />
      <Cap x={185} y={386}>Lime</Cap>
      <Cap x={325} y={386}>CO₂</Cap>
      <Cap x={485} y={386}>Chlorine</Cap>
      <Cap x={685} y={376} a="middle">Contact tank</Cap>
      <Cap x={70} y={104} a="start">Permeate from RO</Cap>
    </g>
  );
}

/* ---------- 7. storage ---------- */
function Storage() {
  return (
    <g>
      <Pipe d="M-900 90 H535 V110 M265 90 V110" kind="clean" w={10} />
      <Tank x={170} y={110} w={190} h={250} level={0.72} tone="product" />
      <Tank x={440} y={110} w={190} h={250} level={0.7} tone="product" />
      {[360, 630].map((x) => <g key={x}>{[0.25, 0.5, 0.75].map((p) => <line key={p} x1={x - 14} x2={x - 4} y1={110 + 250 * p} y2={110 + 250 * p} className="eq-band" />)}</g>)}
      <Pipe d="M265 360 V400 H1700 M535 360 V400" kind="product" w={10} />
      <Valve x={690} y={400} id="xv" />
      <Cap x={265} y={385} a="middle">Tank 1</Cap>
      <Cap x={535} y={385} a="middle">Tank 2</Cap>
      <Cap x={16} y={70} a="start">From post-treatment</Cap>
      <Cap x={784} y={440} a="end">To network pumps</Cap>
    </g>
  );
}

/* ---------- 8. network ---------- */
function Net() {
  return (
    <g>
      <path d="M-900 330 H0 Q150 270 300 320 T560 290 T800 330 H1700 V650 H-900 Z" className="hill" />
      <rect x="30" y="250" width="250" height="140" rx="10" className="wall" />
      <Pipe d="M-900 400 H260" kind="product" w={10} />
      {[95, 165, 235].map((x, i) => (
        <g key={x}>
          <Pipe d={`M${x} 400 V347`} kind="product" w={7} />
          <Pipe d={`M${x} 314 V230`} kind="product" w={7} />
          <Pump x={x} y={330} state={i === 2 ? "Standby" : "Running"} id={["p1", "p2", "p3"][i]} />
        </g>
      ))}
      <Pipe d="M95 230 H300 L430 190 H560 L650 170" kind="product" w={11} />
      {[{ x: 662, h: 100 }, { x: 702, h: 70 }, { x: 742, h: 120 }, { x: 780, h: 80 }].map((b) => (
        <g key={b.x}>
          <rect x={b.x - 17} y={330 - b.h} width="34" height={b.h} rx="3" className="eq" />
          {Array.from({ length: Math.floor(b.h / 24) }, (_, i) => <rect key={i} x={b.x - 9} y={330 - b.h + 10 + i * 24} width="6" height="8" className="eq-win" />)}
          {Array.from({ length: Math.floor(b.h / 24) }, (_, i) => <rect key={`r${i}`} x={b.x + 3} y={330 - b.h + 10 + i * 24} width="6" height="8" className="eq-win" />)}
        </g>
      ))}
      <Pipe d="M650 170 H740 V210" kind="product" w={8} />
      <Cap x={155} y={415}>Pump house</Cap>
      <Cap x={730} y={140}>The city</Cap>
    </g>
  );
}

/* ---------- tags: what you can click on each picture ---------- */
const r = (label: string, value: number | string, unit?: string, d = 0): Row => ({ label, value, unit, d });

export const SCENES: Record<string, Scene> = {
  intake: {
    Art: withStage("intake", Intake),
    tags: [
      { id: "ait", tag: "AIT-101", name: "Salinity analyser", x: 120, y: 110, show: { v: 41.2, unit: " g/L", d: 1 }, state: "Normal", rows: [r("Salinity", 41.2, "g/L", 1), r("Conductivity", 58.4, "mS/cm", 1), r("Trend, 24 h", "steady")], note: "Reads the sea water before it enters the plant." },
      { id: "tit", tag: "TIT-101", name: "Sea water temperature", x: 120, y: 225, show: { v: 27.4, unit: " °C", d: 1 }, state: "Normal", rows: [r("Temperature", 27.4, "°C", 1), r("Daily change", "+0.3", "°C"), r("Effect on energy", "low")] },
      { id: "pdt", tag: "PDT-101", name: "Screen differential pressure", x: 120, y: 340, show: { v: 0.12, unit: " bar", d: 2 }, state: "Normal", rows: [r("Screen ΔP", 0.12, "bar", 2), r("Alarm at", 0.4, "bar", 1), r("Last cleaned", "2 days ago")], note: "A rising value means the screens need cleaning." },
      { id: "p1", tag: "P-101A", kind: "pump", name: "Intake pump 1", x: 380, y: 52, show: { v: 82, unit: "%" }, state: "Running", load: 82, rows: [r("Speed", 82, "%"), r("Flow", 3720, "m³/h"), r("Power", 780, "kW"), r("Vibration", 2.1, "mm/s", 1)] },
      { id: "p2", tag: "P-101B", kind: "pump", name: "Intake pump 2", x: 380, y: 167, show: { v: 80, unit: "%" }, state: "Running", load: 80, rows: [r("Speed", 80, "%"), r("Flow", 3680, "m³/h"), r("Power", 765, "kW"), r("Vibration", 2.3, "mm/s", 1)] },
      { id: "p3", tag: "P-101C", kind: "pump", name: "Intake pump 3", x: 380, y: 282, show: { v: 0, unit: "%" }, state: "Standby", load: 0, rows: [r("Speed", 0, "%"), r("Ready to start", "Yes"), r("Hours run", 4120, "h")], note: "Standby unit. Starts automatically if another pump trips." },
      { id: "xv1", tag: "XV-101A", name: "Intake valve 1", kind: "valve", x: 455, y: 78, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "xv2", tag: "XV-101B", name: "Intake valve 2", kind: "valve", x: 455, y: 193, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "xv3", tag: "XV-101C", name: "Intake valve 3", kind: "valve", x: 455, y: 308, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "fit", tag: "FIT-101", name: "Intake flow", x: 660, y: 190, show: { v: 11100, unit: " m³/h" }, state: "Normal", rows: [r("Flow", 11100, "m³/h"), r("Target", 11200, "m³/h"), r("Today", 266400, "m³")] },
    ],
  },
  pre: {
    Art: withStage("pre", Pre),
    tags: [
      { id: "dos", tag: "DOS-201", name: "Ferric dosing", x: 80, y: 42, show: { v: 55, unit: "%" }, state: "Running", load: 55, rows: [r("Dose", 3.2, "mg/L", 1), r("Tank level", 62, "%"), r("Pump stroke", 55, "%")] },
      { id: "flc", tag: "FLC-201", name: "Flocculation tank", x: 335, y: 220, show: { v: 0.31, unit: " NTU", d: 2 }, state: "Normal", rows: [r("Turbidity out", 0.31, "NTU", 2), r("Mixing time", 18, "min"), r("Level", 80, "%")] },
      { id: "f1", tag: "FLT-1", name: "Gravity filter 1", x: 480, y: 133, show: { v: 71, unit: "%" }, state: "Running", load: 71, rows: [r("Clogging", 71, "%"), r("Filter ΔP", 0.52, "bar", 2), r("Last backwash", "9 h ago")] },
      { id: "f2", tag: "FLT-2", name: "Gravity filter 2", x: 580, y: 133, show: { v: 74, unit: "%" }, state: "Running", load: 74, rows: [r("Clogging", 74, "%"), r("Filter ΔP", 0.58, "bar", 2), r("Last backwash", "7 h ago")] },
      { id: "f3", tag: "FLT-3", name: "Gravity filter 3", x: 680, y: 133, show: { v: 96, unit: "%" }, state: "Alarm", load: 96, rows: [r("Clogging", 96, "%"), r("Filter ΔP", 0.84, "bar", 2), r("Last backwash", "31 h ago")], note: "Backwash is due. Work order WO-2421 is in progress." },
      { id: "sdi", tag: "AIT-202", name: "SDI analyser", x: 425, y: 405, show: { v: 2.9, unit: "", d: 1 }, state: "Normal", rows: [r("SDI", 2.9, "", 1), r("Limit", 3, "", 1), r("Turbidity", 0.31, "NTU", 2)], note: "Below 3 protects the RO membranes." },
      { id: "bw", tag: "P-205", kind: "pump", name: "Backwash pump", x: 745, y: 385, show: { v: 0, unit: "%" }, state: "Standby", load: 0, rows: [r("State", "Standby"), r("Next backwash", "FLT-3, now")] },
    ],
  },
  hp: {
    Art: withStage("hp", Hp),
    tags: [
      { id: "cfa", tag: "CF-301A", name: "Cartridge filter A", x: 95, y: 130, show: { v: 0.6, unit: " bar", d: 1 }, state: "Normal", rows: [r("Filter ΔP", 0.6, "bar", 1), r("Change at", 1.2, "bar", 1), r("In service", 21, "days")] },
      { id: "cfb", tag: "CF-301B", name: "Cartridge filter B", x: 200, y: 104, show: { v: 0.7, unit: " bar", d: 1 }, state: "Normal", rows: [r("Filter ΔP", 0.7, "bar", 1), r("Change at", 1.2, "bar", 1), r("In service", 23, "days")] },
      { id: "pit", tag: "PIT-301", name: "HP suction pressure", x: 300, y: 300, show: { v: 2.6, unit: " bar", d: 1 }, state: "Normal", rows: [r("Pressure", 2.6, "bar", 1), r("Minimum", 1.5, "bar", 1)] },
      { id: "pa", tag: "P-301A", kind: "pump", name: "HP pump A", x: 380, y: 245, show: { v: 85, unit: "%" }, state: "Running", load: 85, rows: [r("Speed", 85, "%"), r("Discharge", 58.2, "bar", 1), r("Efficiency", 88.1, "%", 1), r("Power", 3050, "kW")] },
      { id: "pb", tag: "P-301B", kind: "pump", name: "HP pump B", x: 500, y: 245, show: { v: 87, unit: "%" }, state: "Running", load: 87, rows: [r("Speed", 87, "%"), r("Discharge", 58.4, "bar", 1), r("Efficiency", 88.4, "%", 1), r("Power", 3120, "kW")] },
      { id: "pc", tag: "P-301C", kind: "pump", name: "HP pump C", x: 620, y: 245, show: { v: 91, unit: "%" }, state: "Alarm", load: 91, rows: [r("Speed", 91, "%"), r("Discharge", 58.0, "bar", 1), r("Vibration", 7.4, "mm/s", 1), r("Power", 3310, "kW")], note: "Vibration is trending up. Work order WO-2409 is overdue." },
      { id: "pd", tag: "PIT-302", name: "Discharge pressure", x: 690, y: 150, show: { v: 58.2, unit: " bar", d: 1 }, state: "Normal", rows: [r("Pressure", 58.2, "bar", 1), r("Design", 62, "bar"), r("Energy per m³", 3.18, "kWh", 2)] },
      { id: "fl", tag: "FIT-301", name: "Feed to RO", x: 725, y: 200, show: { v: 10900, unit: " m³/h" }, state: "Normal", rows: [r("Flow", 10900, "m³/h"), r("Target", 11000, "m³/h")] },
    ],
  },
  ro: {
    Art: withStage("ro", Ro),
    tags: [
      { id: "ta", tag: "TRAIN-A", name: "RO train A", x: 260, y: 52, show: { v: 12, unit: "% fouled" }, state: "Running", special: "trains", rows: [r("Permeate", 1656, "m³/h"), r("Recovery", 45.6, "%", 1), r("Fouling", 12, "%"), r("ΔP", 1.7, "bar", 1)] },
      { id: "tb", tag: "TRAIN-B", name: "RO train B", x: 260, y: 162, show: { v: 27, unit: "% fouled" }, state: "Alarm", special: "trains", rows: [r("Permeate", 1601, "m³/h"), r("Recovery", 44.2, "%", 1), r("Fouling", 27, "%"), r("ΔP", 2.4, "bar", 1)], note: "ΔP is high. Membrane cleaning is booked in 6 days (WO-2417)." },
      { id: "tc", tag: "TRAIN-C", name: "RO train C", x: 260, y: 272, show: { v: 9, unit: "% fouled" }, state: "Running", special: "trains", rows: [r("Permeate", 1676, "m³/h"), r("Recovery", 45.9, "%", 1), r("Fouling", 9, "%"), r("ΔP", 1.6, "bar", 1)] },
      { id: "pdt", tag: "PDT-401", name: "Feed pressure", x: 100, y: 52, show: { v: 57.4, unit: " bar", d: 1 }, state: "Normal", rows: [r("Feed pressure", 57.4, "bar", 1), r("Membrane ΔP", 1.9, "bar", 1)] },
      { id: "cip", tag: "CIP-401", name: "Cleaning skid", x: 65, y: 428, show: { v: 0, unit: "%" }, state: "Standby", rows: [r("State", "Standby"), r("Chemical tank", 50, "%"), r("Next clean", "Train B, 27 Oct")] },
      { id: "air", tag: "AIT-401", name: "Permeate quality", x: 735, y: 78, show: { v: 218, unit: " mg/L" }, state: "Normal", rows: [r("Salinity (TDS)", 218, "mg/L"), r("Salt rejection", 99.7, "%", 1), r("Recovery", 45.2, "%", 1)] },
    ],
  },
  erd: {
    Art: withStage("erd", Erd),
    tags: [
      { id: "ea", tag: "ERD-A", name: "Pressure exchanger A", x: 295, y: 122, show: { v: 96, unit: "%" }, state: "Running", load: 90, rows: [r("Efficiency", 96.0, "%", 1), r("Rotor speed", 1180, "rpm"), r("Leakage", 1.1, "%", 1)] },
      { id: "eb", tag: "ERD-B", name: "Pressure exchanger B", x: 415, y: 122, show: { v: 96, unit: "%" }, state: "Running", load: 89, rows: [r("Efficiency", 95.8, "%", 1), r("Rotor speed", 1175, "rpm"), r("Leakage", 1.2, "%", 1)] },
      { id: "ec", tag: "ERD-C", name: "Pressure exchanger C", x: 535, y: 122, show: { v: 96, unit: "%" }, state: "Running", load: 91, rows: [r("Efficiency", 96.2, "%", 1), r("Rotor speed", 1186, "rpm"), r("Leakage", 1.0, "%", 1)] },
      { id: "pit", tag: "PIT-501", name: "Brine pressure in", x: 150, y: 140, show: { v: 56.4, unit: " bar", d: 1 }, state: "Normal", rows: [r("Brine pressure", 56.4, "bar", 1), r("Pressure recovered", 96, "%")] },
      { id: "bp", tag: "P-501", kind: "pump", name: "Booster pump", x: 690, y: 178, show: { v: 63, unit: "%" }, state: "Running", load: 63, rows: [r("Speed", 63, "%"), r("Boost", 2.8, "bar", 1), r("Power", 410, "kW")] },
      { id: "sav", tag: "KPI-501", name: "Energy saved", x: 700, y: 350, show: { v: 38, unit: "%" }, state: "Normal", rows: [r("Energy saved", 38, "%"), r("Power saved", 6100, "kW"), r("Money saved today", 41200, "LE")], note: "Without energy recovery the plant would use about 38% more power." },
    ],
  },
  post: {
    Art: withStage("post", Post),
    tags: [
      { id: "lime", tag: "DOS-601", name: "Lime dosing", x: 185, y: 236, show: { v: 48, unit: "%" }, state: "Running", load: 48, rows: [r("Dose", 18, "mg/L"), r("Saturator level", 74, "%"), r("Hardness added", 82, "mg/L")] },
      { id: "co2", tag: "DOS-602", name: "CO₂ dosing", x: 325, y: 240, show: { v: 52, unit: "%" }, state: "Running", load: 52, rows: [r("Dose", 14, "mg/L"), r("Cylinder pressure", 17, "bar"), r("Remaining", 62, "%")] },
      { id: "cl", tag: "DOS-603", name: "Chlorine dosing", x: 485, y: 240, show: { v: 40, unit: "%" }, state: "Running", load: 40, rows: [r("Dose", 1.8, "mg/L", 1), r("Tank level", 66, "%"), r("Pump stroke", 40, "%")] },
      { id: "ph", tag: "AIT-601", name: "pH analyser", x: 560, y: 80, show: { v: 7.9, unit: "", d: 1 }, state: "Normal", rows: [r("pH", 7.9, "", 1), r("Allowed", "6.5 to 8.5")] },
      { id: "qual", tag: "QUALITY", name: "Drinking-water quality", x: 685, y: 395, show: { v: 6, unit: " of 6 pass" }, state: "Normal", special: "quality", rows: [], note: "Live readings of the water leaving the plant, against the allowed limits." },
    ],
  },
  tank: {
    Art: withStage("tank", Storage),
    tags: [
      { id: "ait", tag: "AIT-701", name: "Residual chlorine", x: 90, y: 130, show: { v: 0.6, unit: " mg/L", d: 1 }, state: "Normal", rows: [r("Free chlorine", 0.6, "mg/L", 1), r("Allowed", "0.2 to 1.0")] },
      { id: "l1", tag: "LIT-701", name: "Tank 1 level", x: 265, y: 190, show: { v: 72, unit: "%" }, state: "Normal", load: 72, rows: [r("Level", 72, "%"), r("Stored", 19000, "m³"), r("Cover time", 3.8, "h", 1)] },
      { id: "l2", tag: "LIT-702", name: "Tank 2 level", x: 535, y: 190, show: { v: 70, unit: "%" }, state: "Normal", load: 70, rows: [r("Level", 70, "%"), r("Stored", 19000, "m³"), r("Cover time", 3.8, "h", 1)] },
      { id: "xv", tag: "XV-701", kind: "valve", name: "Outlet valve", x: 690, y: 372, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "fit", tag: "FIT-701", name: "Outlet flow", x: 725, y: 418, show: { v: 4950, unit: " m³/h" }, state: "Normal", rows: [r("Flow", 4950, "m³/h"), r("Total stored", 38000, "m³")] },
    ],
  },
  net: {
    Art: withStage("net", Net),
    tags: [
      { id: "p1", tag: "P-801A", kind: "pump", name: "Transfer pump 1", x: 95, y: 272, show: { v: 77, unit: "%" }, state: "Running", load: 77, rows: [r("Speed", 77, "%"), r("Flow", 2460, "m³/h"), r("Power", 560, "kW")] },
      { id: "p2", tag: "P-801B", kind: "pump", name: "Transfer pump 2", x: 165, y: 250, show: { v: 75, unit: "%" }, state: "Running", load: 75, rows: [r("Speed", 75, "%"), r("Flow", 2440, "m³/h"), r("Power", 545, "kW")] },
      { id: "p3", tag: "P-801C", kind: "pump", name: "Transfer pump 3", x: 235, y: 272, show: { v: 0, unit: "%" }, state: "Standby", load: 0, rows: [r("Speed", 0, "%"), r("Ready to start", "Yes")] },
      { id: "fit", tag: "FIT-801", name: "Network flow", x: 340, y: 192, show: { v: 4920, unit: " m³/h" }, state: "Normal", rows: [r("Flow", 4920, "m³/h"), r("Today", 118000, "m³")] },
      { id: "pit", tag: "PIT-801", name: "Line pressure", x: 520, y: 140, show: { v: 6.2, unit: " bar", d: 1 }, state: "Normal", rows: [r("Pressure", 6.2, "bar", 1), r("Allowed", "5 to 7", "bar")] },
      { id: "city", tag: "DEMAND", name: "City demand", x: 715, y: 118, show: { v: 186, unit: " k people" }, state: "Normal", rows: [r("Customers served", 186000), r("Leak loss", 2.1, "%", 1), r("Peak hour", "19:00")] },
    ],
  },
};
