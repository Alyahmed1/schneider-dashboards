import { useEffect, useMemo, useRef } from "react";
import { QUALITY } from "./data";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import { CountUp } from "./ui";
import { Bars, Panel } from "./charts";
import { Trend } from "./boardui";
import { Gauge, KpDefs, KpPie } from "./kpiui";
import "./kpi.css";
import "./kpi-boards.css";

const q = (name: string) => QUALITY.find((x) => x.name.startsWith(name))!;

const Stat = ({ label, value, unit, d = 0, big }: { label: string; value: number; unit: string; d?: number; big?: boolean }) => (
  <div className={`nt2-stat bd-pop ${big ? "big" : ""}`}><span>{label}</span><b><CountUp value={value} decimals={d} /> <small>{unit}</small></b></div>
);

/** Network: treatment, distribution and collection for New Cairo. Numbers refresh every 10 seconds. */
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
  // the picture's box is sized from the real height of its row, so it always has the picture's own shape (586 x 582): whole, no bars, no crop
  const root = useRef<HTMLDivElement>(null);
  const tank = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current, tk = tank.current;
    if (!el || !tk) return;
    const fit = () => el.style.setProperty("--tankw", `${(tk.getBoundingClientRect().height * 586) / 582}px`);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, []);

  return (
    <div className="bd-fit kp nt2" ref={root}>
      <KpDefs />
      <section ref={tank} className="hm-p a-tank nt2-photo" style={{ ["--i" as string]: 0 }} aria-label="Waste water">
        <img className="nt2-photo-img" src="/waste-water.png" alt="Waste water treatment: an illuminated circular clarifier tank with a walkway and steel pipes" />
      </section>

      <section className="hm-p a-detail" style={{ ["--i" as string]: 1 }}>
        <h3>Detail</h3>
        <div className="nt2-detail">
          <div className="nt2-sub"><h5>Treatment capacity</h5><Gauge value={treat} max={200} unit="ML/d" grow={grow} /></div>
          <div className="nt2-sub"><h5>Distribution capacity</h5><Gauge value={dist} max={150} unit="ML/d" grow={grow} tone="cool" /></div>
          <div className="nt2-sub"><h5>Storage capacity</h5><Gauge value={store} max={40} unit="ML" grow={grow} tone="warm" /></div>
          <div className="nt2-sub"><h5>Total production (ML)</h5><Trend data={line} unit=" ML" lines={[{ key: "v", name: "Treated", color: "var(--teal)" }]} /></div>
        </div>
      </section>

      <Panel title="Treatment" className="a-treat" i={2}>
        <div className="nt2-bar"><span>Treatment lanes</span><b>3</b></div>
        <div className="nt2-body treat">
          <div className="nt2-cards">
            <Stat label="UV dose" value={wobble(42, 11, t, 0.01)} unit="mJ/cm²" />
            <Stat label="TSS" value={wobble(11, 12, t, 0.02)} unit="mg/L" />
          </div>
          <div className="nt2-box"><h5>BOD &amp; COD</h5><KpPie items={[{ name: "BOD", value: bod.value }, { name: "COD", value: cod.value }]} unit="mg/L" /></div>
          <div className="nt2-box"><h5>Ammonia &amp; nitrogen</h5><KpPie items={[{ name: "Ammonia", value: amm.value }, { name: "Nitrogen", value: 11 }]} unit="mg/L" /></div>
        </div>
      </Panel>

      <Panel title="Distribution" className="a-dist" i={3}>
        <div className="nt2-bar"><span>Distribution zones</span><b>4</b></div>
        <div className="nt2-body dist">
          <div className="nt2-cards">
            <Stat label="To reuse" value={dist} unit="ML/d" />
            <Stat label="To outfall" value={wobble(63, 13, t, 0.01)} unit="ML/d" />
          </div>
          <div className="nt2-box"><h5>Cost (LE/ML)</h5><Bars labels={["W1", "W2", "W3", "W4", "W5"]} values={cost} unit="LE" grow={grow} /></div>
        </div>
      </Panel>

      <Panel title="Collection" className="a-coll" i={4}>
        <div className="nt2-bar"><span>Lift stations</span><b>4</b></div>
        <div className="nt2-body coll">
          <Stat label="Inflow capacity" value={treat} unit="ML/d" />
          <Stat label="Wet-well storage" value={store} unit="ML" />
          <Stat label="Collection cost" value={wobble(5.9, 14, t, 0.008)} unit="LE/m³" d={1} />
          <Stat label="Inflow" value={wobble(6250, 15, t, 0.006)} unit="m³/h" />
          <div className="nt2-sub"><h5>Energy consumption</h5><Gauge value={energy} max={100} unit="MWh/d" grow={grow} /></div>
          <div className="nt2-sub"><h5>Renewable energy</h5><Gauge value={renewable} max={100} unit="MWh/d" grow={grow} tone="warm" /></div>
        </div>
      </Panel>
    </div>
  );
}
