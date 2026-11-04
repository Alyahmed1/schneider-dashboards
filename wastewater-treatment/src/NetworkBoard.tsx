import { useMemo } from "react";
import { QUALITY } from "./data";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import { CountUp } from "./ui";
import { Bars, Panel } from "./charts";
import { Pie, Semi, Trend } from "./boardui";

const q = (name: string) => QUALITY.find((x) => x.name.startsWith(name))!;

/** Network: treatment, distribution and collection for New Cairo. Gauges, pies and bars use the plant motion. */
export default function NetworkBoard() {
  const t = useTick();
  const grow = useGrow();
  const treat = wobble(150, 2, t, 0.006);
  const dist = wobble(87, 3, t, 0.008);
  const store = wobble(26, 4, t, 0.01);
  const bod = q("BOD");
  const cod = q("COD");
  const amm = q("Ammonia");
  const line = useMemo(() => [148, 151, 146, 150, 149].map((v, i) => ({ t: `W${i + 1}`, v })), []);
  const cost = [5.7, 6.1, 5.8, 6.0, 5.9];
  const energy = wobble(68, 8, t, 0.01);
  const renewable = wobble(27, 9, t, 0.012);

  return (
    <div className="bd-fit nt">
      <div className="nt-top">
        <section className="hm-p nt-tank" style={{ ["--i" as string]: 0 }}>
          <svg viewBox="0 0 160 160" role="img" aria-label="Clarifier">
            <circle cx="80" cy="80" r="68" fill="var(--surface-3)" stroke="var(--teal)" strokeWidth="3" />
            <circle cx="80" cy="80" r="48" fill="color-mix(in srgb, var(--teal) 28%, var(--card))" stroke="var(--teal)" />
            <circle cx="80" cy="80" r="8" fill="var(--teal)" />
            <g className="hm-scraper"><line x1="80" y1="80" x2="142" y2="80" stroke="var(--ink)" strokeWidth="2" /></g>
            <circle cx="58" cy="70" r="2" className="hm-bub" style={{ ["--d" as string]: "0s" }} />
            <circle cx="100" cy="96" r="1.6" className="hm-bub" style={{ ["--d" as string]: ".8s" }} />
            <circle cx="74" cy="108" r="1.4" className="hm-bub" style={{ ["--d" as string]: "1.3s" }} />
          </svg>
        </section>
        <Panel title="Treatment capacity" i={1}><Semi value={treat} max={200} unit="ML/d" grow={grow} /></Panel>
        <Panel title="Distribution capacity" i={2}><Semi value={dist} max={150} unit="ML/d" grow={grow} /></Panel>
        <Panel title="Storage capacity" i={3}><Semi value={store} max={40} unit="ML" digits={0} grow={grow} /></Panel>
        <Panel title="Total production" className="nt-line" i={4}>
          <Trend data={line} unit=" ML" lines={[{ key: "v", name: "Treated", color: "var(--teal)" }]} />
        </Panel>
      </div>

      <div className="nt-bot">
        <Panel title="Treatment · 3 lanes" className="nt-treat" i={5}>
          <div className="nt-split">
            <div className="nt-side">
              <div className="nt-num"><span>UV dose</span><b><CountUp value={wobble(42, 11, t, 0.01)} decimals={0} /> mJ</b></div>
              <div className="nt-num"><span>TSS</span><b><CountUp value={wobble(11, 12, t, 0.02)} decimals={0} /> mg/L</b></div>
            </div>
            <div className="nt-pies">
              <div>
                <Pie items={[{ name: "BOD", value: bod.value }, { name: "COD", value: cod.value }]} />
              </div>
              <div>
                <Pie items={[{ name: "Ammonia", value: amm.value }, { name: "Nitrogen", value: 11 }]} />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Distribution · 4 zones" className="nt-dist" i={6}>
          <div className="bd-grow">
            <Bars labels={["W1", "W2", "W3", "W4", "W5"]} values={cost} unit="LE" grow={grow} onBar />
          </div>
          <div className="nt-two">
            <div className="nt-num"><span>To reuse</span><b><CountUp value={dist} decimals={0} /> ML/d</b></div>
            <div className="nt-num"><span>To outfall</span><b><CountUp value={wobble(63, 13, t, 0.01)} decimals={0} /> ML/d</b></div>
          </div>
        </Panel>

        <Panel title="Collection · 4 lift stations" className="nt-collect" i={7}>
          <div className="nt-two">
            <div className="nt-num"><span>Inflow capacity</span><b><CountUp value={treat} decimals={0} /> ML/d</b></div>
            <div className="nt-num"><span>Wet-well storage</span><b><CountUp value={store} decimals={0} /> ML</b></div>
            <div className="nt-num"><span>Collection cost</span><b><CountUp value={wobble(5.9, 14, t, 0.008)} decimals={1} /> LE/m³</b></div>
            <div className="nt-num"><span>Inflow</span><b><CountUp value={wobble(6250, 15, t, 0.006)} decimals={0} /> m³/h</b></div>
          </div>
          <div className="nt-meters">
            <Semi value={energy} max={100} unit="MWh/d" digits={0} grow={grow} label="Energy" />
            <Semi value={renewable} max={100} unit="MWh/d" digits={0} grow={grow} label="Renewable" />
          </div>
        </Panel>
      </div>
    </div>
  );
}
