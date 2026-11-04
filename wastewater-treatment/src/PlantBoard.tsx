import { useState } from "react";
import { ArrowUp, AlertTriangle } from "lucide-react";
import { GEN_KW, SOLAR_KW } from "./cmms";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import { CountUp } from "./ui";
import { Bars, Panel } from "./charts";
import { Donut, Semi } from "./boardui";

const UNITS = [
  { id: "PU-01", name: "Influent pump 2", kw: 128, warn: true, note: "Seal replaced 16 Oct (WO-2399). The bearing is still settling." },
  { id: "PU-02", name: "Influent pump 1", kw: 132, warn: false, note: "Running at 82% of rated load. No fault is developing." },
  { id: "PU-03", name: "Influent pump 3", kw: 130, warn: false, note: "Running with influent pumps 1 and 2. Pump 4 is on standby." },
  { id: "PU-04", name: "RAS pump A", kw: 46, warn: false, note: "Return sludge steady at 55% of inflow." },
  { id: "PU-05", name: "Reuse pump 1", kw: 88, warn: false, note: "Feeding farm irrigation and the green belt." },
  { id: "PU-06", name: "Sludge pump 1", kw: 22, warn: false, note: "Feeding the digesters. Cake dryness is 24%." },
];

function Skid() {
  return (
    <svg viewBox="0 0 72 36" aria-hidden>
      <rect x="4" y="28" width="64" height="5" className="eq" />
      <rect x="36" y="12" width="24" height="16" className="eq" />
      <circle cx="22" cy="20" r="10" className="eq-top" />
      <circle cx="22" cy="20" r="3" className="eq-dome" />
    </svg>
  );
}

function PairBars({ labels, a, b, grow }: { labels: string[]; a: number[]; b: number[]; grow: boolean }) {
  const max = Math.max(...a, ...b) * 1.15;
  return (
    <div className="hm-cols bd-cols">
      {labels.map((lb, i) => (
        <div key={lb} className="hm-col">
          <b>{Math.round(a[i])}</b>
          <div className="bd-pairtracks">
            <div className="hm-track"><i style={{ height: `${grow ? Math.max(2, (a[i] / max) * 100) : 2}%`, transitionDelay: `${i * 90}ms` }} /></div>
            <div className="hm-track alt"><i style={{ height: `${grow ? Math.max(2, (b[i] / max) * 100) : 2}%`, transitionDelay: `${i * 90 + 40}ms` }} /></div>
          </div>
          <span>{lb}</span>
        </div>
      ))}
    </div>
  );
}

/** Plant: capacity, solids removal and the pump yard, with the same grow-in as the other boards. */
export default function PlantBoard() {
  const t = useTick();
  const grow = useGrow();
  const [unit, setUnit] = useState(UNITS[0]);
  const cap = wobble(150, 2, t, 0.006);
  const gen = wobble(GEN_KW + SOLAR_KW * 0.45, 3, t, 0.02);
  const cost = wobble(5.9, 4, t, 0.008);
  const cake = wobble(42, 5, t, 0.01);
  const tss = wobble(62, 6, t, 0.008);
  const day = wobble(118, 7, t, 0.01);
  const month = wobble(3540, 8, t, 0.008);
  const year = wobble(42500, 9, t, 0.006);

  return (
    <div className="bd-fit pl">
      <div className="pl-top">
        <Panel title="Treatment capacity" i={0}><Semi value={cap} max={200} unit="ML/d" grow={grow} /></Panel>
        <Panel title="Cake produced" i={1}>
          <div className="pl-prod">
            <div className="bd-pop" style={{ ["--n" as string]: 0 }}><span>Last day</span><b><CountUp value={day} decimals={0} /> t <ArrowUp size={14} className="up" /></b></div>
            <div className="bd-pop" style={{ ["--n" as string]: 1 }}><span>Last month</span><b><CountUp value={month} decimals={0} /> t <ArrowUp size={14} className="up" /></b></div>
            <div className="bd-pop" style={{ ["--n" as string]: 2 }}><span>Last year</span><b><CountUp value={year} decimals={0} /> t <ArrowUp size={14} className="up" /></b></div>
          </div>
        </Panel>
        <Panel title="Energy" i={2}><Bars labels={["W1", "W2", "W3", "W4"]} values={[450, 470, 460, 440]} unit="Wh" grow={grow} /></Panel>
        <Panel title="Power generation" i={3}><Semi value={gen} max={2000} unit="kW" digits={0} grow={grow} /></Panel>
        <Panel title="Treatment cost" i={4}><Semi value={cost} max={10} unit="LE/m³" digits={1} grow={grow} /></Panel>
      </div>

      <div className="pl-mid">
        <div className="pl-stack">
          <Panel title="Cake cost" i={5}><Semi value={cake} max={80} unit="LE/t" digits={0} grow={grow} /></Panel>
          <Panel title="Plant cost" i={6}><Semi value={cost} max={10} unit="LE/m³" digits={1} grow={grow} /></Panel>
          <Panel title="TSS removal" i={7}><Semi value={tss} max={100} unit="%" digits={0} grow={grow} /></Panel>
        </div>
        <Panel title="Removals" i={8}>
          <div className="pl-rem">
            <Donut value={62} label="TSS" grow={grow} />
            <Donut value={96} label="BOD" grow={grow} />
            <Donut value={90} label="COD" grow={grow} />
          </div>
          <div className="pl-solid">
            <div className="bd-row"><span>Today</span><b><CountUp value={wobble(62, 16, t, 0.01)} decimals={0} />%</b></div>
            <div className="bd-lvl"><i style={{ width: `${grow ? 62 : 0}%` }} /></div>
            <div className="bd-row"><span>This month</span><b><CountUp value={60} decimals={0} />%</b></div>
            <div className="bd-lvl"><i style={{ width: `${grow ? 60 : 0}%` }} /></div>
            <div className="bd-row"><span>All time</span><b><CountUp value={61} decimals={0} />%</b></div>
            <div className="bd-lvl"><i style={{ width: `${grow ? 61 : 0}%` }} /></div>
            <div className="bd-row"><span>Screens 18% · Primaries 62% · Secondaries 28%</span></div>
          </div>
        </Panel>
        <section className="hm-p pl-iso" style={{ ["--i" as string]: 9 }} aria-label="Plant">
          <svg viewBox="0 0 640 320" role="img">
            <rect width="640" height="320" fill="var(--hm-land)" />
            <rect x="36" y="150" width="90" height="70" fill="var(--card)" stroke="var(--eq-edge)" />
            <rect x="48" y="128" width="66" height="22" fill="var(--surface-3)" stroke="var(--eq-edge)" />
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <rect x={160 + i * 70} y="70" width="58" height="120" rx="4" fill="var(--surface-3)" stroke="var(--teal)" />
                <circle cx={178 + i * 70} cy="110" r="2" className="hm-bub" style={{ ["--d" as string]: `${i * 0.4}s` }} />
                <circle cx={196 + i * 70} cy="140" r="1.6" className="hm-bub" style={{ ["--d" as string]: `${0.6 + i * 0.3}s` }} />
              </g>
            ))}
            <circle cx="430" cy="120" r="48" fill="color-mix(in srgb, var(--teal) 30%, var(--card))" stroke="var(--teal)" strokeWidth="2" />
            <g className="hm-scraper"><line x1="430" y1="120" x2="474" y2="120" stroke="var(--ink)" /></g>
            <circle cx="530" cy="150" r="36" fill="color-mix(in srgb, var(--blue) 28%, var(--card))" stroke="var(--blue)" strokeWidth="2" />
            <ellipse cx="250" cy="250" rx="36" ry="16" className="eq" />
            <path d="M214 250 V230 Q250 200 286 230 V250" className="eq-dome" />
            <path className="hm-pipe clean" d="M126 185 H160 M368 130 H382 M478 120 H494" />
          </svg>
        </section>
        <Panel title="Pump units" i={10}>
          <div className="pl-units">
            {UNITS.map((u) => (
              <button key={u.id} className={unit.id === u.id ? "on" : ""} onClick={() => setUnit(u)} aria-pressed={unit.id === u.id}>
                {u.warn && <AlertTriangle size={14} className="warn" />}
                <Skid />
                <b>{u.id}</b>
              </button>
            ))}
          </div>
          <p className="pl-note"><b>{unit.name}</b> · <CountUp value={wobble(unit.kw, 30, t, 0.02)} decimals={0} /> kW. {unit.note}</p>
        </Panel>
      </div>

      <div className="pl-bot">
        <Panel title="TSS removal" i={11}><Semi value={tss} max={100} unit="%" digits={0} grow={grow} /></Panel>
        <Panel title="Delivery and stored" i={12}><PairBars labels={["A", "B", "C", "Use"]} a={[50, 48, 51, 87]} b={[12, 14, 11, 8]} grow={grow} /></Panel>
        <Panel title="Water produced" i={13}><Bars labels={["A", "B", "C", "Use"]} values={[50, 48, 51, 87]} unit="ML" grow={grow} /></Panel>
        <Panel title="Reuse service" i={14}><Bars labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]} values={[99, 98, 96, 99, 97, 98]} unit="%" grow={grow} max={100} /></Panel>
        <Panel title="Treatment cost" i={15}><Bars labels={["W1", "W2", "W3", "W4"]} values={[6.2, 6.0, 6.4, 5.9]} unit="M" grow={grow} /></Panel>
      </div>
    </div>
  );
}
