import { createContext, useContext, useId, type ReactNode } from "react";
import { equipKey, useEquip } from "./Equip";

export type TagState = "Running" | "Standby" | "Alarm" | "Normal";
export interface Row { label: string; value: number | string; unit?: string; d?: number }
export interface TagDef {
  id: string; tag: string; name: string; x: number; y: number; // x, y in the 800 × 450 picture
  show?: { v: number; unit: string; d?: number };
  kind?: "pump" | "valve"; state: TagState; load?: number; rows: Row[]; special?: "lanes" | "quality"; note?: string;
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

type Kind = "sea" | "clean" | "brine" | "chem" | "product" | "raw" | "treated" | "sludge" | "gas" | "air";

/* ---------- drawing pieces (flat 2D, coloured by theme variables in step7.css) ---------- */
export function Pipe({ d, kind = "raw", flow = true, w: w0 = 9 }: { d: string; kind?: Kind; flow?: boolean; w?: number }) {
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

/** a basin seen from above: coloured liquid, optional anoxic zone on the left and rising bubbles from the diffusers */
export function Basin({ x, y, w, h, tone = "raw", alarm = false, bubbles = 0, seed = 0, from = 20, zone = 0 }: { x: number; y: number; w: number; h: number; tone?: Kind; alarm?: boolean; bubbles?: number; seed?: number; from?: number; zone?: number }) {
  const left = x + (zone ? from - 20 : 14);
  const span = x + w - 14 - left;
  return (
    <g className={`basin k-${tone} ${alarm ? "st-Alarm" : ""}`}>
      <rect x={x} y={y} width={w} height={h} rx="4" className="eq" />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx="2" className="liquid" />
      {zone > 0 && <rect x={x + 4} y={y + 4} width={zone - 4 + 0} height={h - 8} className="anoxic" />}
      {zone > 0 && <line x1={x + zone} x2={x + zone} y1={y + 4} y2={y + h - 4} className="eq-band" />}
      {Array.from({ length: bubbles }, (_, i) => {
        const col = i % Math.ceil(bubbles / 2);
        const row = i < Math.ceil(bubbles / 2) ? 0.3 : 0.7;
        return <circle key={i} className="bub" cx={left + (span / Math.ceil(bubbles / 2)) * (col + 0.5)} cy={y + h * row} r="2.2" style={{ ["--d" as string]: `${(((i * 7 + seed * 5) % 11) / 5).toFixed(2)}s` }} />;
      })}
    </g>
  );
}

/** a round clarifier seen from above: liquid, centre well and a scraper bridge that turns slowly */
export function Clarifier({ x, y, r, tone = "raw", alarm = false, delay = 0, ring = false, blanket = 0 }: { x: number; y: number; r: number; tone?: Kind; alarm?: boolean; delay?: number; ring?: boolean; blanket?: number }) {
  return (
    <g className={`clar k-${tone} ${alarm ? "st-Alarm" : ""}`}>
      <circle cx={x} cy={y} r={r} className="eq" />
      <circle cx={x} cy={y} r={r - 6} className="liquid" />
      {blanket > 0 && <circle cx={x} cy={y} r={(r - 6) * blanket} className="blanket" style={{ animationDelay: `${-delay}s` }} />}
      {ring && <circle cx={x} cy={y} r={r - 3} className="weir" />}
      <g className="bridge" style={{ animationDelay: `${-delay}s` }}>
        <line x1={x - r + 6} x2={x + r - 6} y1={y} y2={y} className="eq-line" />
      </g>
      <circle cx={x} cy={y} r={Math.max(7, r * 0.22)} className="eq" />
    </g>
  );
}

/** an egg-shaped digester: liquid level, heating coil lines */
export function Egg({ x, y, rx, ry, level }: { x: number; y: number; rx: number; ry: number; level: number }) {
  const id = useId();
  const top = y + ry - 2 * ry * level;
  return (
    <g className="egg k-sludge">
      <clipPath id={id}><ellipse cx={x} cy={y} rx={rx} ry={ry} /></clipPath>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} className="eq" />
      <g clipPath={`url(#${id})`}>
        <rect x={x - rx} y={top} width={rx * 2} height={y + ry - top} className="liquid" />
        <path className="wave-line" d={`M${x - rx - 40} ${top} q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0`} />
        {[-0.35, 0, 0.35].map((o) => <line key={o} x1={x - rx} x2={x + rx} y1={y + ry * o} y2={y + ry * o} className="eq-band" />)}
      </g>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} className="eq-line" />
    </g>
  );
}

/* The water line of every picture keeps one rule so the Overview can join them:
   it comes in from the left and leaves on the right at the y shown in each picture's comment. */

/* ---------- 1. inlet works: wet well, influent pumps, bar screen (in y 225, out y 225) ---------- */
function Intake() {
  const ys = [150, 225, 300];
  return (
    <g>
      <Pipe d="M-900 225 H90" kind="raw" w={12} />
      <Tank x={90} y={110} w={170} h={230} level={0.62} tone="raw" />
      {ys.map((y, i) => (
        <g key={y}>
          <Pipe d={`M260 ${y} H362`} kind="raw" />
          <Pipe d={`M398 ${y} H520`} kind="raw" />
          <Valve x={455} y={y} id={["xv1", "xv2", "xv3"][i]} />
          <Pump x={380} y={y} state={i === 2 ? "Standby" : "Running"} id={["p1", "p2", "p3"][i]} />
        </g>
      ))}
      <Pipe d="M520 150 V300" kind="raw" w={11} />
      <Pipe d="M520 225 H1700" kind="raw" w={12} />
      <rect x="600" y="185" width="56" height="80" rx="4" className="eq" />
      {[612, 624, 636, 648].map((x) => <line key={x} x1={x} x2={x} y1="192" y2="258" className="eq-band" />)}
      <Cap x={175} y={362}>Wet well</Cap>
      <Cap x={628} y={284}>Bar screen</Cap>
      <Cap x={730} y={250}>To grit removal</Cap>
    </g>
  );
}

/* ---------- 2. grit & grease: aerated grit chambers, blower, classifier (in y 225, out y 225) ---------- */
function Pre() {
  return (
    <g>
      <Pipe d="M-900 225 H70 M70 178 V272 M70 178 H100 M70 272 H100" kind="raw" />
      <Pipe d="M430 178 H470 V225 M430 272 H470 V225 M470 225 H1700" kind="raw" />
      <Pipe d="M582 112 H130 M160 112 V148 M260 112 V148 M360 112 V148" kind="air" w={5} />
      <Pipe d="M520 112 V345 H130 M160 345 V302 M260 345 V302 M360 345 V302" kind="air" w={5} />
      <Pipe d="M300 302 V400 H650" kind="sludge" w={7} />
      <Pipe d="M695 190 V225" kind="chem" w={6} />
      <Basin x={100} y={148} w={330} h={60} tone="raw" bubbles={9} />
      <Basin x={100} y={242} w={330} h={60} tone="raw" bubbles={9} seed={4} />
      <Pump x={600} y={112} s={0.85} id="bl" />
      <Tank x={660} y={110} w={70} h={80} level={0.6} tone="chem" />
      <Cyl x={650} y={360} w={60} h={70} bands={3} alarm />
      <Cap x={265} y={326}>Aerated grit chambers</Cap>
      <Cap x={600} y={152}>Air blower</Cap>
      <Cap x={700} y={448}>Grit classifier</Cap>
    </g>
  );
}

/* ---------- 3. primary clarification: three round clarifiers (in y 225, out y 360) ---------- */
function Hp() {
  const xs = [170, 400, 630];
  return (
    <g>
      <Pipe d="M-900 225 H60 V70 H630" kind="raw" w={10} />
      <Pipe d="M170 360 H1700" kind="raw" w={10} />
      <Pipe d="M204 425 H712 M748 425 H1700" kind="sludge" w={7} />
      {xs.map((x) => (
        <g key={x}>
          <Pipe d={`M${x} 70 V163`} kind="raw" w={8} />
          <Pipe d={`M${x} 287 V360`} kind="raw" w={8} />
          <Pipe d={`M${x + 34} 268 V425`} kind="sludge" w={6} />
        </g>
      ))}
      {xs.map((x, i) => <Clarifier key={x} x={x} y={225} r={62} tone="raw" delay={i * 2.5} blanket={0.62} />)}
      <Pump x={730} y={428} s={0.8} id="psp" />
      <Cap x={400} y={46}>Primary clarifiers</Cap>
      <Cap x={520} y={414}>Primary sludge</Cap>
    </g>
  );
}

/* ---------- 4. aeration: three lanes, diffusers, blower (in y 225, out y 225) ---------- */
/** dissolved oxygen per lane, mg/L: more oxygen, more bubbles (matches the lane tags) */
const LANE_DO = [2.1, 1.1, 2.2];
function Ro() {
  const lanes = [{ y: 50 }, { y: 155 }, { y: 260 }];
  return (
    <g>
      <Pipe d="M-900 225 H100 M100 92 V302" kind="raw" w={10} />
      <Pipe d="M680 92 V302 M680 225 H1700" kind="sludge" w={10} />
      <Pipe d="M722 95 H640 V22 H250 M270 22 V50 M400 22 V50 M530 22 V50" kind="air" w={6} />
      {lanes.map((l, i) => {
        const yc = l.y + 42;
        return (
          <g key={l.y}>
            <Pipe d={`M100 ${yc} H180`} kind="raw" w={8} />
            <Pipe d={`M600 ${yc} H680`} kind="sludge" w={8} />
            <Basin x={180} y={l.y} w={420} h={84} tone="sludge" alarm={i === 1} bubbles={Math.round(LANE_DO[i] * 7)} seed={i * 3} from={110} zone={90} />
            <Cap x={176} y={yc - 10} a="end">Lane {"ABC"[i]}</Cap>
          </g>
        );
      })}
      <Pump x={740} y={95} s={0.85} id="bl" />
      <Cap x={225} y={364}>Anoxic</Cap>
      <Cap x={440} y={364}>Aerobic, fine-bubble diffusers</Cap>
      <Cap x={740} y={140}>Blower</Cap>
    </g>
  );
}

/* ---------- 5. secondary clarifiers: settling, return and waste sludge (in y 225, out y 300) ---------- */
function Erd() {
  const xs = [150, 340, 530];
  return (
    <g>
      <Pipe d="M-900 225 H50 V60 H530" kind="sludge" w={10} />
      <Pipe d="M150 300 H1700" kind="treated" w={10} />
      <Pipe d="M184 380 H642 M678 380 H722 M758 380 H1700" kind="sludge" w={7} />
      {xs.map((x) => (
        <g key={x}>
          <Pipe d={`M${x} 60 V103`} kind="sludge" w={8} />
          <Pipe d={`M${x} 227 V300`} kind="treated" w={8} />
          <Pipe d={`M${x + 34} 210 V380`} kind="sludge" w={6} />
        </g>
      ))}
      {xs.map((x, i) => <Clarifier key={x} x={x} y={165} r={62} tone="treated" delay={i * 3} ring blanket={0.45} />)}
      <Pump x={660} y={380} s={0.8} id="ras" />
      <Pump x={740} y={380} s={0.8} state="Standby" id="was" />
      <Cap x={340} y={40}>Secondary clarifiers</Cap>
      <Cap x={700} y={288}>Treated water</Cap>
      <Cap x={400} y={402}>Return and waste sludge</Cap>
    </g>
  );
}

/* ---------- 6. tertiary & disinfection: disc filters, two UV banks, chlorine contact (in y 225, out y 400) ---------- */
function Post() {
  const xs = [150, 255, 360];
  return (
    <g>
      <Pipe d="M-900 225 H60 V100 H360" kind="treated" w={10} />
      <Pipe d="M150 330 H440 V187 M440 187 H470 M440 263 H470" kind="treated" w={8} />
      <Pipe d="M640 187 H662 M640 263 H662 M662 187 V263 M662 225 H690" kind="treated" w={7} />
      <Pipe d="M590 365 H662 V225" kind="chem" w={5} />
      <Pipe d="M740 300 V400 H1700" kind="product" w={10} />
      {xs.map((x) => (
        <g key={x}>
          <Pipe d={`M${x} 100 V150`} kind="treated" w={7} />
          <Pipe d={`M${x} 300 V330`} kind="treated" w={7} />
          <Cyl x={x - 35} y={150} w={70} h={150} bands={5} />
        </g>
      ))}
      {[165, 241].map((y, b) => (
        <g key={y} className={b === 0 ? "st-Alarm" : ""}>
          <rect x="470" y={y} width="170" height="44" rx="4" className="eq" />
          {[0, 1, 2, 3, 4, 5].map((l) => <line key={l} x1={490 + l * 26} x2={490 + l * 26} y1={y + 6} y2={y + 38} className="uv-lamp" style={{ ["--d" as string]: `${(l * 0.3 + b * 0.5).toFixed(1)}s`, ["--lo" as string]: b === 0 ? 0.2 : 0.55 }} />)}
        </g>
      ))}
      <Tank x={690} y={150} w={100} h={150} level={0.7} tone="product" />
      <Tank x={520} y={330} w={70} h={80} level={0.6} tone="chem" />
      <Cap x={255} y={352}>Disc filters</Cap>
      <Cap x={555} y={152}>UV disinfection</Cap>
      <Cap x={555} y={322}>Chlorine</Cap>
    </g>
  );
}

/* ---------- 7. sludge & biogas: thickener, digesters, gas holder, CHP, dewatering (in y 225, out y 242) ---------- */
function Storage() {
  return (
    <g>
      <Pipe d="M-900 225 H54" kind="sludge" w={9} />
      <Pipe d="M146 225 H214 M200 225 V330 H400 V281" kind="sludge" w={8} />
      <Pipe d="M260 149 V100 H540 M400 149 V100" kind="gas" w={6} />
      <Pipe d="M500 100 V150" kind="gas" w={5} />
      <Pipe d="M650 100 H690" kind="gas" w={6} />
      <Pipe d="M443 235 H560 M680 242 H1700" kind="sludge" w={8} />
      <Clarifier x={100} y={225} r={46} tone="sludge" delay={1} />
      <Egg x={260} y={215} rx={46} ry={66} level={0.74} />
      <Egg x={400} y={215} rx={46} ry={66} level={0.7} />
      <g className="gas-holder"><Tank x={540} y={50} w={110} h={90} level={0.55} tone="gas" /></g>
      <rect x="690" y="68" width="84" height="64" rx="4" className="eq" />
      <path d="M700 100 l12 -12 l12 24 l12 -24 l12 24 l10 -12" className="eq-zig" />
      <path d="M490 168 l10 -20 l10 20 z" className="eq" />
      <path d="M500 148 q-8 -12 0 -24 q8 12 0 24" className="flame" />
      <Vessel x={560} y={225} w={120} h={34} />
      <Cap x={100} y={290}>Thickener</Cap>
      <Cap x={330} y={310}>Digesters, 37 °C</Cap>
      <Cap x={595} y={162}>Gas holder</Cap>
      <Cap x={732} y={150}>CHP engine</Cap>
      <Cap x={620} y={285}>Dewatering</Cap>
    </g>
  );
}

/* ---------- 8. effluent & reuse: reuse tank, pumps, irrigation and the emergency outfall (in y 360, out y 360) ---------- */
function Net() {
  return (
    <g>
      <path d="M-900 330 H0 Q150 270 300 320 T560 290 T800 330 H1700 V650 H-900 Z" className="hill" />
      <rect x="200" y="250" width="200" height="140" rx="10" className="wall" />
      <Pipe d="M-900 360 H60" kind="product" w={10} />
      <Pipe d="M170 360 H1700" kind="treated" w={10} />
      <Tank x={60} y={290} w={110} h={110} level={0.7} tone="product" />
      {[230, 300, 370].map((x, i) => (
        <g key={x}>
          <Pipe d={`M${x} 360 V348`} kind="product" w={7} />
          <Pipe d={`M${x} 314 V230`} kind="product" w={7} />
          <Pump x={x} y={330} state={i === 2 ? "Standby" : "Running"} id={["p1", "p2", "p3"][i]} />
        </g>
      ))}
      <Pipe d="M230 230 H400 L480 190 H600 L660 170 H740 V224 M670 224 H775" kind="product" w={10} />
      <rect x="640" y="245" width="150" height="95" className="field" />
      {[262, 280, 298, 316, 332].map((y) => <line key={y} x1="650" x2="780" y1={y} y2={y} className="eq-band" />)}
      {[685, 725, 765].map((x) => (
        <g key={x}>
          <circle cx={x} cy="224" r="4" className="eq" />
          <path d={`M${x} 224 q10 -20 20 0 M${x} 224 q-10 -20 -20 0`} className="spray" />
        </g>
      ))}
      {[650, 678, 706, 734, 762].map((x) => <circle key={x} cx={x} cy="385" r="10" className="tree" />)}
      <Cap x={115} y={420}>Reuse tank</Cap>
      <Cap x={300} y={412}>Reuse pumps</Cap>
      <Cap x={560} y={342}>Emergency sea outfall</Cap>
      <Cap x={715} y={110}>Irrigation and green belt</Cap>
    </g>
  );
}

/* ---------- tags: what you can click on each picture ---------- */
const r = (label: string, value: number | string, unit?: string, d = 0): Row => ({ label, value, unit, d });

export const SCENES: Record<string, Scene> = {
  intake: {
    Art: withStage("intake", Intake),
    tags: [
      { id: "lit", tag: "LIT-101", name: "Wet well level", x: 175, y: 95, show: { v: 3.4, unit: " m", d: 1 }, state: "Normal", rows: [r("Level", 3.4, "m", 1), r("High alarm", 4.8, "m", 1), r("Low alarm", 1.2, "m", 1)], note: "Pumps speed up as the level rises." },
      { id: "tit", tag: "TIT-101", name: "Sewage temperature", x: 175, y: 390, show: { v: 26.8, unit: " °C", d: 1 }, state: "Normal", rows: [r("Temperature", 26.8, "°C", 1), r("Daily change", "+0.3", "°C"), r("Effect on treatment", "low")] },
      { id: "p1", tag: "P-101A", kind: "pump", name: "Influent pump 1", x: 380, y: 92, show: { v: 82, unit: "%" }, state: "Running", load: 82, rows: [r("Speed", 82, "%"), r("Flow", 3125, "m³/h"), r("Power", 150, "kW"), r("Vibration", 2.1, "mm/s", 1)] },
      { id: "p2", tag: "P-101B", kind: "pump", name: "Influent pump 2", x: 380, y: 167, show: { v: 80, unit: "%" }, state: "Running", load: 80, rows: [r("Speed", 80, "%"), r("Flow", 3125, "m³/h"), r("Power", 145, "kW"), r("Vibration", 2.3, "mm/s", 1)] },
      { id: "p3", tag: "P-101C", kind: "pump", name: "Influent pump 3", x: 380, y: 242, show: { v: 0, unit: "%" }, state: "Standby", load: 0, rows: [r("Speed", 0, "%"), r("Ready to start", "Yes"), r("Hours run", 4120, "h")], note: "Standby unit. Starts automatically if another pump trips." },
      { id: "xv1", tag: "XV-101A", name: "Pump 1 valve", kind: "valve", x: 455, y: 118, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "xv2", tag: "XV-101B", name: "Pump 2 valve", kind: "valve", x: 455, y: 193, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "xv3", tag: "XV-101C", name: "Pump 3 valve", kind: "valve", x: 455, y: 268, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "scr", tag: "LDT-101", name: "Bar screen level difference", x: 628, y: 160, show: { v: 0.12, unit: " m", d: 2 }, state: "Normal", rows: [r("Level difference", 0.12, "m", 2), r("Rake starts at", 0.25, "m", 2), r("Screenings today", 1.9, "m³", 1)], note: "A rising value means the screen is blocking and the rake runs more often." },
      { id: "fit", tag: "FIT-101", name: "Inlet flow", x: 715, y: 195, show: { v: 6250, unit: " m³/h" }, state: "Normal", rows: [r("Flow", 6250, "m³/h"), r("Design", 6250, "m³/h"), r("Today", 150000, "m³")] },
    ],
  },
  pre: {
    Art: withStage("pre", Pre),
    tags: [
      { id: "gc1", tag: "GC-201", name: "Grit chamber 1", x: 265, y: 178, show: { v: 71, unit: "%" }, state: "Running", load: 71, rows: [r("Grit removed", 1.2, "m³/d", 1), r("Air flow", 155, "m³/h"), r("Retention time", 4.2, "min", 1)] },
      { id: "gc2", tag: "GC-202", name: "Grit chamber 2", x: 265, y: 272, show: { v: 74, unit: "%" }, state: "Running", load: 74, rows: [r("Grit removed", 1.2, "m³/d", 1), r("Air flow", 155, "m³/h"), r("Retention time", 4.2, "min", 1)] },
      { id: "bl", tag: "B-201", kind: "pump", name: "Grit air blower", x: 600, y: 56, show: { v: 62, unit: "%" }, state: "Running", load: 62, rows: [r("Speed", 62, "%"), r("Air flow", 310, "m³/h"), r("Power", 18, "kW")] },
      { id: "dos", tag: "DOS-201", name: "Ferric dosing", x: 695, y: 92, show: { v: 55, unit: "%" }, state: "Running", load: 55, rows: [r("Dose", 3.2, "mg/L", 1), r("Tank level", 62, "%"), r("Pump stroke", 55, "%")], note: "Helps the primary clarifiers remove phosphorus and solids." },
      { id: "cls", tag: "GCL-202", name: "Grit classifier 2", x: 690, y: 340, show: { v: 95, unit: "%" }, state: "Alarm", load: 95, rows: [r("Hopper level", 95, "%"), r("Grit removed", 2.4, "m³/d", 1), r("Grease removed", 0.8, "m³/d", 1)], note: "The hopper is nearly full. Work order WO-2421 is in progress." },
    ],
  },
  hp: {
    Art: withStage("hp", Hp),
    tags: [
      { id: "cl1", tag: "PC-301", name: "Primary clarifier 1", x: 170, y: 225, show: { v: 0.9, unit: " m", d: 1 }, state: "Running", load: 85, rows: [r("Sludge blanket", 0.9, "m", 1), r("Surface loading", 1.4, "m/h", 1), r("TSS removal", 62, "%")] },
      { id: "cl2", tag: "PC-302", name: "Primary clarifier 2", x: 400, y: 225, show: { v: 1.0, unit: " m", d: 1 }, state: "Running", load: 87, rows: [r("Sludge blanket", 1.0, "m", 1), r("Surface loading", 1.4, "m/h", 1), r("TSS removal", 61, "%")] },
      { id: "cl3", tag: "PC-303", name: "Primary clarifier 3", x: 630, y: 225, show: { v: 0.8, unit: " m", d: 1 }, state: "Running", load: 83, rows: [r("Sludge blanket", 0.8, "m", 1), r("Surface loading", 1.4, "m/h", 1), r("TSS removal", 63, "%")] },
      { id: "tss", tag: "AIT-301", name: "Primary effluent solids", x: 285, y: 125, show: { v: 88, unit: " mg/L" }, state: "Normal", rows: [r("Suspended solids", 88, "mg/L"), r("Removal", 62, "%"), r("COD", 240, "mg/L")] },
      { id: "psp", tag: "P-301", kind: "pump", name: "Primary sludge pump", x: 730, y: 372, show: { v: 63, unit: "%" }, state: "Running", load: 63, rows: [r("Speed", 63, "%"), r("Sludge flow", 95, "m³/h"), r("Dry solids", 3.2, "%", 1), r("Power", 22, "kW")], note: "Sludge goes on to the thickener and digesters." },
    ],
  },
  ro: {
    Art: withStage("ro", Ro),
    tags: [
      { id: "ta", tag: "LANE-A", name: "Aeration lane A", x: 390, y: 92, show: { v: 2.1, unit: " mg/L", d: 1 }, state: "Running", special: "lanes", rows: [r("Dissolved oxygen", 2.1, "mg/L", 1), r("Flow", 2099, "m³/h"), r("MLSS", 3380, "mg/L"), r("Sludge age", 11.4, "days", 1)] },
      { id: "tb", tag: "LANE-B", name: "Aeration lane B", x: 390, y: 197, show: { v: 1.1, unit: " mg/L", d: 1 }, state: "Alarm", special: "lanes", rows: [r("Dissolved oxygen", 1.1, "mg/L", 1), r("Flow", 2033, "m³/h"), r("MLSS", 3560, "mg/L"), r("Sludge age", 12.1, "days", 1)], note: "Oxygen is low because the diffusers are fouled. Cleaning is booked in 6 days (WO-2417)." },
      { id: "tc", tag: "LANE-C", name: "Aeration lane C", x: 390, y: 302, show: { v: 2.2, unit: " mg/L", d: 1 }, state: "Running", special: "lanes", rows: [r("Dissolved oxygen", 2.2, "mg/L", 1), r("Flow", 2058, "m³/h"), r("MLSS", 3410, "mg/L"), r("Sludge age", 11.2, "days", 1)] },
      { id: "bl", tag: "B-401", kind: "pump", name: "Process blower", x: 740, y: 38, show: { v: 78, unit: "%" }, state: "Running", load: 78, rows: [r("Speed", 78, "%"), r("Air flow", 19800, "m³/h"), r("Pressure", 0.62, "bar", 2), r("Power", 480, "kW")], note: "The blowers use about half of the plant's electricity." },
      { id: "mlss", tag: "AIT-401", name: "Mixed liquor solids", x: 110, y: 398, show: { v: 3450, unit: " mg/L" }, state: "Normal", rows: [r("MLSS", 3450, "mg/L"), r("Target", "3,000 to 4,000"), r("Sludge age", 11.6, "days", 1)] },
      { id: "dif", tag: "DIF-401", name: "Diffuser grid", x: 440, y: 405, show: { v: 14, unit: "% fouled" }, state: "Normal", rows: [r("Fouling, lane A", 8, "%"), r("Fouling, lane B", 21, "%"), r("Fouling, lane C", 12, "%")], note: "Fouled diffusers push oxygen transfer down and raise blower power." },
    ],
  },
  erd: {
    Art: withStage("erd", Erd),
    tags: [
      { id: "sa", tag: "SC-501", name: "Secondary clarifier A", x: 150, y: 165, show: { v: 1.2, unit: " m", d: 1 }, state: "Running", load: 90, rows: [r("Sludge blanket", 1.2, "m", 1), r("Effluent TSS", 11, "mg/L"), r("Surface loading", 0.9, "m/h", 1)] },
      { id: "sb", tag: "SC-502", name: "Secondary clarifier B", x: 340, y: 165, show: { v: 1.3, unit: " m", d: 1 }, state: "Running", load: 89, rows: [r("Sludge blanket", 1.3, "m", 1), r("Effluent TSS", 11, "mg/L"), r("Surface loading", 0.9, "m/h", 1)] },
      { id: "sc", tag: "SC-503", name: "Secondary clarifier C", x: 530, y: 165, show: { v: 1.1, unit: " m", d: 1 }, state: "Running", load: 91, rows: [r("Sludge blanket", 1.1, "m", 1), r("Effluent TSS", 10, "mg/L"), r("Surface loading", 0.9, "m/h", 1)] },
      { id: "ras", tag: "P-501", kind: "pump", name: "Return sludge pump", x: 660, y: 330, show: { v: 76, unit: "%" }, state: "Running", load: 76, rows: [r("Speed", 76, "%"), r("Return flow", 3400, "m³/h"), r("Return rate", 55, "%"), r("Power", 85, "kW")], note: "Sends settled sludge back to the aeration lanes." },
      { id: "was", tag: "P-502", kind: "pump", name: "Waste sludge pump", x: 745, y: 330, show: { v: 0, unit: "%" }, state: "Standby", load: 0, rows: [r("Speed", 0, "%"), r("Next wasting", "02:00"), r("Hours run", 2860, "h")], note: "Runs a few hours a day to hold the sludge age." },
      { id: "ait", tag: "AIT-501", name: "Effluent turbidity", x: 690, y: 245, show: { v: 1.6, unit: " NTU", d: 1 }, state: "Normal", rows: [r("Turbidity", 1.6, "NTU", 1), r("Limit", 5, "NTU"), r("Suspended solids", 11, "mg/L")] },
    ],
  },
  post: {
    Art: withStage("post", Post),
    tags: [
      { id: "f1", tag: "DF-601", name: "Disc filter 1", x: 150, y: 225, show: { v: 48, unit: "%" }, state: "Running", load: 48, rows: [r("Clogging", 48, "%"), r("Level difference", 0.14, "m", 2), r("Last backwash", "40 min ago")] },
      { id: "f2", tag: "DF-602", name: "Disc filter 2", x: 255, y: 225, show: { v: 52, unit: "%" }, state: "Running", load: 52, rows: [r("Clogging", 52, "%"), r("Level difference", 0.15, "m", 2), r("Last backwash", "25 min ago")] },
      { id: "f3", tag: "DF-603", name: "Disc filter 3", x: 360, y: 225, show: { v: 44, unit: "%" }, state: "Running", load: 44, rows: [r("Clogging", 44, "%"), r("Level difference", 0.12, "m", 2), r("Last backwash", "55 min ago")] },
      { id: "uv1", tag: "UV-601", name: "UV bank 1", x: 555, y: 187, show: { v: 52, unit: "% UVT" }, state: "Alarm", load: 52, rows: [r("UV transmittance", 52, "%"), r("UV dose", 42, "mJ/cm²"), r("Lamps on", "48 of 48"), r("Sleeve cleaned", "19 days ago")], note: "Transmittance is close to its limit. The sleeves need cleaning." },
      { id: "uv2", tag: "UV-602", name: "UV bank 2", x: 555, y: 263, show: { v: 71, unit: "% UVT" }, state: "Running", load: 71, rows: [r("UV transmittance", 71, "%"), r("UV dose", 46, "mJ/cm²"), r("Lamps on", "48 of 48"), r("Sleeve cleaned", "6 days ago")] },
      { id: "cl", tag: "DOS-601", name: "Chlorine dosing", x: 555, y: 430, show: { v: 40, unit: "%" }, state: "Running", load: 40, rows: [r("Dose", 1.8, "mg/L", 1), r("Tank level", 66, "%"), r("Pump stroke", 40, "%")], note: "A small dose after UV keeps the reuse line clean." },
      { id: "ph", tag: "AIT-601", name: "pH analyser", x: 740, y: 125, show: { v: 7.4, unit: "", d: 1 }, state: "Normal", rows: [r("pH", 7.4, "", 1), r("Allowed", "6.5 to 8.5")] },
      { id: "qual", tag: "QUALITY", name: "Effluent quality", x: 650, y: 428, show: { v: 9, unit: " of 9 pass" }, state: "Normal", special: "quality", rows: [], note: "Live readings of the water leaving the plant, against the allowed limits." },
    ],
  },
  tank: {
    Art: withStage("tank", Storage),
    tags: [
      { id: "thk", tag: "TK-701", name: "Sludge thickener", x: 100, y: 160, show: { v: 6, unit: "% solids" }, state: "Running", load: 70, rows: [r("Thickened sludge", 6, "% solids"), r("Feed", 190, "m³/h"), r("Polymer", 4.2, "kg/t", 1)] },
      { id: "d1", tag: "DG-701", name: "Digester 1", x: 260, y: 215, show: { v: 37.4, unit: " °C", d: 1 }, state: "Running", load: 74, rows: [r("Temperature", 37.4, "°C", 1), r("Retention time", 21, "days"), r("Volatile solids destroyed", 58, "%")] },
      { id: "d2", tag: "DG-702", name: "Digester 2", x: 400, y: 215, show: { v: 36.6, unit: " °C", d: 1 }, state: "Normal", load: 70, rows: [r("Temperature", 36.6, "°C", 1), r("Retention time", 21, "days"), r("Volatile solids destroyed", 56, "%")], note: "Temperature is a little low. The heat exchanger is being checked." },
      { id: "gh", tag: "GH-701", name: "Gas holder", x: 595, y: 95, show: { v: 55, unit: "%" }, state: "Normal", load: 55, rows: [r("Level", 55, "%"), r("Stored biogas", 1650, "m³"), r("Methane", 63, "%")] },
      { id: "flare", tag: "FL-701", name: "Gas flare", x: 520, y: 195, show: { v: 0, unit: " Nm³/h" }, state: "Normal", rows: [r("Flaring", 0, "Nm³/h"), r("Starts at", "90% holder level")], note: "Burns the surplus gas only when the engine cannot take it." },
      { id: "chp", tag: "CHP-701", name: "Biogas engine (CHP)", x: 732, y: 100, show: { v: 1.0, unit: " MW", d: 1 }, state: "Running", load: 80, rows: [r("Electric power", 1.0, "MW", 1), r("Heat to digesters", 1.1, "MW", 1), r("Gas used", 520, "Nm³/h")], note: "Covers about a third of the plant's electricity." },
      { id: "cent", tag: "CF-701", name: "Dewatering centrifuge", x: 620, y: 205, show: { v: 24, unit: "% dry" }, state: "Running", load: 66, rows: [r("Cake dryness", 24, "%"), r("Cake produced", 118, "t/d"), r("Polymer", 7.5, "kg/t", 1)] },
    ],
  },
  net: {
    Art: withStage("net", Net),
    tags: [
      { id: "rt", tag: "LIT-801", name: "Reuse tank level", x: 115, y: 330, show: { v: 70, unit: "%" }, state: "Normal", load: 70, rows: [r("Level", 70, "%"), r("Stored", 5200, "m³"), r("Cover time", 0.9, "h", 1)] },
      { id: "p1", tag: "P-801A", kind: "pump", name: "Reuse pump 1", x: 230, y: 272, show: { v: 77, unit: "%" }, state: "Running", load: 77, rows: [r("Speed", 77, "%"), r("Flow", 1830, "m³/h"), r("Power", 150, "kW")] },
      { id: "p2", tag: "P-801B", kind: "pump", name: "Reuse pump 2", x: 300, y: 250, show: { v: 75, unit: "%" }, state: "Running", load: 75, rows: [r("Speed", 75, "%"), r("Flow", 1800, "m³/h"), r("Power", 145, "kW")] },
      { id: "p3", tag: "P-801C", kind: "pump", name: "Reuse pump 3", x: 370, y: 272, show: { v: 0, unit: "%" }, state: "Standby", load: 0, rows: [r("Speed", 0, "%"), r("Ready to start", "Yes")] },
      { id: "fit", tag: "FIT-801", name: "Reuse flow", x: 480, y: 150, show: { v: 3630, unit: " m³/h" }, state: "Normal", rows: [r("Flow", 3630, "m³/h"), r("Share of effluent", 58, "%"), r("Today", 87000, "m³")] },
      { id: "pit", tag: "PIT-801", name: "Reuse line pressure", x: 590, y: 130, show: { v: 4.8, unit: " bar", d: 1 }, state: "Normal", rows: [r("Pressure", 4.8, "bar", 1), r("Allowed", "4 to 6", "bar")] },
      { id: "irr", tag: "DEMAND", name: "Irrigation demand", x: 715, y: 80, show: { v: 4.2, unit: " k feddan", d: 1 }, state: "Normal", rows: [r("Irrigated area", 4200, "feddan"), r("Farm connections", 38), r("Peak hour", "05:00")] },
      { id: "out", tag: "OUT-801", name: "Sea outfall", x: 600, y: 410, show: { v: 0, unit: " m³/h" }, state: "Normal", rows: [r("Flow", 0, "m³/h"), r("State", "Closed, emergency only"), r("Dilution check", "OK")], note: "Used only when the reuse line cannot take the water." },
    ],
  },
};
