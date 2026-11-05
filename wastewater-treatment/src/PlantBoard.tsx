import { useState } from "react";
import { AlertTriangle, ArrowUp } from "lucide-react";
import { GEN_KW, SOLAR_KW } from "./cmms";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import { CountUp } from "./ui";
import { Bars, Panel } from "./charts";
import { Gauge, KpDefs, Ring } from "./kpiui";
import { PumpArt } from "./PlantArt";
import "./kpi.css";

const UNITS = [
  { id: "PU-01", name: "Influent pump 2", kw: 128, warn: true, note: "Seal replaced 16 Oct (WO-2399). The bearing is still settling." },
  { id: "PU-02", name: "Influent pump 1", kw: 132, warn: false, note: "Running at 82% of rated load. No fault is developing." },
  { id: "PU-03", name: "Influent pump 3", kw: 130, warn: false, note: "Running with influent pumps 1 and 2. Pump 4 is on standby." },
  { id: "PU-04", name: "RAS pump A", kw: 46, warn: false, note: "Return sludge steady at 55% of inflow." },
  { id: "PU-05", name: "Reuse pump 1", kw: 88, warn: false, note: "Feeding farm irrigation and the green belt." },
  { id: "PU-06", name: "Sludge pump 1", kw: 22, warn: false, note: "Feeding the digesters. Cake dryness is 24%." },
];

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

const Legend = () => <span className="kp-leg"><i /> Treatment <i className="alt" /> Distribution</span>;

/** Plant: capacity, costs, solids removal, the isometric plant and the pump yard. Numbers refresh every 10 seconds. */
export default function PlantBoard() {
  const t = useTick();
  const grow = useGrow();
  const [unit, setUnit] = useState(UNITS[0]);
  const cap = wobble(150, 2, t, 0.006);
  const gen = wobble(GEN_KW + SOLAR_KW * 0.45, 3, t, 0.02);
  const cost = wobble(5.9, 4, t, 0.008);
  const cake = wobble(42, 5, t, 0.01);
  const tss = wobble(62, 6, t, 0.008);
  const bod = wobble(96, 17, t, 0.004);
  const cod = wobble(90, 18, t, 0.005);
  const day = wobble(118, 7, t, 0.01);
  const month = wobble(3540, 8, t, 0.008);
  const year = wobble(42500, 9, t, 0.006);
  const sDay = wobble(62, 16, t, 0.01);
  const sMonth = wobble(60, 19, t, 0.008);
  const sAll = wobble(61, 20, t, 0.006);
  const stages = [["Screens", wobble(18, 24, t, 0.02)], ["Primaries", wobble(62, 25, t, 0.01)], ["Secondaries", wobble(28, 26, t, 0.02)]] as const;

  return (
    <div className="bd-fit kp pl2">
      <KpDefs />
      <Panel title="Treatment capacity" className="a-cap" i={0}><Gauge value={cap} max={200} unit="ML/d" grow={grow} /></Panel>

      <Panel title="Cake produced" className="a-prod" i={1}>
        <div className="pl2-prod">
          {([["Last day", day], ["Last month", month], ["Last year", year]] as const).map(([l, v], n) => (
            <div key={l} className="bd-pop" style={{ ["--n" as string]: n }}>
              <span>{l}</span><b><CountUp value={v} decimals={0} /> t</b><ArrowUp size={15} className="up" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Energy cost (LE/ML)" className="a-en" i={2}><Bars labels={["W1", "W2", "W3", "W4"]} values={[57, 62, 75, 59]} unit="LE" grow={grow} /></Panel>
      <Panel title="Power generation" className="a-pw" i={3}><Gauge value={gen} max={2000} unit="kW" grow={grow} tone="warm" /></Panel>
      <Panel title="Operation cost" className="a-op" i={4}><Gauge value={cost} max={10} unit="LE/m³" digits={1} grow={grow} tone="cool" /></Panel>

      <Panel title="Cake cost" className="a-cost" i={5}><Gauge value={cake} max={80} unit="LE/t" grow={grow} tone="warm" /></Panel>
      <Panel title="Plant cost" className="a-plc" i={6}><Gauge value={cost} max={10} unit="LE/m³" digits={1} grow={grow} /></Panel>

      <Panel title="Removals" className="a-rem" i={7}>
        <div className="pl2-rings">
          <Ring value={tss} label="TSS removal" grow={grow} />
          <Ring value={bod} label="BOD removal" grow={grow} tone="cool" />
          <Ring value={cod} label="COD removal" grow={grow} tone="warm" />
        </div>
        <h4>Total solids removed</h4>
        <div className="pl2-mini">
          {([["Day", sDay], ["Month", sMonth], ["All-time", sAll]] as const).map(([l, v]) => (
            <figure key={l}><Gauge value={v} max={100} unit="%" grow={grow} /><figcaption>{l}</figcaption></figure>
          ))}
        </div>
        <h4>Solids removed by stage</h4>
        <div className="pl2-stage">
          {stages.map(([l, v]) => (
            <div key={l}><span>{l}</span><div className="bd-lvl"><i style={{ width: `${grow ? v : 0}%` }} /></div><b><CountUp value={v} decimals={0} />%</b></div>
          ))}
        </div>
      </Panel>

      <section className="hm-p a-iso pl2-iso" style={{ ["--i" as string]: 8 }} aria-label="Plant">
        <img className="pl2-photo bg" src="/plant-night.jpg" alt="" aria-hidden />
        <img className="pl2-photo" src="/plant-night.jpg" alt="Treatment plant at night: influent 6,350 m³/h, aeration O₂ 2.2 mg/L, biogas 12,592 m³/d" />
      </section>

      <Panel title="Pump units" className="a-pump" i={9}>
        <div className="pl2-yard">
          {[UNITS.slice(0, 3), UNITS.slice(3)].map((g, gi) => (
            <div key={gi} className="pl2-grp">
              {g.map((u, k) => (
                <button key={u.id} className={unit.id === u.id ? "on" : ""} style={{ ["--k" as string]: k }} onClick={() => setUnit(u)} aria-pressed={unit.id === u.id} aria-label={`${u.id} ${u.name}`}>
                  <PumpArt />
                  <span className="pill"><i />{u.id}</span>
                  {u.warn && <AlertTriangle size={16} className="warn" />}
                </button>
              ))}
            </div>
          ))}
        </div>
        <p className="pl2-note"><b>{unit.id} · {unit.name}</b> · <CountUp value={wobble(unit.kw, 30, t, 0.02)} decimals={0} /> kW. {unit.note}</p>
      </Panel>

      <Panel title="TSS removal" className="a-tss" i={10}><Gauge value={tss} max={100} unit="%" grow={grow} /></Panel>
      <Panel title="Delivery vs stored (ML/d)" className="a-del" i={11} right={<Legend />}><PairBars labels={["B1", "B2", "B3", "B4"]} a={[50, 48, 51, 87]} b={[12, 14, 11, 8]} grow={grow} /></Panel>
      <Panel title="Water produced (ML)" className="a-tot" i={12}><Bars labels={["B1", "B2", "B3", "B4"]} values={[50, 48, 51, 87]} unit="ML" grow={grow} /></Panel>
      <Panel title="Reuse service (%)" className="a-sat" i={13}><Bars labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]} values={[99, 98, 96, 99, 97, 98]} unit="%" grow={grow} max={100} /></Panel>
      <Panel title="Treatment cost (M)" className="a-plc2" i={14}><Bars labels={["W1", "W2", "W3", "W4"]} values={[6.2, 6.0, 6.4, 5.9]} unit="M" grow={grow} /></Panel>
    </div>
  );
}
