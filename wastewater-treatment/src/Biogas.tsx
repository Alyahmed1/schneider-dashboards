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

function Daf() {
  return (
    <svg viewBox="0 0 92 58" aria-hidden>
      <ellipse cx="28" cy="40" rx="20" ry="7" className="eq" />
      <path d="M8 40 V26 a20 7 0 0 1 40 0 V40" className="eq" />
      <ellipse cx="28" cy="26" rx="20" ry="7" className="eq-top" />
      <circle cx="22" cy="24" r="1.4" className="hm-bub" style={{ ["--d" as string]: "0s" }} />
      <circle cx="32" cy="22" r="1.1" className="hm-bub" style={{ ["--d" as string]: ".6s" }} />
      <ellipse cx="68" cy="42" rx="16" ry="6" className="eq" />
      <path d="M52 42 V30 a16 6 0 0 1 32 0 V42" className="eq" />
      <ellipse cx="68" cy="30" rx="16" ry="6" className="eq-top" />
    </svg>
  );
}
function Mix() {
  return (
    <svg viewBox="0 0 72 58" aria-hidden>
      <ellipse cx="36" cy="44" rx="22" ry="7" className="eq" />
      <path d="M14 44 V24 a22 8 0 0 1 44 0 V44" className="eq" />
      <ellipse cx="36" cy="24" rx="22" ry="8" className="eq-top" />
      <path d="M18 28 V42" className="spec" />
      <g className="bd-spin slow">
        <path d="M36 14 V34 M28 28 H44" className="eq-line" />
      </g>
    </svg>
  );
}
function Domes() {
  return (
    <svg viewBox="0 0 92 58" aria-hidden>
      {[16, 46, 76].map((x, i) => (
        <g key={x}>
          <ellipse cx={x} cy="44" rx="14" ry="6" className="eq" />
          <path d={`M${x - 14} 44 V34 a14 10 0 0 1 28 0 V44`} className="eq" />
          <path d={`M${x - 14} 34 Q${x} 14 ${x + 14} 34`} className="eq-dome" />
          <circle cx={x - 2} cy="30" r="1.2" className="hm-bub" style={{ ["--d" as string]: `${i * 0.4}s` }} />
          <circle cx={x + 3} cy="40" r="1.7" className="rise" style={{ ["--d" as string]: `${i * 0.5}s` }} />
          <circle cx={x - 5} cy="42" r="1.3" className="rise" style={{ ["--d" as string]: `${i * 0.5 + 0.9}s` }} />
          <path d={`M${x - 9} 33 Q${x - 6} 21 ${x - 1} 18`} className="spec" />
        </g>
      ))}
    </svg>
  );
}
function Store() {
  return (
    <svg viewBox="0 0 64 58" aria-hidden>
      <ellipse cx="32" cy="46" rx="20" ry="6" className="eq" />
      <path d="M12 46 V18 a20 8 0 0 1 40 0 V46" className="eq" />
      <ellipse cx="32" cy="18" rx="20" ry="8" className="eq-dome" />
      <path d="M14 36 H50" className="eq-line" />
      <path d="M17 22 V43" className="spec" />
    </svg>
  );
}
function Press() {
  return (
    <svg viewBox="0 0 80 58" aria-hidden>
      <rect x="8" y="28" width="64" height="16" rx="2" className="eq" />
      <circle cx="22" cy="36" r="7" className="eq-top" />
      <circle cx="40" cy="36" r="7" className="eq-top" />
      <circle cx="58" cy="36" r="7" className="eq-top" />
      <g className="bd-spin slow"><circle cx="40" cy="36" r="2" className="eq-dome" /></g>
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

/** Biogas operations: the sludge line, eight digester feeds, CHP and digester heat. Same motion as the rest of the plant. */
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
  const shares = [0.98, 1.02, 1, 0.99, 1.01, 1, 0.97, 1.03];
  const feeds = shares.map((s, i) => wobble((feed / 8) * s, 10 + i, t, 0.01));
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
            <div className="mcard bd-pop" style={{ ["--n" as string]: 3 }}><span>Total feed to tanks</span><b><CountUp value={feed} /> <small>m³</small></b><em>8 tanks</em></div>
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
                <b>T{i + 1}</b>
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
