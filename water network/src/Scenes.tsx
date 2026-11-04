import { createContext, useContext, useId, type ReactNode } from "react";
import { equipKey, useEquip } from "./Equip";
import { networkAt } from "./network";

export type TagState = "Running" | "Standby" | "Alarm" | "Normal";
export interface Row { label: string; value: number | string; unit?: string; d?: number }
export interface TagDef {
  id: string; tag: string; name: string; x: number; y: number; // x, y in the 800 × 450 picture
  show?: { v: number; unit: string; d?: number };
  kind?: "pump" | "valve"; state: TagState; load?: number; rows: Row[]; special?: "zones" | "quality"; note?: string;
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

type Kind = "loss" | "sea" | "clean" | "brine" | "chem" | "product" | "raw" | "treated" | "sludge" | "gas" | "air";

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

/* ---------- small pieces used by the network pictures ---------- */
function House({ x, y, w = 56, h = 40 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} className="eq" />
      <path d={`M${x - 6} ${y} L${x + w / 2} ${y - 22} L${x + w + 6} ${y}Z`} className="eq" />
      <rect x={x + w / 2 - 6} y={y + h - 18} width="12" height="18" className="eq-win" />
    </g>
  );
}
function Meter({ x, y, r = 11 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} className="eq" />
      <path d={`M${x - r * 0.55} ${y + r * 0.2} A${r * 0.6} ${r * 0.6} 0 0 1 ${x + r * 0.55} ${y + r * 0.2}`} className="eq-arc" style={{ strokeWidth: 2 }} />
      <line x1={x} y1={y + r * 0.2} x2={x + r * 0.35} y2={y - r * 0.35} className="eq-line" />
    </g>
  );
}
const ZONE_Q = (id: "Z1" | "Z2" | "Z3" | "Z4" | "Z5") => networkAt(8).zones[id];

/* ---------- 1. source & intake: river, bar screen, intake well, raw pumps (out y 330) ---------- */
function Source() {
  const ys = [170, 235, 300];
  const clip = useId();
  return (
    <g>
      <clipPath id={clip}><rect x="-900" y="150" width="944" height="172" /></clipPath>
      <rect x="-900" y="150" width="944" height="172" className="sea" />
      <g clipPath={`url(#${clip})`}>{[0, 1, 2].map((i) => <path key={i} d={WAVES} transform={`translate(${i * 22 - 880} ${190 + i * 45})`} className="wave-line sea-wave" />)}</g>
      <Pipe d="M-900 235 H110" kind="raw" w={14} />
      <rect x="44" y="196" width="24" height="78" rx="3" className="eq" />
      {[52, 60].map((x) => <line key={x} x1={x} x2={x} y1="202" y2="268" className="eq-band" />)}
      <Tank x={110} y={130} w={150} h={210} level={0.65} tone="raw" />
      {ys.map((y, i) => (
        <g key={y}>
          <Pipe d={`M260 ${y} H322`} kind="raw" />
          <Pipe d={`M358 ${y} H480`} kind="raw" />
          <Valve x={430} y={y} id={["xv1", "xv2", "xv3"][i]} />
          <Pump x={340} y={y} state={i === 2 ? "Standby" : "Running"} id={["p1", "p2", "p3"][i]} />
        </g>
      ))}
      <Pipe d="M480 170 V300" kind="raw" w={11} />
      <Pipe d="M480 235 H1700" kind="raw" w={12} />
      <rect x="640" y="215" width="34" height="40" rx="4" className="eq" />
      <Cap x={56} y={186}>Bar screen</Cap>
      <Cap x={185} y={364}>Intake well</Cap>
      <Cap x={345} y={350}>Raw water pumps</Cap>
      <Cap x={700} y={284}>To the treatment plant</Cap>
      <Cap x={14} y={342} a="start">River</Cap>
    </g>
  );
}

/* ---------- 2. treatment plant: coagulation, settling, filtration, chlorine (in y 225, out y 225) ---------- */
function Plant() {
  const fy = [120, 205, 290];
  return (
    <g>
      <Pipe d="M-900 225 H50" kind="raw" w={12} />
      <Tank x={50} y={190} w={70} h={70} level={0.55} tone="raw" />
      <Pipe d="M120 225 H200 M200 130 V320 M200 130 H218 M200 320 H218" kind="raw" w={9} />
      <Clarifier x={270} y={130} r={52} tone="raw" delay={0} blanket={0.55} />
      <Clarifier x={270} y={320} r={52} tone="raw" delay={3} blanket={0.5} />
      <Pipe d="M322 130 H370 V320 H322 M370 225 H420" kind="treated" w={9} />
      <Pipe d={`M420 120 V290 M420 ${fy[0]} H450 M420 ${fy[1]} H450 M420 ${fy[2]} H450`} kind="treated" w={7} />
      {fy.map((y, i) => <Basin key={y} x={450} y={y - 32} w={150} h={64} tone="treated" bubbles={i === 1 ? 6 : 0} seed={i} />)}
      <Pipe d={`M600 ${fy[0]} H640 M600 ${fy[1]} H640 M600 ${fy[2]} H640 M640 ${fy[0]} V${fy[2]} M640 225 H1700`} kind="treated" w={7} />
      <Tank x={690} y={80} w={70} h={80} level={0.6} tone="chem" />
      <Pipe d="M725 160 V225" kind="chem" w={6} />
      <Pipe d="M95 150 V190" kind="chem" w={6} />
      <Tank x={60} y={90} w={70} h={60} level={0.7} tone="chem" />
      <Cap x={85} y={282}>Coagulation</Cap>
      <Cap x={270} y={392}>Settling tanks</Cap>
      <Cap x={525} y={340}>Sand filters</Cap>
      <Cap x={725} y={64}>Chlorine</Cap>
      <Cap x={95} y={74}>Coagulant</Cap>
    </g>
  );
}

/* ---------- 3. pump station PS-1: clear-water tank, high-lift pumps, surge vessel (out y 232) ---------- */
function Ps1() {
  const ys = [150, 205, 260, 315];
  return (
    <g>
      <Pipe d="M-900 235 H60" kind="treated" w={12} />
      <Tank x={60} y={120} w={170} h={230} level={0.72} tone="product" />
      {ys.map((y, i) => (
        <g key={y}>
          <Pipe d={`M230 ${y} H312`} kind="product" />
          <Pipe d={`M348 ${y} H480`} kind="product" />
          <Valve x={420} y={y} id={["xv1", "xv2", "xv3", "xv4"][i]} />
          <Pump x={330} y={y} s={0.8} state={i === 3 ? "Standby" : "Running"} id={["p1", "p2", "p3", "p4"][i]} />
        </g>
      ))}
      <Pipe d="M480 150 V315" kind="product" w={11} />
      <Pipe d="M480 232 H1700" kind="product" w={12} />
      <Pipe d="M560 232 V200" kind="product" w={6} />
      <Cyl x={535} y={110} w={50} h={90} bands={3} />
      <rect x="640" y="212" width="34" height="40" rx="4" className="eq" />
      <Cap x={145} y={380}>Clear-water tank</Cap>
      <Cap x={330} y={92}>High-lift pumps</Cap>
      <Cap x={560} y={98}>Surge vessel</Cap>
      <Cap x={700} y={276}>To the reservoir and network</Cap>
    </g>
  );
}

/* ---------- 4. elevated reservoir: tower, inlet and outlet valves (in y 400, out y 400) ---------- */
function Res() {
  return (
    <g>
      <rect x="385" y="205" width="30" height="195" className="eq" />
      <path d="M300 205 L330 400 M500 205 L470 400" className="eq-line" />
      <Tank x={300} y={50} w={200} h={155} level={0.77} tone="product" />
      <Pipe d="M-900 400 H340 V205" kind="product" w={11} />
      <Pipe d="M460 205 V400 H1700" kind="product" w={11} />
      <Valve x={340} y={310} id="xv1" />
      <Valve x={460} y={310} id="xv2" />
      <path d="M500 80 H560 V150" className="eq-line" style={{ strokeDasharray: "5 4" }} />
      <rect x="640" y="380" width="34" height="40" rx="4" className="eq" />
      <Cap x={400} y={32}>Elevated reservoir</Cap>
      <Cap x={590} y={70}>Overflow</Cap>
      <Cap x={210} y={380} a="middle">Inlet</Cap>
      <Cap x={640} y={366} a="start">Outlet</Cap>
    </g>
  );
}

/* ---------- 5. trunk mains & booster: hub, PRV branch, booster pumps (in y 225) ---------- */
function Trunk() {
  return (
    <g>
      <Pipe d="M-900 225 H300 M300 110 V410" kind="product" w={13} />
      <Pipe d="M300 225 H1700" kind="product" w={12} />
      <Pipe d="M300 110 H1700" kind="product" w={9} />
      <Valve x={520} y={110} id="prv" />
      <rect x="470" y="86" width="100" height="48" rx="6" className="eq" style={{ fill: "none", strokeDasharray: "4 4" }} />
      <Pipe d="M300 340 H402 M438 340 H1700" kind="product" w={9} />
      <Pipe d="M300 410 H402 M438 410 H1700" kind="product" w={9} />
      <Pump x={420} y={340} state="Running" id="p1" />
      <Pump x={420} y={410} state="Standby" id="p2" />
      <circle cx="300" cy="225" r="9" className="eq" />
      <rect x="640" y="205" width="34" height="40" rx="4" className="eq" />
      <Cap x={300} y={62}>East hub</Cap>
      <Cap x={520} y={72}>Pressure-reducing valve</Cap>
      <Cap x={420} y={292}>Booster pumps</Cap>
      <Cap x={850} y={102} a="end">To Lotus</Cap>
      <Cap x={850} y={217} a="end">To Rehab</Cap>
      <Cap x={850} y={332} a="end">To Narges</Cap>
    </g>
  );
}

/* ---------- 6. supply zones: five zones with their own inlet meters ---------- */
function Zones() {
  const rows = [105, 225, 345];
  const names = [["Banafseg", "First Settlement"], ["Rehab", "Lotus"], ["Narges", ""]];
  return (
    <g>
      <Pipe d="M-900 225 H80 M80 105 V345" kind="product" w={13} />
      {rows.map((y, r) => (
        <g key={y}>
          <Pipe d={`M80 ${y} H1700`} kind="product" w={9} />
          {[0, 1].filter((c) => names[r][c]).map((c) => {
            const x = 170 + c * 330;
            const low = r === 0 && c === 1;
            return (
              <g key={c} className={low ? "st-Alarm" : ""}>
                <rect x={x} y={y - 46} width="190" height="92" rx="6" className="wall" style={low ? { stroke: "var(--bad)" } : undefined} />
                <House x={x + 18} y={y - 6} w={38} h={26} /><House x={x + 76} y={y - 6} w={38} h={26} /><House x={x + 134} y={y - 6} w={38} h={26} />
                <Cap x={x + 95} y={y - 52}>{names[r][c]}</Cap>
                <rect x={x - 46} y={y - 15} width="26" height="30" rx="4" className="eq" />
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

/* ---------- 7. customer metering: houses, smart meters, radio gateway ---------- */
function Meters() {
  const xs = [90, 230, 370, 510];
  return (
    <g>
      <path d="M-900 300 H1700 V650 H-900 Z" className="hill" />
      <Pipe d="M-900 315 H1700" kind="product" w={12} />
      {xs.map((x, i) => (
        <g key={x}>
          <Pipe d={`M${x + 28} 315 V240`} kind="product" w={5} />
          <House x={x} y={150} w={56} h={42} />
          <Meter x={x + 28} y={226} />
          {[0, 1].map((k) => <path key={k} d={`M${x + 28} ${206 - k * 12} q10 -10 20 0`} className="spray" style={{ animationDelay: `${i * 0.2}s` }} />)}
        </g>
      ))}
      <rect x="690" y="95" width="26" height="195" className="eq" />
      <path d="M680 95 L703 58 L726 95Z" className="eq" />
      {[0, 1, 2].map((k) => <path key={k} d={`M703 ${48 - k * 12} q16 -8 32 0 M703 ${48 - k * 12} q-16 -8 -32 0`} className="spray" />)}
      <rect x="650" y="345" width="110" height="60" rx="6" className="eq" />
      {[360, 375, 390].map((y) => <line key={y} x1="662" x2="748" y1={y} y2={y} className="eq-band" />)}
      <Pipe d="M703 290 V345" kind="chem" w={4} flow />
      <Cap x={300} y={372}>Customer connections</Cap>
      <Cap x={760} y={150} a="start">Radio gateway</Cap>
      <Cap x={705} y={428}>Billing system</Cap>
    </g>
  );
}

/* ---------- 8. leak & loss control: loggers listening on the main, two bursts, a repair crew ---------- */
function Leak() {
  return (
    <g>
      <path d="M-900 250 H1700 V650 H-900 Z" className="hill" />
      <Pipe d="M-900 225 H1700" kind="product" w={14} />
      {[170, 480, 700].map((x, i) => (
        <g key={x}>
          <line x1={x} y1="225" x2={x} y2="180" className="eq-line" />
          <circle cx={x} cy="168" r="12" className="eq" />
          <path d={`M${x - 6} 168 a6 6 0 0 1 12 0`} className="eq-arc" />
          {[0, 1].map((k) => <path key={k} d={`M${x} ${146 - k * 11} q12 -8 24 0 M${x} ${146 - k * 11} q-12 -8 -24 0`} className="spray" style={{ opacity: i === 1 ? 1 : 0.5 }} />)}
        </g>
      ))}
      {[{ x: 335, s: 1 }, { x: 600, s: 0.7 }].map((b) => (
        <g key={b.x} transform={`translate(${b.x} 225)`}>
          <ellipse cx="0" cy="62" rx={50 * b.s} ry={12 * b.s} className="liquid" style={{ fill: "var(--liq-product)" }} />
          <path d={`M0 -4 q${-18 * b.s} ${-44 * b.s} ${-34 * b.s} ${-8}  M0 -4 q${18 * b.s} ${-44 * b.s} ${34 * b.s} ${-8} M0 -4 V${-50 * b.s}`} className="spray" style={{ stroke: "var(--bad)" }} />
          <circle r="7" className="eq" style={{ stroke: "var(--bad)" }} />
        </g>
      ))}
      <rect x="760" y="320" width="76" height="40" rx="5" className="eq" />
      <circle cx="778" cy="366" r="9" className="eq" /><circle cx="820" cy="366" r="9" className="eq" />
      <rect x="250" y="285" width="170" height="70" rx="3" className="eq" style={{ fill: "none", strokeDasharray: "6 5" }} />
      <Cap x={335} y={380}>Burst, crew on site</Cap>
      <Cap x={600} y={305}>Small leak</Cap>
      <Cap x={480} y={118}>Leak loggers</Cap>
      <Cap x={798} y={396}>Repair van</Cap>
    </g>
  );
}

/* ---------- tags: what you can click on each picture ---------- */
const r = (label: string, value: number | string, unit?: string, d = 0): Row => ({ label, value, unit, d });
const z = (id: "Z1" | "Z2" | "Z3" | "Z4" | "Z5") => ZONE_Q(id);

export const SCENES: Record<string, Scene> = {
  source: {
    Art: withStage("source", Source),
    tags: [
      { id: "lit", tag: "LIT-101", name: "River level at the intake", x: 185, y: 108, show: { v: 3.1, unit: " m", d: 1 }, state: "Normal", rows: [r("Level", 3.1, "m", 1), r("Low alarm", 1.5, "m", 1), r("Flood alarm", 5.2, "m", 1)], note: "The intake gates close if the river rises above the flood alarm." },
      { id: "scr", tag: "LDT-101", name: "Bar screen level difference", x: 56, y: 150, show: { v: 0.1, unit: " m", d: 2 }, state: "Normal", rows: [r("Level difference", 0.1, "m", 2), r("Rake starts at", 0.25, "m", 2), r("Debris today", 1.4, "m³", 1)] },
      { id: "ait", tag: "AIT-101", name: "Raw water turbidity", x: 185, y: 392, show: { v: 18, unit: " NTU" }, state: "Normal", rows: [r("Turbidity", 18, "NTU"), r("Plant limit", 150, "NTU"), r("Water temperature", 24.6, "°C", 1)], note: "After rain upriver this can rise above 80 NTU. The plant raises the coagulant dose to match." },
      { id: "p1", tag: "P-101A", kind: "pump", name: "Raw water pump 1", x: 330, y: 126, show: { v: 81, unit: "%" }, state: "Running", load: 81, rows: [r("Speed", 81, "%"), r("Flow", 3150, "m³/h"), r("Power", 180, "kW"), r("Vibration", 2.2, "mm/s", 1)] },
      { id: "p2", tag: "P-101B", kind: "pump", name: "Raw water pump 2", x: 330, y: 196, show: { v: 79, unit: "%" }, state: "Running", load: 79, rows: [r("Speed", 79, "%"), r("Flow", 3140, "m³/h"), r("Power", 175, "kW"), r("Vibration", 2.4, "mm/s", 1)] },
      { id: "p3", tag: "P-101C", kind: "pump", name: "Raw water pump 3", x: 330, y: 266, show: { v: 0, unit: "%" }, state: "Standby", load: 0, rows: [r("Speed", 0, "%"), r("Ready to start", "Yes"), r("Hours run", 3980, "h")], note: "Standby unit. Starts if another pump trips." },
      { id: "xv1", tag: "XV-101A", name: "Pump 1 valve", kind: "valve", x: 435, y: 146, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "xv2", tag: "XV-101B", name: "Pump 2 valve", kind: "valve", x: 435, y: 211, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "xv3", tag: "XV-101C", name: "Pump 3 valve", kind: "valve", x: 435, y: 276, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "fit", tag: "FIT-101", name: "Raw water flow", x: 657, y: 190, show: { v: 6290, unit: " m³/h" }, state: "Normal", rows: [r("Flow", 6290, "m³/h"), r("Permit limit", 7200, "m³/h"), r("Today", 150000, "m³")] },
    ],
  },
  plant: {
    Art: withStage("plant", Plant),
    tags: [
      { id: "coag", tag: "DOS-201", name: "Coagulant dosing", x: 95, y: 46, show: { v: 55, unit: "%" }, state: "Running", load: 55, rows: [r("Dose", 28, "mg/L"), r("Tank level", 70, "%"), r("Pump stroke", 55, "%")], note: "Binds the fine silt so it settles in the tanks." },
      { id: "sc1", tag: "SC-201", name: "Settling tank 1", x: 270, y: 130, show: { v: 0.8, unit: " m", d: 1 }, state: "Running", load: 84, rows: [r("Sludge blanket", 0.8, "m", 1), r("Settled turbidity", 3.4, "NTU", 1), r("Surface loading", 1.1, "m/h", 1)] },
      { id: "sc2", tag: "SC-202", name: "Settling tank 2", x: 270, y: 320, show: { v: 0.9, unit: " m", d: 1 }, state: "Running", load: 86, rows: [r("Sludge blanket", 0.9, "m", 1), r("Settled turbidity", 3.6, "NTU", 1), r("Surface loading", 1.1, "m/h", 1)] },
      { id: "f1", tag: "SF-201", name: "Sand filter 1", x: 525, y: 88, show: { v: 36, unit: "% clogged" }, state: "Running", load: 36, rows: [r("Clogging", 36, "%"), r("Filter run", 31, "h"), r("Filtered turbidity", 0.35, "NTU", 2)] },
      { id: "f2", tag: "SF-202", name: "Sand filter 2", x: 525, y: 173, show: { v: 44, unit: "% clogged" }, state: "Running", load: 44, rows: [r("Clogging", 44, "%"), r("Filter run", 38, "h"), r("Filtered turbidity", 0.38, "NTU", 2)] },
      { id: "f3", tag: "SF-203", name: "Sand filter 3", x: 525, y: 258, show: { v: 51, unit: "% clogged" }, state: "Running", load: 51, rows: [r("Clogging", 51, "%"), r("Filter run", 44, "h"), r("Filtered turbidity", 0.42, "NTU", 2)], note: "Backwash starts at 60%." },
      { id: "cl", tag: "DOS-202", name: "Chlorine dosing", x: 725, y: 36, show: { v: 53, unit: "%" }, state: "Running", load: 53, rows: [r("Dose", 1.6, "mg/L", 1), r("Tank level", 60, "%"), r("Residual after contact", 1.1, "mg/L", 1)], note: "Keeps the water safe all the way to the customer." },
      { id: "tur", tag: "AIT-202", name: "Filtered water turbidity", x: 640, y: 160, show: { v: 0.4, unit: " NTU", d: 1 }, state: "Normal", rows: [r("Turbidity", 0.4, "NTU", 1), r("Limit", 1, "NTU"), r("pH", 7.5, "", 1)] },
      { id: "fit", tag: "FIT-201", name: "Plant output flow", x: 790, y: 195, show: { v: 6165, unit: " m³/h" }, state: "Normal", rows: [r("Flow", 6165, "m³/h"), r("Design", 6667, "m³/h"), r("Today", 147900, "m³")] },
    ],
  },
  ps1: {
    Art: withStage("ps1", Ps1),
    tags: [
      { id: "lit", tag: "LIT-301", name: "Clear-water tank level", x: 145, y: 100, show: { v: 72, unit: "%" }, state: "Normal", load: 72, rows: [r("Level", 72, "%"), r("Stored", 8600, "m³"), r("Cover time", 1.4, "h", 1)] },
      { id: "p1", tag: "P-301A", kind: "pump", name: "High-lift pump 1", x: 330, y: 130, show: { v: 82, unit: "%" }, state: "Running", load: 82, rows: [r("Speed", 82, "%"), r("Flow", 2060, "m³/h"), r("Power", 380, "kW"), r("Vibration", 2.4, "mm/s", 1)] },
      { id: "p2", tag: "P-301B", kind: "pump", name: "High-lift pump 2", x: 330, y: 185, show: { v: 80, unit: "%" }, state: "Running", load: 80, rows: [r("Speed", 80, "%"), r("Flow", 2050, "m³/h"), r("Power", 375, "kW"), r("Vibration", 6.8, "mm/s", 1)], note: "Bearing vibration is trending up. The bearings are changed on 6 November (WO-3133)." },
      { id: "p3", tag: "P-301C", kind: "pump", name: "High-lift pump 3", x: 330, y: 240, show: { v: 78, unit: "%" }, state: "Running", load: 78, rows: [r("Speed", 78, "%"), r("Flow", 2055, "m³/h"), r("Power", 365, "kW"), r("Vibration", 3.1, "mm/s", 1)] },
      { id: "p4", tag: "P-301D", kind: "pump", name: "High-lift pump 4", x: 330, y: 295, show: { v: 0, unit: "%" }, state: "Standby", load: 0, rows: [r("Speed", 0, "%"), r("Ready to start", "Yes"), r("Hours run", 5200, "h")], note: "Standby unit. Takes over if a pump trips or at the evening peak." },
      { id: "xv1", tag: "XV-301A", name: "Pump 1 valve", kind: "valve", x: 420, y: 168, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "xv2", tag: "XV-301B", name: "Pump 2 valve", kind: "valve", x: 420, y: 223, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "xv3", tag: "XV-301C", name: "Pump 3 valve", kind: "valve", x: 420, y: 278, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "xv4", tag: "XV-301D", name: "Pump 4 valve", kind: "valve", x: 420, y: 333, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "sur", tag: "SV-301", name: "Surge vessel", x: 560, y: 88, show: { v: 6.1, unit: " bar", d: 1 }, state: "Normal", rows: [r("Vessel pressure", 6.1, "bar", 1), r("Air cushion", 62, "%")], note: "Absorbs the pressure wave when a pump stops, so the pipes are not hammered." },
      { id: "pit", tag: "PT-01", name: "Discharge pressure", x: 640, y: 180, show: { v: 5.8, unit: " bar", d: 1 }, state: "Normal", rows: [r("Pressure", 5.8, "bar", 1), r("Allowed", "4 to 7", "bar")] },
      { id: "fit", tag: "FT-01", name: "Plant outlet flow", x: 700, y: 255, show: { v: 1712, unit: " L/s" }, state: "Normal", rows: [r("Flow", 1712, "L/s"), r("Pumps on", "3 of 4"), r("Power", 1120, "kW")] },
    ],
  },
  res: {
    Art: withStage("res", Res),
    tags: [
      { id: "lit", tag: "LT-01", name: "Reservoir level", x: 400, y: 128, show: { v: 77, unit: "%" }, state: "Normal", load: 77, rows: [r("Level", 77, "%"), r("Stored", 34600, "m³"), r("Low alarm", 25, "%"), r("Net flow", "Emptying")], note: "The reservoir fills at night and covers the morning and evening peaks." },
      { id: "xv1", tag: "XV-401A", name: "Inlet valve", kind: "valve", x: 340, y: 335, show: { v: 60, unit: "% open" }, state: "Normal", rows: [r("Position", 60, "%"), r("State", "Open")] },
      { id: "xv2", tag: "XV-401B", name: "Outlet valve", kind: "valve", x: 460, y: 335, show: { v: 100, unit: "% open" }, state: "Normal", rows: [r("Position", 100, "%"), r("State", "Open")] },
      { id: "ait", tag: "AT-01", name: "Chlorine after the reservoir", x: 640, y: 340, show: { v: 0.77, unit: " mg/L", d: 2 }, state: "Normal", rows: [r("Free chlorine", 0.77, "mg/L", 2), r("Target", "0.6 to 0.9", "mg/L"), r("Water age in tank", 4, "h", 1)] },
      { id: "qual", tag: "QUALITY", name: "Drinking-water quality", x: 590, y: 400, show: { v: 8, unit: " of 8 pass" }, state: "Normal", special: "quality", rows: [], note: "Live readings of the water leaving the reservoir, against the allowed limits." },
    ],
  },
  trunk: {
    Art: withStage("trunk", Trunk),
    tags: [
      { id: "hub", tag: "PT-HUB", name: "East hub pressure", x: 300, y: 160, show: { v: 4.6, unit: " bar", d: 1 }, state: "Normal", rows: [r("Pressure", 4.6, "bar", 1), r("Flow", 1560, "L/s"), r("Pipe size", "DN1200")] },
      { id: "prv", tag: "PRV-01", name: "Lotus pressure-reducing valve", kind: "valve", x: 520, y: 150, show: { v: 4.2, unit: " bar", d: 1 }, state: "Normal", rows: [r("Set-point", 4.2, "bar", 1), r("Inlet", 5.7, "bar", 1), r("Outlet", 4.2, "bar", 1)], note: "Brings the pressure down so the villas do not see more than 4.5 bar." },
      { id: "fit", tag: "FT-04", name: "Rehab flow", x: 656, y: 190, show: { v: 739, unit: " L/s" }, state: "Normal", rows: [r("Flow", 739, "L/s"), r("Velocity", 1.4, "m/s", 1), r("Pipe size", "DN800")] },
      { id: "p1", tag: "P-501A", kind: "pump", name: "Booster pump 1", x: 420, y: 296, show: { v: 74, unit: "%" }, state: "Running", load: 74, rows: [r("Speed", 74, "%"), r("Flow", 608, "L/s"), r("Head added", 14, "m"), r("Power", 380, "kW")], note: "Lifts the pressure for Narges and Narges, which sit higher up the slope." },
      { id: "p2", tag: "P-501B", kind: "pump", name: "Booster pump 2", x: 420, y: 366, show: { v: 0, unit: "%" }, state: "Standby", load: 0, rows: [r("Speed", 0, "%"), r("Ready to start", "Yes"), r("Hours run", 2410, "h")] },
      { id: "pt2", tag: "PT-05", name: "Narges pressure", x: 650, y: 380, show: { v: 3.4, unit: " bar", d: 1 }, state: "Normal", rows: [r("Pressure", 3.4, "bar", 1), r("Allowed", "2.5 to 7", "bar")] },
    ],
  },
  zones: {
    Art: withStage("zones", Zones),
    tags: [
      { id: "z1", tag: "FT-02", name: "Banafseg inlet", x: 124, y: 105, show: { v: z("Z1").supplied, unit: " L/s" }, state: "Normal", special: "zones", rows: [r("Flow", z("Z1").supplied, "L/s"), r("Pressure", z("Z1").pressure, "bar", 1), r("Water lost", z("Z1").nrw * 100, "%", 1)] },
      { id: "z2", tag: "FT-03", name: "First Settlement inlet", x: 454, y: 105, show: { v: z("Z2").supplied, unit: " L/s" }, state: "Alarm", special: "zones", rows: [r("Flow", z("Z2").supplied, "L/s"), r("Pressure", z("Z2").pressure, "bar", 1), r("Lowest pressure", z("Z2").minPressure, "bar", 1), r("Water lost", z("Z2").nrw * 100, "%", 1)], note: "Pressure at the far end drops below 2.5 bar at the morning peak (WO-3117)." },
      { id: "z3", tag: "FT-04", name: "Rehab inlet", x: 124, y: 225, show: { v: z("Z3").supplied, unit: " L/s" }, state: "Normal", special: "zones", rows: [r("Flow", z("Z3").supplied, "L/s"), r("Pressure", z("Z3").pressure, "bar", 1), r("Water lost", z("Z3").nrw * 100, "%", 1)] },
      { id: "z4", tag: "FT-05", name: "Lotus inlet", x: 454, y: 225, show: { v: z("Z4").supplied, unit: " L/s" }, state: "Normal", special: "zones", rows: [r("Flow", z("Z4").supplied, "L/s"), r("Pressure", z("Z4").pressure, "bar", 1), r("Water lost", z("Z4").nrw * 100, "%", 1)], note: "The highest water loss in the network. A corroded main is leaking 9 L/s." },
      { id: "z5", tag: "FT-06", name: "Narges inlet", x: 124, y: 345, show: { v: z("Z5").supplied, unit: " L/s" }, state: "Normal", special: "zones", rows: [r("Flow", z("Z5").supplied, "L/s"), r("Pressure", z("Z5").pressure, "bar", 1), r("Water lost", z("Z5").nrw * 100, "%", 1)] },
    ],
  },
  meters: {
    Art: withStage("meters", Meters),
    tags: [
      { id: "m1", tag: "AMR-1021", name: "Smart meter, villa", x: 118, y: 196, show: { v: 0.42, unit: " m³/h", d: 2 }, state: "Normal", rows: [r("Flow now", 0.42, "m³/h", 2), r("This month", 18.4, "m³", 1), r("Reading", "Every 15 min")] },
      { id: "m2", tag: "AMR-2210", name: "Smart meter, flat", x: 258, y: 196, show: { v: 0.18, unit: " m³/h", d: 2 }, state: "Normal", rows: [r("Flow now", 0.18, "m³/h", 2), r("This month", 9.8, "m³", 1), r("Reading", "Every 15 min")] },
      { id: "m3", tag: "AMR-3307", name: "Smart meter, shop", x: 398, y: 196, show: { v: 1.2, unit: " m³/h", d: 1 }, state: "Normal", rows: [r("Flow now", 1.2, "m³/h", 1), r("Night flow", 0.3, "m³/h", 1), r("Flag", "Possible leak")] },
      { id: "gw", tag: "GW-N", name: "Radio gateway north", x: 790, y: 120, show: { v: 98.2, unit: "% read", d: 1 }, state: "Running", load: 58, rows: [r("Meters in range", 20900), r("Reading rate", 98.2, "%", 1), r("Signal", -92, "dBm")] },
      { id: "bill", tag: "BILLING", name: "Billing system link", x: 705, y: 380, show: { v: 41800, unit: " meters" }, state: "Normal", rows: [r("Meters in service", 41800), r("Tampering flags", 14), r("Billed today", 123000, "m³")], note: "Water billed against water supplied gives the non-revenue water figure." },
    ],
  },
  leak: {
    Art: withStage("leak", Leak),
    tags: [
      { id: "lk1", tag: "LK-01", name: "Acoustic logger, First Settlement", x: 170, y: 118, show: { v: 62, unit: " dB" }, state: "Alarm", load: 62, rows: [r("Noise level", 62, "dB"), r("Normal", "under 40", "dB"), r("Leak", 6.5, "L/s", 1)] },
      { id: "lk2", tag: "LK-02", name: "Acoustic logger, Rehab", x: 480, y: 88, show: { v: 71, unit: " dB" }, state: "Alarm", load: 71, rows: [r("Noise level", 71, "dB"), r("Normal", "under 40", "dB"), r("Leak", 12, "L/s")], note: "A DN300 joint has failed. Crew on site (WO-3121)." },
      { id: "lk3", tag: "LK-03", name: "Acoustic logger, Lotus", x: 700, y: 118, show: { v: 66, unit: " dB" }, state: "Alarm", load: 66, rows: [r("Noise level", 66, "dB"), r("Normal", "under 40", "dB"), r("Leak", 9, "L/s")] },
      { id: "burst", tag: "BURST", name: "Active burst", x: 335, y: 285, show: { v: 12, unit: " L/s" }, state: "Alarm", rows: [r("Loss", 12, "L/s"), r("Since", "3 days"), r("Water lost so far", 3100, "m³"), r("Repair", "In progress")] },
      { id: "crew", tag: "CREW-1", name: "Repair crew 1", x: 798, y: 300, show: { v: 100, unit: "%" }, state: "Running", load: 100, rows: [r("Task", "WO-3121"), r("Time on site", 5, "h"), r("Estimated finish", "16:30")] },
      { id: "nrw", tag: "NRW", name: "Non-revenue water", x: 600, y: 345, show: { v: 16.8, unit: " %", d: 1 }, state: "Normal", rows: [r("Supplied", 147900, "m³/d"), r("Billed", 123000, "m³/d"), r("Lost", 24900, "m³/d")], note: "A fifth of the zones lose more than 20%. The map shows where." },
    ],
  },
};
