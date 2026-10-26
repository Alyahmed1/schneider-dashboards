import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Droplets, Gauge, RotateCcw, ShieldAlert, Waves, Wrench, type LucideIcon } from "lucide-react";
import { ZONES, type ZoneId } from "./data";
import MasterMap from "./MasterMap";
import { DMA, LAGOONS, LEAK, WATER_COST, WATER_DEFAULTS, leakColor, leakTone, waterDay, waterNow, type WaterIn } from "./watermodel";
import { inDays, useWorkOrders } from "./workorders";
import { useTick, wobble } from "./live";
import { CountUp, Panel, fmt, useGrow } from "./ui";

const TIP = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 };

function Slider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span>{label}<b>{value}{unit}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

/** Water monitoring: use through the day, the lagoons, leak detection by district, and what-if sliders */
export default function Water({ go }: { go: (tab: "assets", target?: string) => void }) {
  const t = useTick();
  const grow = useGrow(250);
  const { add, orders } = useWorkOrders();
  const [inp, setInp] = useState<WaterIn>(WATER_DEFAULTS);
  const [pick, setPick] = useState<ZoneId>(LEAK.zone);
  const [made, setMade] = useState<string | null>(null);
  const hour = new Date().getHours();
  const day = useMemo(() => waterDay(inp), [inp]);
  const useNow = wobble(waterNow(hour), 7, t, 0.01);
  const level = LAGOONS.reduce((s, l) => s + l.level, 0) / LAGOONS.length;
  const ntu = LAGOONS.reduce((s, l) => s + l.ntu, 0) / LAGOONS.length;
  const fills = useMemo(() => Object.fromEntries(ZONES.map((z) => [z.id, leakColor(DMA[z.id])])), []);
  const picked = ZONES.find((z) => z.id === pick) ?? ZONES[0];
  const ratio = DMA[pick];
  const isLeak = pick === LEAK.zone;
  const existing = orders.find((w) => w.source === "Leak detection");

  const kpis: { icon: LucideIcon; label: string; v: number; d: number; s: string }[] = [
    { icon: Droplets, label: "Water use now", v: useNow, d: 0, s: " m³/h" },
    { icon: Gauge, label: "Potable today", v: day.potable, d: 0, s: " m³" },
    { icon: ShieldAlert, label: "Leak alerts", v: 1, d: 0, s: "" },
    { icon: Waves, label: "Lagoon level (target 90%)", v: level, d: 0, s: "%" },
    { icon: Wrench, label: "Lagoon clarity", v: ntu, d: 1, s: " NTU" },
  ];

  const raise = () => {
    const id = add({ title: `Find and repair the leak in the ${picked.name.toLowerCase()} network (about ${LEAK.m3Day} m³/day)`, asset: "BS-2", priority: "High", due: inDays(2), source: "Leak detection" });
    setMade(id);
  };

  return (
    <div className="ut-grid">
      <div className="ut-kpis five">
        {kpis.map((k, i) => (
          <div className="kpi" key={k.label} style={{ ["--n" as string]: i }}>
            <k.icon size={16} /><span>{k.label}</span><b><CountUp value={k.v} decimals={k.d} suffix={k.s} ms={700} /></b>
          </div>
        ))}
      </div>

      <div className="ut-main">
        <Panel title="Water through the day" i={0} aside={<span className="loc-tag">m³ per hour</span>}>
          <div className="ut-chart" aria-label="Water use through the day: homes and buildings, irrigation, and treated wastewater">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={day.hours} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--line-2)" vertical={false} />
                <XAxis dataKey="label" interval={3} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={TIP} formatter={(v, n) => [`${Math.round(Number(v))} m³/h`, n]} />
                <Area dataKey="domestic" stackId="w" name="Homes and buildings" stroke="var(--info)" fill="var(--info)" fillOpacity={0.5} isAnimationActive={grow} />
                <Area dataKey="irrigation" stackId="w" name="Irrigation (potable)" stroke="var(--z-golf)" fill="var(--z-golf)" fillOpacity={0.55} isAnimationActive={grow} />
                <Area dataKey="reused" stackId="w" name="Irrigation (treated wastewater)" stroke="var(--water)" fill="var(--water)" fillOpacity={0.5} isAnimationActive={grow} />
                <ReferenceLine x={`${String(hour).padStart(2, "0")}:00`} stroke="var(--gold)" label={{ value: "now", fill: "var(--gold)", fontSize: 10, position: "insideTopRight" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-row" aria-hidden>
            <span><i style={{ background: "var(--info)" }} />Homes and buildings</span><span><i style={{ background: "var(--z-golf)" }} />Irrigation, potable</span><span><i style={{ background: "var(--water)" }} />Irrigation, treated wastewater</span>
          </div>
          <div className="sliders two">
            <Slider label="Cut irrigation" value={inp.cutPct} min={0} max={40} step={1} unit="%" onChange={(cutPct) => setInp({ ...inp, cutPct })} />
            <Slider label="Irrigate with treated wastewater" value={inp.reusePct} min={0} max={100} step={5} unit="%" onChange={(reusePct) => setInp({ ...inp, reusePct })} />
          </div>
          <p className="whatif-out">Saves <b className="good">{fmt(day.saved)} m³ of potable water a day</b>, about <b>{fmt(day.savedEgp)} EGP</b> at {WATER_COST} EGP per m³ (sample price), and uses {fmt(day.reused)} m³ of treated wastewater.
            <button className="chip" onClick={() => setInp(WATER_DEFAULTS)}><RotateCcw size={12} /> Current plan</button></p>
        </Panel>

        <Panel title="Lagoons" i={1} aside={<span className="loc-tag">level, target 90%</span>}>
          <ul className="lagoons">
            {LAGOONS.map((l) => (
              <li key={l.id}>
                <span className="ln">{l.name}</span>
                <span className="lvl"><em style={{ height: grow ? `${l.level}%` : 0, background: l.level < l.target - 5 ? "var(--warn)" : "var(--water)" }} /><u style={{ bottom: `${l.target}%` }} /></span>
                <b>{l.level}%</b>
                <span className={`pill ${l.pump === "Running" ? "warn" : "good"}`}>Pump {l.pump.toLowerCase()}</span>
                <small>{l.ntu} NTU · {l.evap} m³/day evaporation</small>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="side">
        <Panel title="Leak detection" i={2} aside={<span className="loc-tag">night flow by district</span>}>
          <div className="map-wrap">
            <MasterMap muted grow={grow} fills={fills} viewBox="150 190 650 640">
              <g className="leak" transform={`translate(${LEAK.at[0]} ${LEAK.at[1]})`} aria-hidden>
                <circle className="leak-pulse" r="16" /><circle r="7" className="leak-dot" /><title>{`Suspected leak, about ${LEAK.m3Day} m³/day`}</title>
              </g>
            </MasterMap>
          </div>
          <ul className="dma">
            {ZONES.filter((z) => z.id !== "golf" && z.id !== "future").map((z) => (
              <li key={z.id}>
                <button className={pick === z.id ? "on" : ""} onClick={() => { setPick(z.id); setMade(null); }}>
                  <span>{z.name}</span>
                  <em><u style={{ width: grow ? `${Math.min(100, ((DMA[z.id] - 0.9) / 0.3) * 100)}%` : 0, background: leakColor(DMA[z.id]) }} /></em>
                  <b className={leakTone(DMA[z.id])}>{DMA[z.id].toFixed(2)}×</b>
                </button>
              </li>
            ))}
          </ul>
          <div className={`leak-card ${isLeak ? "bad" : ""}`}>
            {isLeak ? <>
              <p><b>{picked.name} district:</b> night flow is {Math.round((ratio - 1) * 100)}% above normal and has been for {LEAK.since}. The AI places the leak near the marked point and estimates <b>{LEAK.m3Day} m³ a day</b> lost, about {fmt(LEAK.m3Day * WATER_COST)} EGP.</p>
              {made || existing ? <p className="ok">Work order {made ?? existing?.id} is open. <button className="link" onClick={() => go("assets", "BS-2")}>See it in Assets</button></p> : <button className="primary" onClick={raise}>Create work order</button>}
            </> : <p>{picked.name} district: night flow is {ratio.toFixed(2)}× normal. {ratio >= 1.06 ? "Worth watching." : "No sign of a leak."}</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
