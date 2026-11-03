import { useMemo } from "react";
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CloudRain, Sun, Wind } from "lucide-react";
import { advice, cropDemand, forecast, hourlyEt0, WEATHER_NOW, FARM, fmt } from "./farm";
import { useGrow } from "./anim";
import { useTick, wobble } from "./live";
import { Bars, CountUp, Panel, Tip } from "./ui";

/** Weather & ET: today's conditions, the week ahead, and what the forecast means for the irrigation plan */
export default function Weather() {
  const t = useTick();
  const grow = useGrow();
  const days = useMemo(() => forecast(), []);
  const tips = useMemo(() => advice(), []);
  const demand = useMemo(() => cropDemand(), []);
  const hourly = useMemo(() => hourlyEt0(), []);
  const week = days.map((d) => ({ t: d.d, et0: d.et0, rain: d.rain }));
  const tiles = [
    { l: "Air temperature", v: wobble(WEATHER_NOW.temp, 1, t, 0.01), d: 0, u: "°C" },
    { l: "Humidity", v: wobble(WEATHER_NOW.rh, 2, t, 0.02), d: 0, u: "%" },
    { l: "Wind", v: wobble(WEATHER_NOW.wind, 3, t, 0.04), d: 0, u: "km/h" },
    { l: "Solar radiation", v: wobble(WEATHER_NOW.solar, 4, t, 0.02), d: 0, u: "W/m²" },
    { l: "Pressure", v: WEATHER_NOW.pressure, d: 0, u: "hPa" },
    { l: "Crop water use (ET₀)", v: FARM.et0, d: 1, u: "mm/day" },
  ];
  return (
    <div className="vw wx">
      <Panel title="Weather now" className="wx-now" i={0}>
        <div className="wx-tiles">
          {tiles.map((x) => <div key={x.l} className="box"><span>{x.l}</span><b><CountUp value={x.v} decimals={x.d} /> <small>{x.u}</small></b></div>)}
        </div>
      </Panel>

      <Panel title="Forecast, 7 days" className="wx-fc" i={1}>
        <div className="wx-days">
          {days.map((d) => {
            const Icon = d.rain ? CloudRain : d.wind > 22 ? Wind : Sun;
            return (
              <div key={d.d} className={`wx-day ${d.rain ? "rain" : d.et0 > FARM.et0 * 1.12 ? "hot" : ""}`}>
                <b>{d.d}</b><Icon size={22} />
                <span className="hi">{d.hi}° <em>/ {d.lo}°</em></span>
                <span>Rain {fmt(d.rain, 1)} mm</span><span>Wind {d.wind} km/h</span><span>ET {fmt(d.et0, 1)} mm</span>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Irrigation advice" className="wx-adv" i={2}>
        <ul className="adv">
          {tips.map((a, i) => <li key={i} className={a.tone}><i /><div><b>{a.day}</b><p>{a.text}</p></div></li>)}
        </ul>
      </Panel>

      <Panel title="Crop water use and rain" className="wx-chart" i={3}
        right={<span className="pm-leg"><i style={{ background: "var(--water)" }} />Rain (mm)<i style={{ background: "var(--warn)" }} />ET₀ (mm)</span>}>
        <div className="chart">
          <ResponsiveContainer>
            <ComposedChart data={week} margin={{ left: -14, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="t" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} width={34} tickCount={4} domain={[0, 6]} />
              <Tooltip content={<Tip unit="mm" />} cursor={{ fill: "var(--tint)" }} />
              <Bar dataKey="rain" name="Rain" fill="var(--water)" barSize={22} isAnimationActive animationDuration={900} />
              <Line type="monotone" dataKey="et0" name="ET₀" stroke="var(--warn)" strokeWidth={2} dot={{ r: 3, fill: "var(--warn)" }} isAnimationActive animationDuration={900} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="wx-pair">
        <Panel title="Crop water use today" i={4}><Bars labels={demand.map((d) => d.crop)} values={demand.map((d) => d.mm)} unit="mm" grow={grow} max={6} /></Panel>
        <Panel title="ET₀ by hour today" i={5}>
          <div className="chart">
            <ResponsiveContainer>
              <AreaChart data={hourly} margin={{ left: -14, right: 8, top: 8, bottom: 0 }}>
                <defs><linearGradient id="etg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--warn)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--warn)" stopOpacity={0.05} /></linearGradient></defs>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="h" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} ticks={[0, 6, 12, 18, 23]} tickFormatter={(v: number) => `${String(v).padStart(2, "0")}:00`} />
                <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} width={34} tickCount={4} />
                <Tooltip content={<Tip unit="mm/h" />} cursor={{ stroke: "var(--teal)", strokeOpacity: 0.3 }} />
                <Area type="monotone" dataKey="et" name="ET₀" stroke="var(--warn)" strokeWidth={2} fill="url(#etg)" isAnimationActive animationDuration={900} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
