import { useMemo, useState } from "react";
import { useStoryCmd } from "./storytour";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BatteryCharging, CircleDollarSign, Gauge, Leaf, RotateCcw, Sun, Zap, type LucideIcon } from "lucide-react";
import { ZONES } from "./data";
import { DEFAULTS, simulate, type EnergyIn } from "./energymodel";
import { zoneMw } from "./zonemodel";
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

/** Energy optimization: the day's power with solar, a battery and flexible load, and what-if sliders */
export default function Energy() {
  const t = useTick();
  const grow = useGrow(250);
  const [inp, setInp] = useState<EnergyIn>(DEFAULTS);
  useStoryCmd((c, a) => { if (c === "ut:shift") setInp((p) => ({ ...p, shiftPct: Number(a) })); });
  const hour = new Date().getHours();
  const out = useMemo(() => simulate(inp), [inp]);
  const noShift = useMemo(() => simulate({ ...inp, shiftPct: 0 }), [inp]);
  const moreBattery = useMemo(() => simulate({ ...inp, batteryMwh: inp.batteryMwh + 4 }), [inp]);
  const now = ZONES.reduce((s, z, i) => s + wobble(zoneMw(z.id, z.mw, hour), i + 1, t, 0.01), 0);
  const byZone = useMemo(() => ZONES.map((z, i) => ({ z, mw: wobble(zoneMw(z.id, z.mw, hour), i + 1, t, 0.01) })).sort((a, b) => b.mw - a.mw), [hour, t]);
  const maxZone = byZone[0].mw;

  const kpis: { icon: LucideIcon; label: string; v: number; d: number; s: string }[] = [
    { icon: Zap, label: "Power now", v: now, d: 1, s: " MW" },
    { icon: Gauge, label: "Energy today", v: out.mwhDay, d: 0, s: " MWh" },
    { icon: Sun, label: "Solar share", v: out.solarShare, d: 0, s: "%" },
    { icon: BatteryCharging, label: "Grid peak", v: out.optPeak, d: 1, s: ` MW (was ${out.basePeak.toFixed(1)})` },
    { icon: CircleDollarSign, label: "Saved per day", v: out.saving / 1000, d: 0, s: ` k EGP (${out.savingPct.toFixed(0)}%)` },
    { icon: Leaf, label: "CO₂ avoided", v: out.co2, d: 1, s: " t" },
  ];

  const shiftGain = noShift.optCost - out.optCost, batteryGain = out.optCost - moreBattery.optCost;
  const recs = [
    { title: "Move flexible load", text: `Shifting ${inp.shiftPct}% of the pumps, EV charging and water heating out of 17:00–22:00 moves ${out.peakShifted.toFixed(1)} MWh to the cheap night hours` + (shiftGain > 0 ? ` and saves about ${fmt(shiftGain)} EGP a day.` : ".") },
    { title: "Use the battery in the peak", text: `The ${inp.batteryMwh} MWh battery covers ${out.eveningCover.toFixed(0)}% of the evening peak and lowers the grid peak from ${out.basePeak.toFixed(1)} to ${out.optPeak.toFixed(1)} MW.` },
    { title: "Next best step", text: batteryGain > 50 ? `Adding 4 MWh more battery would save another ${fmt(batteryGain)} EGP a day.` : "The battery is already large enough for this peak; more solar would help more." },
  ];

  return (
    <div className="ut-grid">
      <div className="ut-kpis">
        {kpis.map((k, i) => (
          <div className="kpi" key={k.label} style={{ ["--n" as string]: i }}>
            <k.icon size={16} /><span>{k.label}</span><b><CountUp value={k.v} decimals={k.d} suffix={k.s} ms={700} /></b>
          </div>
        ))}
      </div>

      <div className="ut-main">
        <Panel title="Power through the day" className="grow" i={0} aside={<span className="loc-tag">MW, grid + solar + battery</span>}>
          <div className="ut-chart" aria-label="Power supplied through the day by source, with the demand without optimization">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={out.hours} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--line-2)" vertical={false} />
                <XAxis dataKey="label" interval={3} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={34} />
                <Tooltip contentStyle={TIP} formatter={(v, n) => [`${Number(v).toFixed(1)} MW`, n]} />
                <ReferenceArea x1="17:00" x2="22:00" fill="var(--bad)" fillOpacity={0.07} label={{ value: "peak tariff", fill: "var(--muted)", fontSize: 10, position: "insideTop" }} />
                <Area dataKey="grid" stackId="s" name="Grid" stroke="var(--text-2)" fill="var(--text-2)" fillOpacity={0.35} isAnimationActive={grow} />
                <Area dataKey="solar" stackId="s" name="Solar" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.55} isAnimationActive={grow} />
                <Area dataKey="discharge" stackId="s" name="Battery" stroke="var(--water)" fill="var(--water)" fillOpacity={0.65} isAnimationActive={grow} />
                <Line dataKey="base" name="Demand without optimization" stroke="var(--bad)" strokeDasharray="5 4" strokeWidth={1.8} dot={false} isAnimationActive={grow} />
                <ReferenceLine x={`${String(hour).padStart(2, "0")}:00`} stroke="var(--gold)" label={{ value: "now", fill: "var(--gold)", fontSize: 10, position: "insideTopRight" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-row" aria-hidden>
            <span><i style={{ background: "var(--text-2)" }} />Grid</span><span><i style={{ background: "var(--gold)" }} />Solar</span><span><i style={{ background: "var(--water)" }} />Battery</span><span><i className="dash" />Demand without optimization</span>
          </div>
        </Panel>

        <Panel title="What if" i={1} aside={<button className="chip" onClick={() => setInp(DEFAULTS)}><RotateCcw size={12} /> Current plan</button>}>
          <div className="sliders">
            <Slider label="Solar field" value={inp.solarMwp} min={0} max={12} step={0.5} unit=" MWp" onChange={(solarMwp) => setInp({ ...inp, solarMwp })} />
            <Slider label="Battery" value={inp.batteryMwh} min={0} max={20} step={1} unit=" MWh" onChange={(batteryMwh) => setInp({ ...inp, batteryMwh })} />
            <Slider label="Flexible load moved out of the peak" value={inp.shiftPct} min={0} max={100} step={5} unit="%" onChange={(shiftPct) => setInp({ ...inp, shiftPct })} />
          </div>
          <p className="whatif-out">Cost per day <b>{fmt(out.baseCost / 1000)} k EGP</b> without optimization, <b>{fmt(out.optCost / 1000)} k EGP</b> with it: <b className="good">{fmt(out.saving / 1000)} k EGP saved</b>. Prices and the solar and battery behaviour are sample numbers.</p>
        </Panel>
      </div>

      <div className="side">
        <Panel title="AI recommendations" i={2}>
          <ul className="recs">{recs.map((r) => <li key={r.title}><b>{r.title}</b><span>{r.text}</span></li>)}</ul>
        </Panel>
        <Panel title="Power by zone, now" className="grow" i={3}>
          <ul className="zbars">
            {byZone.map(({ z, mw }) => (
              <li key={z.id}><i style={{ background: `var(${z.color})` }} /><span>{z.name}</span><em><u style={{ width: grow ? `${(mw / maxZone) * 100}%` : 0, background: `var(${z.color})` }} /></em><b>{mw.toFixed(1)}</b></li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
