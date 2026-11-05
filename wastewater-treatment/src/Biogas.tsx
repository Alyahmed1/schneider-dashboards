import { useState } from "react";
import { GEN_KW, LOADS, SOLAR_KW } from "./cmms";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import { CountUp, Segmented } from "./ui";
import { Panel } from "./charts";
import { Semi } from "./boardui";
import "./biogas.css";

const PHASES = ["Phase 2", "Phase 1"] as const;
type Phase = (typeof PHASES)[number];

/** sludge feed from the plant model: 190 m³/h into digestion */
const SLUDGE_D = 190 * 24;
const GAS_H = 520;

/* Material-flow symbols: one 120x72 canvas each, same shading classes as the rest of the tab */
const SPARK = (x: number, y: number, d: number) => <circle cx={x} cy={y} r="1.6" className="rise" style={{ ["--d" as string]: `${d}s` }} />;
function Daf() {
  return (
    <svg viewBox="0 0 120 72" aria-hidden>
      {/* flotation tank with skimmer and air bubbles */}
      <ellipse cx="32" cy="58" rx="26" ry="8" className="eq" />
      <path d="M6 58 V28 a26 8 0 0 1 52 0 V58" className="eq" />
      <path d="M6 42 a26 8 0 0 0 52 0 V58 a26 8 0 0 1 -52 0Z" className="eq-liq" />
      <ellipse cx="32" cy="28" rx="26" ry="8" className="eq-top" />
      <path d="M14 27 H50" className="eq-line" />
      <g className="bd-spin slow"><path d="M32 22 V34" className="eq-line" /></g>
      {SPARK(22, 54, 0)}{SPARK(32, 56, 0.7)}{SPARK(43, 53, 1.4)}{SPARK(27, 50, 0.4)}
      <path d="M12 34 Q15 26 19 24" className="spec" />
      {/* thickener with rake */}
      <ellipse cx="94" cy="58" rx="22" ry="7" className="eq" />
      <path d="M72 58 V38 a22 7 0 0 1 44 0 V58" className="eq" />
      <ellipse cx="94" cy="38" rx="22" ry="7" className="eq-top" />
      <path d="M94 24 V38" className="eq-line" /><circle cx="94" cy="23" r="3" className="eq-dome" />
      <g className="bd-spin slow"><path d="M76 38 H112" className="eq-line" /></g>
      <path d="M75 46 Q77 40 80 38" className="spec" />
      {/* link pipe */}
      <path d="M58 46 H72" className="pipe" /><path d="M58 46 H72" className="pipe-flow" />
    </svg>
  );
}
function Mix() {
  return (
    <svg viewBox="0 0 120 72" aria-hidden>
      <ellipse cx="60" cy="60" rx="30" ry="8" className="eq" />
      <path d="M30 60 V26 a30 9 0 0 1 60 0 V60" className="eq" />
      <path d="M30 42 a30 9 0 0 0 60 0 V60 a30 9 0 0 1 -60 0Z" className="eq-liq" />
      <ellipse cx="60" cy="26" rx="30" ry="9" className="eq-top" />
      {/* motor, shaft, impeller */}
      <rect x="51" y="4" width="18" height="12" rx="3" className="eq-dome" />
      <path d="M60 16 V50" className="eq-line" strokeWidth="2.4" />
      <g className="bd-spin slow"><path d="M44 50 H76" className="eq-line" strokeWidth="3" /><path d="M48 46 H72" className="eq-line" /></g>
      <path d="M34 34 V56" className="spec" />
      {SPARK(46, 54, 0)}{SPARK(74, 52, 0.9)}{SPARK(60, 56, 1.7)}
      <path d="M90 32 H104" className="pipe" /><path d="M16 44 H30" className="pipe" />
    </svg>
  );
}
function Domes() {
  return (
    <svg viewBox="0 0 120 72" aria-hidden>
      <path d="M22 10 H98" className="pipe" />
      {[22, 60, 98].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 10 V22`} className="pipe" />
          <ellipse cx={x} cy="62" rx="17" ry="7" className="eq" />
          <path d={`M${x - 17} 62 V40 a17 8 0 0 1 34 0 V62`} className="eq" />
          <path d={`M${x - 17} 40 Q${x} 14 ${x + 17} 40`} className="eq-dome" />
          <path d={`M${x - 11} 38 Q${x - 7} 24 ${x - 1} 20`} className="spec" />
          <path d={`M${x - 17} 54 H${x + 17}`} className="eq-line" />
          <circle cx={x - 5} cy="48" r="1.7" className="rise" style={{ ["--d" as string]: `${i * 0.5}s` }} />
          <circle cx={x + 5} cy="56" r="1.5" className="rise" style={{ ["--d" as string]: `${i * 0.5 + 0.9}s` }} />
          <circle cx={x} cy="34" r="1.6" className="hm-bub" style={{ ["--d" as string]: `${i * 0.4}s` }} />
        </g>
      ))}
    </svg>
  );
}
function Store() {
  return (
    <svg viewBox="0 0 120 72" aria-hidden>
      <ellipse cx="60" cy="62" rx="28" ry="8" className="eq" />
      <path d="M32 62 V20 a28 9 0 0 1 56 0 V62" className="eq" />
      <path d="M32 40 a28 9 0 0 0 56 0 V62 a28 9 0 0 1 -56 0Z" className="eq-liq" />
      <ellipse cx="60" cy="20" rx="28" ry="9" className="eq-dome" />
      <rect x="55" y="8" width="10" height="7" rx="2" className="eq-top" />
      {/* level window and ladder */}
      <rect x="66" y="26" width="8" height="30" rx="4" className="eq-top" />
      <path d="M78 24 V58 M84 26 V58 M78 32 H84 M78 40 H84 M78 48 H84 M78 56 H84" className="eq-line" strokeWidth="1.2" />
      <path d="M37 22 V58" className="spec" />
    </svg>
  );
}
function Press() {
  return (
    <svg viewBox="0 0 120 72" aria-hidden>
      <rect x="10" y="22" width="92" height="30" rx="15" className="eq" />
      <rect x="14" y="26" width="84" height="22" rx="11" className="eq-line-fill" />
      {[26, 44, 62, 80].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="37" r="7" className="eq-top" />
          <g className="bd-spin slow" style={{ animationDelay: `${-i * 0.3}s` }}><circle cx={x} cy="37" r="2.4" className="eq-dome" /></g>
        </g>
      ))}
      <path d="M14 22 H98" className="eq-line" />
      {/* sludge in, cake pile out */}
      <path d="M12 8 V20" className="pipe" />
      <path d="M96 66 L108 46 L120 66Z" className="eq-dome" />
      {SPARK(32, 56, 0)}{SPARK(58, 58, 0.8)}
      <circle cx="40" cy="58" r="1.6" className="rise" style={{ ["--d" as string]: "0.4s" }} />
    </svg>
  );
}
function MiniDome() {
  return (
    <svg viewBox="0 0 40 32" aria-hidden>
      <ellipse cx="20" cy="26" rx="12" ry="4" className="eq" />
      <path d="M8 26 V18 a12 8 0 0 1 24 0 V26" className="eq" />
      <path d="M8 18 Q20 4 32 18" className="eq-dome" />
      <path d="M12 17 Q15 9 21 7" className="spec" />
      <circle cx="17" cy="23" r="1.4" className="rise" />
      <circle cx="24" cy="24" r="1.1" className="rise" style={{ ["--d" as string]: ".8s" }} />
    </svg>
  );
}

function Defs() {
  return (
    <svg className="bio-defs" aria-hidden focusable="false">
      <defs>
        <linearGradient id="bio-steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#0d2a38" /><stop offset=".35" stopColor="#4d8fa3" /><stop offset=".6" stopColor="#2a6176" /><stop offset="1" stopColor="#0a2230" /></linearGradient>
        <linearGradient id="bio-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fe9ee" /><stop offset="1" stopColor="#1f8d9b" /></linearGradient>
        <linearGradient id="bio-dome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9ff6ee" /><stop offset=".55" stopColor="#25a9a6" /><stop offset="1" stopColor="#0b5d66" /></linearGradient>
        <linearGradient id="bio-arc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#0a8f95" /><stop offset="1" stopColor="#7ff7ee" /></linearGradient>
        <linearGradient id="bio-fire" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ff5a1f" /><stop offset=".6" stopColor="#ff9a2e" /><stop offset="1" stopColor="#ffe08a" /></linearGradient>
        <linearGradient id="bio-ice" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#1f6fd1" /><stop offset=".6" stopColor="#3aa0ff" /><stop offset="1" stopColor="#bfeaff" /></linearGradient>
      </defs>
    </svg>
  );
}
function Flame({ blue }: { blue?: boolean }) {
  return (
    <svg className="ico" viewBox="0 0 48 48" aria-hidden>
      <path className="flame" d="M24 4 C26 14 38 18 38 30 a14 14 0 0 1 -28 0 C10 24 15 22 16 16 C19 19 20 21 21 22 C22 16 22 10 24 4Z" fill={blue ? "url(#bio-ice)" : "url(#bio-fire)"} />
      <path className="flame" d="M24 24 C25 29 30 30 30 35 a6 6 0 0 1 -12 0 C18 31 22 30 24 24Z" fill="#fff" opacity=".6" />
    </svg>
  );
}
function Scale() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden>
      <path d="M24 8 V38 M14 40 H34 M10 14 H38" className="eq-line" strokeWidth="2" />
      <path d="M10 14 L5 26 a5 3 0 0 0 10 0Z M38 14 L33 26 a5 3 0 0 0 10 0Z" className="eq-dome" />
    </svg>
  );
}
function Engine() {
  return (
    <svg viewBox="0 0 56 42" aria-hidden>
      <rect x="6" y="14" width="38" height="20" rx="3" className="eq" />
      <rect x="12" y="8" width="8" height="8" className="eq-top" /><rect x="24" y="8" width="8" height="8" className="eq-top" />
      <rect x="44" y="18" width="8" height="12" rx="2" className="eq-dome" />
      <path d="M10 26 H40" className="eq-line" />
    </svg>
  );
}
function Boiler() {
  return (
    <svg viewBox="0 0 56 42" aria-hidden>
      <rect x="8" y="12" width="36" height="22" rx="10" className="eq" />
      <rect x="16" y="4" width="6" height="10" className="eq-top" />
      <path d="M14 22 H38 M14 27 H38" className="eq-line" />
      <path className="flame" d="M48 34 q-3 -6 0 -10 q1 3 3 4 q2 2 -3 6Z" fill="url(#bio-fire)" />
    </svg>
  );
}

const ICONS = [Daf, Mix, Domes, Store, Press];
const NAMES = ["DAF + thickening", "Mixing tank", "Digesters", "Storage tank", "Belt presses"];

/** Biogas operations: the sludge line, three digester feeds, CHP and digester heat. Same motion as the rest of the plant. */
export default function Biogas() {
  const t = useTick();
  const grow = useGrow();
  const [phase, setPhase] = useState<Phase>("Phase 2");
  const [tank, setTank] = useState<number | null>(null);
  const k = phase === "Phase 2" ? 1 : 0.86;
  const day = SLUDGE_D * k;
  const daf = wobble(Math.round(day * 1250 / 2170), 3, t, 0.008);
  const thk = wobble(day - daf, 4, t, 0.008);
  const mix = daf + thk;
  const feed = wobble(mix * 2100 / 2170, 5, t, 0.006);
  const balance = mix - feed;
  const shares = [0.99, 1.02, 0.99];
  const feeds = shares.map((s, i) => wobble((feed / 3) * s, 10 + i, t, 0.01));
  const gas = wobble(GAS_H * 24 * k, 21, t, 0.008);
  const holder = wobble(phase === "Phase 2" ? 72 : 61, 22, t, 0.006);
  const store = wobble(phase === "Phase 2" ? 72 : 64, 23, t, 0.006);
  const cake = wobble(118 * k, 24, t, 0.01);
  const load = wobble(phase === "Phase 2" ? 83 : 74, 25, t, 0.008);
  const chpMWh = (GEN_KW * 24 / 1000) * k;
  const solarMWh = (SOLAR_KW * 5 / 1000) * k;
  const plantMWh = (LOADS.reduce((s, l) => s + l.kw, 0) * 24 / 1000) * k;
  const grid = plantMWh - chpMWh - solarMWh;
  const made = chpMWh + solarMWh;
  const belts = phase === "Phase 2" ? "4 / 5" : "3 / 5";
  const flap = phase === "Phase 2" ? 45 : 28;
  const live = (n: number, seed: number) => wobble(n, seed, t, 0.008);

  const foot = [
    { l: "Plant consumption", v: live(plantMWh, 31), u: "MWh/day", d: 0 },
    { l: "Grid import", v: live(grid, 32), u: "MWh/day", d: 0 },
    { l: `CHP · ${Math.round((chpMWh / made) * 100)}%`, v: live(chpMWh, 33), u: "MWh/day", d: 0 },
    { l: `Solar · ${Math.round((solarMWh / made) * 100)}%`, v: live(solarMWh, 34), u: "MWh/day", d: 1 },
    { l: "Energy produced", v: live(made, 35), u: "MWh/day", d: 0 },
    { l: "Gas produced", v: gas, u: "m³/day", d: 0 },
  ];

  return (
    <div className="bd-fit bg bio">
      <Defs />
      <Panel title="Material flow" className="bg-flow" i={0} right={<Segmented<Phase> label="Biogas phase" value={phase} options={PHASES} onChange={setPhase} />}>
        <div className="bg-stages">
          {NAMES.map((name, i) => {
            const Icon = ICONS[i];
            return (
              <div key={name} className="bg-stage" style={{ ["--n" as string]: i }}>
                <Icon />
                <span>{name}</span>
                {i < 4 && (
                  <svg className="bg-go" viewBox="0 0 16 16" aria-hidden>
                    <path className="flow" d="M1 8 H12" /><path d="M9 4 L13 8 L9 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
        <div className="bg-metrics">
          <div className="bg-col">
            <div className="mcard bd-pop" style={{ ["--n" as string]: 0 }}><span>DAF to mixing</span><b><CountUp value={daf} /> <small>m³</small></b><em>Concentration 60%</em></div>
            <div className="mcard bd-pop" style={{ ["--n" as string]: 1 }}><span>Thickened to mixing</span><b><CountUp value={thk} /> <small>m³</small></b><em>Concentration 40%</em></div>
          </div>
          <div className="bg-col">
            <div className="mcard bd-pop" style={{ ["--n" as string]: 2 }}><span>Total to mixing tank</span><b><CountUp value={mix} /> <small>m³</small></b><em>Concentration 45%</em></div>
          </div>
          <div className="bg-col">
            <div className="mcard bd-pop" style={{ ["--n" as string]: 3 }}><span>Total feed to tanks</span><b><CountUp value={feed} /> <small>m³</small></b><em>3 tanks</em></div>
          </div>
          <div className="bg-col">
            <div className="mcard bd-pop" style={{ ["--n" as string]: 4 }}><span>Storage tank level</span><b className="xl"><CountUp value={store} decimals={0} />%</b><div className="bd-lvl"><i style={{ width: `${grow ? store : 0}%` }} /></div></div>
          </div>
          <div className="bg-col">
            <div className="mcard bd-pop" style={{ ["--n" as string]: 5 }}><span>Belt presses</span><b>{belts} <small>active</small></b></div>
            <div className="mcard bd-pop" style={{ ["--n" as string]: 6 }}><span>Cake</span><b><CountUp value={cake} decimals={0} /> <small>t/day</small></b><em>Dryness 24%</em></div>
          </div>
        </div>
      </Panel>

      <div className="bg-side">
        <Panel title="Gas production" i={1}><Flame /><div className="num"><b className="bd-big"><CountUp value={gas} /></b><span className="bd-unit">m³/day</span></div></Panel>
        <Panel title="Gas yield" i={2}><Flame blue /><div className="num"><b className="bd-big"><CountUp value={wobble(0.81 * (phase === "Phase 2" ? 1 : 0.96), 26, t, 0.006)} decimals={2} /></b><span className="bd-unit">m³ gas / m³ feed</span></div></Panel>
        <Panel title="Gas holder" i={3}>
          <div className="ico"><MiniDome /></div>
          <div className="num"><b className="bd-big"><CountUp value={holder} decimals={0} />%</b></div>
          <div className="bd-lvl"><i style={{ width: `${grow ? holder : 0}%` }} /></div>
        </Panel>
      </div>

      <Panel title="Feed per digester tank" className="bg-feed" i={4}>
        <div className="bg-feed-row">
          <div className="bg-tanks">
            {feeds.map((v, i) => (
              <button key={i} className={tank === i ? "on" : ""} style={{ ["--n" as string]: i }} onClick={() => setTank(tank === i ? null : i)} aria-pressed={tank === i}>
                <MiniDome />
                <b>Tank {i + 1}</b>
                <span><CountUp value={v} decimals={0} /> m³</span>
              </button>
            ))}
          </div>
          <div className="bg-feed-side">
            <div className="mcard" style={{ gridTemplateColumns: "34px 1fr", alignItems: "center", columnGap: 8 }}><div style={{ gridRow: "1 / 3" }}><Domes /></div><span>Total feed to digesters</span><b><CountUp value={feed} /> <small>m³</small></b></div>
            <div className="mcard" style={{ gridTemplateColumns: "34px 1fr", alignItems: "center", columnGap: 8 }}><div style={{ gridRow: "1 / 3" }}><Scale /></div><span>{tank === null ? "Balance" : `Tank T${tank + 1}`}</span><b style={{ color: "var(--good)" }}>{tank === null ? "+" : ""}<CountUp value={tank === null ? balance : feeds[tank]} decimals={0} /> <small>m³</small></b></div>
          </div>
        </div>
      </Panel>

      <div className="bg-ops">
        <Panel title="CHP engine" i={5}>
          <div className="bg-engine">
            <div className="bg-frac"><Engine /><b>1 / 1</b><span>Running</span></div>
            <Semi value={load} max={100} unit="%" grow={grow} label="Load" />
            <div className="bg-temps">
              <div className="mcard gas"><span>Gas to the engine</span><b><CountUp value={gas * 0.82} /> <small>m³/day</small></b></div>
              <div className="mcard"><span>Energy</span><b><CountUp value={live(chpMWh, 41)} decimals={0} /> <small>MWh</small></b></div>
              <div className="mcard hot"><span>Heat out</span><b><CountUp value={live(92, 42)} decimals={0} /> °C</b></div>
              <div className="mcard cold"><span>Heat return</span><b><CountUp value={live(85, 43)} decimals={0} /> °C</b></div>
            </div>
          </div>
        </Panel>
        <Panel title="Digester boilers" i={6}>
          <div className="bg-boil">
            <div className="bg-frac"><Boiler /><b>2 / 2</b><span>Running</span></div>
            <div className="mcard gas"><span>Gas to the boilers</span><b><CountUp value={gas * 0.18} /> <small>m³/day</small></b></div>
            <div className="mcard hot"><span>Outlet</span><b><CountUp value={live(92, 44)} decimals={0} /> °C</b></div>
            <div className="mcard cold"><span>Return</span><b><CountUp value={live(76, 45)} decimals={0} /> °C</b></div>
          </div>
        </Panel>
        <Panel title="Exhaust flap" i={7}>
          <svg className="flap" viewBox="0 0 80 80" aria-hidden>
            <circle cx="40" cy="40" r="32" className="eq" />
            <circle cx="40" cy="40" r="26" fill="none" stroke="#5cf0ea" strokeOpacity=".5" strokeDasharray="2 4" />
            <g className="fan">{[0, 72, 144, 216, 288].map((a) => <path key={a} d="M40 40 C36 26 44 16 40 12 C50 18 48 32 40 40Z" className="eq-dome" transform={`rotate(${a} 40 40)`} />)}</g>
            <circle cx="40" cy="40" r="5" className="eq-top" />
          </svg>
          <div className="bd-row"><span className="bd-sub">Discs</span><b>1</b></div>
          <div className="bd-row"><span className="bd-sub">Angle</span><b><CountUp value={flap} decimals={0} /> deg</b></div>
        </Panel>
      </div>

      <div className="bg-foot">
        {[
          { t: "Plant consumption", items: [foot[0], foot[1]] },
          { t: "Production sources", items: [foot[2], foot[3]] },
          { t: "Output", items: [foot[4], foot[5]] },
        ].map((g, gi) => (
          <Panel key={g.t} title={g.t} i={8 + gi}>
            <div className="bg-pair">
              {g.items.map((c, n) => (
                <div key={c.l} className="hm-tile" style={{ ["--n" as string]: n }}>
                  <span>{c.l}</span>
                  <b><CountUp value={c.v} decimals={c.d} /> {c.u}</b>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
