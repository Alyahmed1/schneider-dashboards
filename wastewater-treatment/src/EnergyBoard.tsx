import { useMemo, useState } from "react";
import { LOADS, GEN_KW, SOLAR_KW } from "./cmms";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import { CountUp, Segmented } from "./ui";
import { Panel, niceMax } from "./charts";
import { HBars } from "./boardui";
import { Dial, KpDefs } from "./kpiui";
import "./kpi.css";
import "./kpi-boards.css";

const WINS = ["1h", "8h", "24h", "7d"] as const;
type Win = (typeof WINS)[number];
const HOURS: Record<Win, number> = { "1h": 1, "8h": 8, "24h": 24, "7d": 168 };

type Cell = { caption: string; mode: "value" | "empty" | "live"; value?: number; target?: boolean };

/** Energy: aeration, pumping and the rest of the works, actual against target. Numbers refresh every 10 seconds. */
export default function EnergyBoard() {
  const t = useTick();
  const grow = useGrow();
  const [win, setWin] = useState<Win>("1h");
  const h = HOURS[win];
  const digits = h <= 8 ? 2 : h <= 24 ? 1 : 0;
  const mwh = (kw: number) => (kw * h) / 1000;
  const gridKw = LOADS.reduce((s, l) => s + l.kw, 0) - GEN_KW - SOLAR_KW * 0.5;
  const co2 = wobble(gridKw * 0.45, 4, t, 0.01);
  const target = 560;

  const groups = useMemo(() => {
    const row = (a: Cell, b: Cell): [Cell, Cell] => [a, b];
    const A = (caption: string, v?: number, mode: Cell["mode"] = "value"): Cell => ({ caption, mode, value: v });
    const T = (caption: string, v?: number, mode: Cell["mode"] = "value"): Cell => ({ caption, mode, value: v, target: true });
    return [
      { title: "Aeration", rows: [
        row(A("Actual electrical", mwh(1480)), T("Target electrical", mwh(1400))),
        row(A("Actual process air", mwh(980)), T("Target process air", undefined, "empty")),
        row(A("Actual heat recovery", undefined, "live"), T("Target heat recovery", undefined, "empty")),
      ]},
      { title: "Pumping", rows: [
        row(A("Actual electrical", undefined, "live"), T("Target electrical", undefined, "live")),
        row(A("Actual power", mwh(540)), T("Target power", undefined, "empty")),
      ]},
      { title: "Other equipment", rows: [
        row(A("Actual electrical", mwh(710)), T("Target electrical", mwh(520))),
        row(A("Actual sludge line", mwh(290)), T("Target sludge line", undefined, "empty")),
        row(A("Actual buildings", undefined, "live"), T("Target buildings", 0)),
      ]},
    ];
  }, [h]);

  const bars = [
    { name: "Electrical", value: mwh(2830) },
    { name: "Biogas fuel", value: (520 * 6 * h) / 1000 },
    { name: "Digester heat", value: mwh(380) },
    { name: "Buildings", value: mwh(190) },
  ];
  const max = niceMax(Math.max(...bars.map((b) => b.value)) * 1.05);

  const pairs = (rows: [Cell, Cell][]) => (
    <div className="en2-pairs" style={{ gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))` }}>
      {rows.map((pair, r) => {
        const cap = (Math.max(...pair.map((c) => c.value ?? 0), 0) || mwh(800)) * 1.28;
        return (
          <div key={r} className="en2-pair">
            {pair.map((c) => (
              <Dial key={c.caption} caption={c.caption} mode={c.mode} value={c.value} max={cap} grow={grow} digits={digits} unit="MWh" tone={c.target ? "cool" : "warm"} />
            ))}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="bd-fit kp en2">
      <KpDefs />
      <section className="hm-p en2-head" style={{ ["--i" as string]: 0 }}>
        <Segmented<Win> label="Window" value={win} options={WINS} onChange={setWin} />
        <h2>Energy consumption</h2>
        <div className="en2-co2">
          <div><span>Actual CO₂ emission</span><b className={co2 > target ? "over" : ""}><CountUp value={co2} decimals={0} /> kg/h</b></div>
          <div><span>Target CO₂ emission</span><b><CountUp value={target} decimals={0} /> kg/h</b></div>
        </div>
      </section>
      <Panel title={groups[0].title} className="a-c1" i={1}>{pairs(groups[0].rows)}</Panel>
      <Panel title={groups[1].title} className="a-c2" i={2}>
        {pairs(groups[1].rows)}
        <div className="en2-mix"><h4>Where the energy goes (MWh)</h4><HBars rows={bars.map((b) => ({ ...b, digits }))} max={max} grow={grow} /></div>
      </Panel>
      <Panel title={groups[2].title} className="a-c3" i={3}>{pairs(groups[2].rows)}</Panel>
    </div>
  );
}
