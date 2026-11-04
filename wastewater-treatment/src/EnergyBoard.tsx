import { useMemo, useState } from "react";
import { LOADS, GEN_KW, SOLAR_KW } from "./cmms";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import { CountUp, Segmented } from "./ui";
import { Panel, niceMax } from "./charts";
import { HBars, Ring } from "./boardui";

const WINS = ["1h", "8h", "24h", "7d"] as const;
type Win = (typeof WINS)[number];
const HOURS: Record<Win, number> = { "1h": 1, "8h": 8, "24h": 24, "7d": 168 };

type Cell = { caption: string; mode: "value" | "empty" | "live"; value?: number; tone: "teal" | "bad" | "blue" | "live" };

/** Energy: aeration, pumping and the rest of the works against target. Rings grow in like the other gauges. */
export default function EnergyBoard() {
  const t = useTick();
  const grow = useGrow();
  const [win, setWin] = useState<Win>("1h");
  const h = HOURS[win];
  const digits = h <= 8 ? 2 : h <= 24 ? 1 : 0;
  const mwh = (kw: number) => kw * h / 1000;
  const gridKw = LOADS.reduce((s, l) => s + l.kw, 0) - GEN_KW - SOLAR_KW * 0.5;
  const co2 = wobble(gridKw * 0.45, 4, t, 0.01);
  const target = 560;

  const groups = useMemo(() => {
    const row = (a: Cell, b: Cell): [Cell, Cell] => [a, b];
    return [
      { title: "Aeration", rows: [
        row({ caption: "Actual electrical", mode: "value", value: mwh(1480), tone: "bad" }, { caption: "Target electrical", mode: "value", value: mwh(1400), tone: "blue" }),
        row({ caption: "Actual process air", mode: "value", value: mwh(980), tone: "bad" }, { caption: "Target process air", mode: "empty", tone: "blue" }),
        row({ caption: "Actual heat recovery", mode: "live", tone: "live" }, { caption: "Target heat recovery", mode: "empty", tone: "blue" }),
      ]},
      { title: "Pumping", rows: [
        row({ caption: "Actual electrical", mode: "live", tone: "live" }, { caption: "Target electrical", mode: "live", tone: "live" }),
        row({ caption: "Actual power", mode: "value", value: mwh(540), tone: "teal" }, { caption: "Target power", mode: "empty", tone: "blue" }),
      ]},
      { title: "Other equipment", rows: [
        row({ caption: "Actual electrical", mode: "value", value: mwh(710), tone: "bad" }, { caption: "Target electrical", mode: "value", value: mwh(520), tone: "blue" }),
        row({ caption: "Actual sludge line", mode: "value", value: mwh(290), tone: "bad" }, { caption: "Target sludge line", mode: "empty", tone: "blue" }),
        row({ caption: "Actual buildings", mode: "live", tone: "live" }, { caption: "Target buildings", mode: "value", value: 0, tone: "blue" }),
      ]},
    ];
  }, [h]);

  const bars = [
    { name: "Electrical", value: mwh(2830) },
    { name: "Biogas fuel", value: 520 * 6 * h / 1000 },
    { name: "Digester heat", value: mwh(380) },
    { name: "Buildings", value: mwh(190) },
  ];
  const max = niceMax(Math.max(...bars.map((b) => b.value)) * 1.05);

  return (
    <div className="bd-fit en">
      <div className="en-head">
        <Segmented<Win> label="Window" value={win} options={WINS} onChange={setWin} />
        <div className="en-co2">
          <span>Actual CO₂</span><b className={co2 > target ? "over" : ""}><CountUp value={co2} decimals={0} /> kg/h</b>
          <span>Target CO₂</span><b><CountUp value={target} decimals={0} /> kg/h</b>
        </div>
      </div>
      <div className="en-grid">
        {groups.map((g, i) => (
          <Panel key={g.title} title={g.title} i={i}>
            <div className="en-pairs" style={{ gridTemplateRows: `repeat(${g.rows.length}, minmax(0, 1fr))` }}>
              {g.rows.map((pair, r) => {
                const nums = pair.map((c) => c.value ?? 0);
                const cap = Math.max(...nums, 0.001) * 1.28;
                return (
                  <div key={r} className="en-pair">
                    {pair.map((c) => (
                      <Ring key={c.caption} {...c} max={c.mode === "value" ? cap : 1} grow={grow} digits={digits} unit="MWh" />
                    ))}
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
      <Panel title="Where the energy goes" i={4}>
        <HBars rows={bars.map((b) => ({ ...b, digits }))} max={max} grow={grow} />
      </Panel>
    </div>
  );
}
