import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Kpi, RangeKey, Zone } from "./data";

type PanelProps = {
  zone: Zone;
  range: RangeKey;
  ranges: { id: RangeKey; label: string }[];
  reduce: boolean;
  tick: number;
  onRange: (range: RangeKey) => void;
  onClose: () => void;
};

const toneColor = {
  ok: "#1f9d62",
  watch: "#c4841d",
  alert: "#d14343",
};

const axisTick = { fill: "#5c6b7c", fontSize: 12 };
const chartMargin = { top: 8, right: 18, left: 0, bottom: 4 };

function axisNumber(value: number) {
  return Number(value).toLocaleString("en-US");
}

export function Panel({ zone, range, ranges, reduce, tick, onRange, onClose }: PanelProps) {
  const slices = (zone.donut?.[range] ?? []).map((slice, index) => ({
    ...slice,
    value: nudge(slice.value, tick, index + 3),
  }));
  const series = zone.series[range].map((point, index) => ({
    ...point,
    value: nudge(point.value, tick, index),
  }));

  return (
    <motion.aside
      className="panel"
      role="region"
      aria-label={zone.title}
      initial={reduce ? false : { x: 36, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { x: 36, opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.28, ease: "easeOut" }}
    >
      <motion.div
        key={`${zone.id}-${range}`}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.22 }}
      >
        <header className="panel-head">
          <div>
            <p className={`status status-${zone.status}`}>{zone.statusLabel}</p>
            <h1>{zone.title}</h1>
            <p className="blurb">{zone.blurb}</p>
          </div>
          <button type="button" className="close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="ranges" role="group" aria-label="Time range">
          {ranges.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === range ? "range on" : "range"}
              onClick={() => onRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="kpis">
          {zone.kpis.map((kpi, index) => (
            <KpiCard
              key={kpi.label}
              kpi={kpi}
              range={range}
              reduce={reduce}
              spark={index === 0 ? series : undefined}
              tick={tick}
              salt={index}
            />
          ))}
        </div>

        <section className="chart-block">
          <h2>{zone.chartLabel}</h2>
          <p className="chart-note">Hover a point to read the number.</p>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              {zone.chart === "donut" ? (
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={2}
                    isAnimationActive={!reduce}
                  >
                    {slices.map((slice) => (
                      <Cell
                        key={slice.name}
                        fill={slice.name === "Free" ? "#1f9d62" : "#c4841d"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [Number(value).toLocaleString("en-US"), zone.unit]}
                  />
                  <Legend />
                </PieChart>
              ) : zone.chart === "bar" ? (
                <BarChart data={series} margin={chartMargin}>
                  <CartesianGrid stroke="rgba(18, 42, 69, 0.08)" vertical={false} />
                  <XAxis dataKey="label" interval={0} tick={axisTick} />
                  <YAxis width={64} tick={axisTick} tickFormatter={axisNumber} />
                  <Tooltip
                    formatter={(value) => [Number(value).toLocaleString("en-US"), zone.unit]}
                  />
                  <Bar
                    dataKey="value"
                    fill="#1463a3"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={!reduce}
                  />
                </BarChart>
              ) : (
                <LineChart data={series} margin={chartMargin}>
                  <CartesianGrid stroke="rgba(18, 42, 69, 0.08)" vertical={false} />
                  <XAxis dataKey="label" interval={0} tick={axisTick} />
                  <YAxis width={64} tick={axisTick} tickFormatter={axisNumber} />
                  <Tooltip
                    formatter={(value) => [Number(value).toLocaleString("en-US"), zone.unit]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#1463a3"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#1463a3" }}
                    isAnimationActive={!reduce}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>

        <ul className="rows">
          {zone.rows[range].map((row) => (
            <li key={row.name}>
              <span className="dot" style={{ background: toneColor[row.tone] }} />
              <div>
                <strong>{row.name}</strong>
                <p>{row.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.aside>
  );
}

function nudge(value: number, tick: number, salt: number) {
  const swing = Math.sin(tick * 1.4 + salt) * 0.04;
  return value * (1 + swing);
}

function KpiCard({
  kpi,
  range,
  reduce,
  spark,
  tick,
  salt,
}: {
  kpi: Kpi;
  range: RangeKey;
  reduce: boolean;
  spark?: { value: number }[];
  tick: number;
  salt: number;
}) {
  const target = nudge(kpi.values[range], tick, salt);
  const shown = useCount(target, reduce);
  const delta = kpi.deltas[range];
  const good = kpi.lowerIsBetter ? delta <= 0 : delta >= 0;
  const text =
    kpi.suffix === "%" || kpi.suffix === " ms" || kpi.suffix === " min" || kpi.suffix === " sec"
      ? shown.toFixed(target % 1 === 0 ? 0 : 1)
      : Math.round(shown).toLocaleString("en-US");

  return (
    <article className="kpi">
      <div className="kpi-top">
        <p className="kpi-label">{kpi.label}</p>
        {spark && (
          <div className="spark" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#1463a3"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={!reduce}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <p className="kpi-value">
        {text}
        <small>{kpi.suffix}</small>
      </p>
      <p className={good ? "delta good" : "delta bad"}>
        {delta > 0 ? "Up" : "Down"} {Math.abs(delta)}%
      </p>
      <p className="kpi-note">{kpi.note}</p>
    </article>
  );
}

function useCount(target: number, reduce: boolean) {
  const [value, setValue] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 650);
      const eased = 1 - (1 - progress) ** 3;
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduce]);

  return value;
}
