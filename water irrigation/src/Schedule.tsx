import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { CloudRain, Coins, Droplets, Gauge, Lightbulb, Pause, Play, Zap } from "lucide-react";
import { fmt, moistClass, PIVOTS, TARIFF, type Pivot } from "./farm";
import { appliedPlan, applyPlan, CAP, changed, dailyM3, hh, MAX_LEN, metrics, MIN_LEN, moistWith, same, segs, SLOTS, stateAt, suggest, weekPlan, type Plan, type RunState, type Win } from "./irrplan";
import { Panel, Segmented } from "./ui";
import SummaryTile, { type SumTileData } from "./SummaryTile";
import type { Go } from "./App";

type Mode = "Today" | "Week";
const MODES: Mode[] = ["Today", "Week"];
const STEP_H = 0.05, TICK_MS = 250; // playing: the clock moves 3 minutes every quarter second
const nowHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const BAND = { "Off-peak": "off", Standard: "std", Peak: "pk" } as const;
const STATE_TEXT: Record<RunState, string> = { running: "Running", queued: "Queued", done: "Done", fault: "Blocked" };
const MCOL = { dry: "var(--bad)", low: "var(--warn)", ok: "var(--good)", wet: "var(--water)" };

/** Agricultural · Irrigation schedule: one run window per pivot that you can drag, with what it costs, and suggestions you can accept */
export default function Schedule({ go }: { go: Go }) {
  const [applied, setApplied] = useState<Plan>(appliedPlan);
  const [plan, setPlan] = useState<Plan>(appliedPlan);
  const [mode, setMode] = useState<Mode>("Today");
  const [hour, setHour] = useState(nowHour);
  const [play, setPlay] = useState(false);
  const [live, setLive] = useState(true);
  const [skips, setSkips] = useState<Record<string, boolean>>({});
  const [focusDay, setFocusDay] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const drag = useRef<{ id: string; mode: "move" | "size"; x0: number; w0: Win; px: number } | null>(null);

  // the clock follows the real time until the day is played or the time is chosen
  useEffect(() => {
    const id = window.setInterval(() => {
      if (play) setHour((h) => (h + STEP_H) % 24);
      else if (live) setHour(nowHour());
    }, play ? TICK_MS : 15000);
    return () => window.clearInterval(id);
  }, [play, live]);

  const base = useMemo(() => metrics(applied, applied), [applied]);
  const m = useMemo(() => metrics(plan, applied), [plan, applied]);
  const edits = changed(plan, applied);
  const dplan = useDeferredValue(plan);
  const half = Math.floor(hour * 2);
  const sugs = useMemo(() => suggest(dplan, half / 2, metrics(dplan, applied)), [dplan, applied, half]);
  const week = useMemo(() => weekPlan(plan), [plan]);

  // dragging a run: the body moves it, the right end changes its length, both in half-hour steps
  const down = (e: PointerEvent<HTMLElement>, id: string, how: "move" | "size") => {
    const trk = e.currentTarget.closest(".sc-trk") as HTMLElement | null;
    if (!trk) return;
    drag.current = { id, mode: how, x0: e.clientX, w0: plan[id], px: trk.getBoundingClientRect().width };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  };
  const move = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dh = Math.round(((e.clientX - d.x0) / d.px) * 48) / 2;
    const w: Win = d.mode === "move" ? { start: (((d.w0.start + dh) % 24) + 24) % 24, len: d.w0.len } : { start: d.w0.start, len: clamp(d.w0.len + dh, MIN_LEN, MAX_LEN) };
    setPlan((p) => (same(p[d.id], w) ? p : { ...p, [d.id]: w }));
  };
  const up = () => { drag.current = null; };
  const key = (e: KeyboardEvent<HTMLElement>, id: string) => {
    const d = e.key === "ArrowRight" ? 0.5 : e.key === "ArrowLeft" ? -0.5 : 0;
    if (!d) return;
    e.preventDefault();
    setPlan((p) => ({ ...p, [id]: e.shiftKey ? { ...p[id], len: clamp(p[id].len + d, MIN_LEN, MAX_LEN) } : { ...p[id], start: (((p[id].start + d) % 24) + 24) % 24 } }));
  };

  const send = () => { applyPlan(plan); const a = appliedPlan(); setApplied(a); setMsg(`Sent to the farm: ${edits.length} pivot${edits.length === 1 ? "" : "s"} changed. Farm map, Pivots and Pump stations follow it now.`); };
  const reset = () => { setPlan(applied); setSkips({}); setMsg(""); };
  const accept = (p: Plan) => { setPlan(p); setMsg(""); };

  // the three short lines above the plan
  const states = PIVOTS.map((p) => ({ p, s: stateAt(p, plan[p.id], hour) }));
  const running = states.filter((x) => x.s === "running").map((x) => x.p.id);
  const doneN = states.filter((x) => x.s === "done").length;
  const next = PIVOTS.filter((p) => !p.fault).map((p) => ({ p, t: Math.min(...segs(plan[p.id]).map(([a]) => a).filter((a) => a > hour), 99) })).filter((x) => x.t < 99).sort((a, b) => a.t - b.t)[0];

  const dW = m.water - base.water, dC = m.cost - base.cost, dS = m.peakShare - base.peakShare, dL = m.worst - base.worst;
  const z = (v: number, e: number) => (Math.abs(v) < e ? 0 : v);
  const tiles: SumTileData[] = [
    { id: "w", label: "Water today", icon: Droplets, value: m.water, decimals: 0, unit: "m³", kind: "spark", series: m.cum, delta: z(dW, 1) },
    { id: "c", label: "Pumping cost", icon: Coins, value: m.cost, decimals: 0, unit: "LE", kind: "bars", series: m.kw, delta: z(dC, 1), goodWhenDown: true },
    { id: "p", label: "Peak-hour share", icon: Zap, value: m.peakShare * 100, decimals: 0, unit: "%", kind: "ring", pct: m.peakShare * 100, delta: z(dS * 100, 0.5), goodWhenDown: true },
    { id: "l", label: "Station load", icon: Gauge, value: m.worst * 100, decimals: 0, unit: `% ${m.worstStation}`, kind: "bar", pct: Math.min(100, m.worst * 100), delta: z(dL * 100, 0.5), goodWhenDown: true },
  ];

  const maxKw = Math.max(...m.kw, ...base.kw) * 1.08;
  const bandKey = (s: number) => BAND[TARIFF.find((b) => Math.floor(s / 2) >= b.from && Math.floor(s / 2) < b.to)!.name as keyof typeof BAND];
  const dirty = edits.length > 0 || Object.values(skips).some(Boolean);

  return (
    <div className="sc">
      <div className="sc-top">
        <h2>Irrigation schedule</h2>
        <Segmented<Mode> label="Today or the week" value={mode} options={MODES} onChange={setMode} />
        <div className="sc-pills" aria-label="Today">
          <span className="sc-pill run"><i />{running.length ? `Running: ${running.join(" ")}` : "Nothing running"}</span>
          <span className="sc-pill">{next ? `Next: ${next.p.id} at ${hh(next.t)}` : "No run left today"}</span>
          <span className="sc-pill">{`Done: ${doneN} of ${PIVOTS.length}`}</span>
        </div>
        <div className="sc-end">
          <div className="ct-clock">
            <button className="ct-play" onClick={() => { setPlay((p) => !p); setLive(false); }} aria-label={play ? "Pause the day" : "Play the day"} title={play ? "Pause" : "Play the day"}>{play ? <Pause size={15} /> : <Play size={15} />}</button>
            <b>{hh(hour)}</b>
            <button className="btn" onClick={() => { setPlay(false); setLive(true); setHour(nowHour()); }} title="Back to the real time">Now</button>
          </div>
          <button className="btn" onClick={reset} disabled={!dirty}>Reset</button>
          <button className="btn pri" onClick={send} disabled={!edits.length}>Apply plan{edits.length ? ` (${edits.length})` : ""}</button>
        </div>
      </div>

      {mode === "Today" ? (
        <Panel title="Run windows" className="sc-main" i={1}
          right={<span className="sc-hint">Drag a run to move it · drag its right end to resize</span>}>
          <div className="sc-g" style={{ gridTemplateRows: `20px repeat(${PIVOTS.length}, minmax(20px, 1fr)) minmax(52px, .8fr) 16px` }}>
            <div className="sc-corner">Tariff, LE per kWh</div>
            <div className="sc-trk sc-tar">
              {TARIFF.map((b) => <span key={b.from} className={BAND[b.name as keyof typeof BAND]} style={{ left: `${(b.from / 24) * 100}%`, width: `${((b.to - b.from) / 24) * 100}%` }}>{b.name} {b.rate}</span>)}
            </div>

            {PIVOTS.map((p, i) => <Lane key={p.id} p={p} row={i + 2} w={plan[p.id]} was={applied[p.id]} hour={hour} go={go} down={down} move={move} up={up} keyDown={key} />)}

            <div className="sc-corner kw" style={{ gridRow: PIVOTS.length + 2 }}>Pump power<b>{Math.round(m.peakKw)} kW peak</b></div>
            <div className="sc-trk sc-load" style={{ gridRow: PIVOTS.length + 2 }}>
              <svg viewBox={`0 0 ${SLOTS * 10} 60`} preserveAspectRatio="none" role="img" aria-label="Power drawn hour by hour">
                {m.kw.map((v, s) => { const h = Math.max(1, (v / maxKw) * 58); return <rect key={s} x={s * 10 + 1} y={60 - h} width={8} height={h} className={`bar ${bandKey(s)}`} />; })}
                {edits.length > 0 && <path className="ghost" vectorEffect="non-scaling-stroke" d={base.kw.map((v, s) => `${s ? "L" : "M"}${s * 10 + 5} ${(60 - (v / maxKw) * 58).toFixed(1)}`).join(" ")} />}
              </svg>
            </div>
            <div className="sc-ax" style={{ gridRow: PIVOTS.length + 3 }}>
              {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => <span key={h} style={{ left: `${(h / 24) * 100}%` }}>{String(h).padStart(2, "0")}:00</span>)}
            </div>
            <div className="sc-nowwrap" style={{ gridRow: `2 / ${PIVOTS.length + 3}` }}><i className="sc-now" style={{ left: `${(hour / 24) * 100}%` }}><b>{hh(hour)}</b></i></div>
          </div>
        </Panel>
      ) : (
        <Panel title="The week" className="sc-main" i={1} right={<span className="sc-hint">Planned water for each pivot, from the forecast. Click a day to skip it.</span>}>
          <div className="sc-wk" style={{ gridTemplateRows: `auto repeat(${PIVOTS.length}, minmax(0, 1fr)) auto` }}>
            <div />
            {week.days.map((d, i) => {
              const all = PIVOTS.every((p) => skips[`${p.id}:${i}`]);
              return (
                <div key={d.d} className={`sc-wk-h ${d.rain >= 1 ? "rain" : ""} ${focusDay === i ? "focus" : ""}`}>
                  <b>{d.d}</b>
                  <span>ET {d.et0.toFixed(1)}{d.rain >= 1 ? <em><CloudRain size={12} /> {d.rain} mm</em> : null}</span>
                  <button className="btn" onClick={() => setSkips((s) => { const o = { ...s }; PIVOTS.forEach((p) => { o[`${p.id}:${i}`] = !all; }); return o; })}>{all ? "Run" : "Skip all"}</button>
                </div>
              );
            })}
            {PIVOTS.map((p) => (
              <WeekRow key={p.id} p={p} week={week} skips={skips} focus={focusDay} toggle={(i) => setSkips((s) => ({ ...s, [`${p.id}:${i}`]: !s[`${p.id}:${i}`] }))} />
            ))}
            <div className="sc-wk-l tot">Water, m³</div>
            {week.days.map((d, i) => {
              const tot = PIVOTS.reduce((a, p) => a + (p.fault || skips[`${p.id}:${i}`] ? 0 : week.cell(p, i).m3), 0);
              return <div key={d.d} className="sc-wk-t">{fmt(tot)}</div>;
            })}
          </div>
        </Panel>
      )}

      <div className="sc-side">
        <Panel title={mode === "Today" ? "What this plan does" : "Today's plan"} className="sc-imp" i={2}
          right={<span className={`sc-state ${edits.length ? "edit" : ""}`}>{edits.length ? `${edits.length} change${edits.length === 1 ? "" : "s"} not sent` : "Same as the farm runs"}</span>}>
          <div className="sc-tiles">{tiles.map((t, n) => <SummaryTile key={t.id} d={t} n={n} />)}</div>
        </Panel>
        <Panel title="Suggestions" className="sc-sug" i={3} right={<span className="sc-state">{sugs.length}</span>}>
          <div className="sc-list">
            {msg && <p className="sc-sent" role="status">{msg}</p>}
            {m.over.map((o) => <p key={`${o.station}${o.from}`} className="sc-warn" role="alert">{o.station} over capacity {hh(o.from)}–{hh(o.to)}: {Math.round(o.peak)} of {CAP[o.station]} m³/h</p>)}
            {sugs.length === 0 && !msg && <p className="sc-none">The plan is balanced: nothing to suggest.</p>}
            {sugs.map((s) => (
              <article key={s.id} className={`sc-card ${s.tone}`}>
                <Lightbulb size={15} aria-hidden />
                <div><b>{s.title}</b><p>{s.text}</p></div>
                {s.action && (
                  <button className="btn" onClick={() => { if (s.action!.plan) accept(s.action!.plan); else if (s.action!.week !== undefined) { setMode("Week"); setFocusDay(s.action!.week!); } }}>{s.action.label}</button>
                )}
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/** one pivot: its label with the soil now, and its run on the 24-hour line */
function Lane({ p, row, w, was, hour, go, down, move, up, keyDown }: {
  p: Pivot; row: number; w: Win; was: Win; hour: number; go: Go;
  down: (e: PointerEvent<HTMLElement>, id: string, how: "move" | "size") => void; move: (e: PointerEvent<HTMLElement>) => void; up: () => void; keyDown: (e: KeyboardEvent<HTMLElement>, id: string) => void;
}) {
  const st = stateAt(p, w, hour), edited = !same(w, was), parts = segs(w);
  const moist = moistWith(p, w, hour), cls = moistClass(moist);
  const wide = parts.reduce((a, s, i) => (s[1] - s[0] > parts[a][1] - parts[a][0] ? i : a), 0);
  return (
    <>
      <button className="sc-lab" style={{ gridRow: row }} onClick={() => go("pivots", p.id)} title={`Open ${p.id} in Pivots`}>
        <b>{p.id}</b><span>{p.crop}</span><em>{p.station}</em><i style={{ color: MCOL[cls] }}>{moist.toFixed(0)}%</i>
      </button>
      <div className="sc-trk sc-lane" style={{ gridRow: row }}>
        {parts.map(([a, b], i) => {
          const last = i === parts.length - 1;
          const pct = ((b - a) / 24) * 100;
          return (
            <div key={i} className={`sc-run ${st} ${edited ? "edited" : ""}`} style={{ left: `${(a / 24) * 100}%`, width: `calc(${pct}% - 1px)` }}
              tabIndex={p.fault ? -1 : 0} role="button" aria-label={`${p.id}: ${hh(w.start)} to ${hh((w.start + w.len) % 24)}, ${STATE_TEXT[st]}. Arrow keys move it, Shift and arrows change its length.`}
              onPointerDown={(e) => !p.fault && down(e, p.id, "move")} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={(e) => !p.fault && keyDown(e, p.id)}>
              {i === wide && pct > 11 && <span>{hh(w.start)}–{hh((w.start + w.len) % 24)} · {w.len} h{st === "fault" ? " · blocked" : ""}</span>}
              {last && !p.fault && <u className="sc-grip" onPointerDown={(e) => down(e, p.id, "size")} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-hidden />}
            </div>
          );
        })}
      </div>
    </>
  );
}

function WeekRow({ p, week, skips, focus, toggle }: { p: Pivot; week: ReturnType<typeof weekPlan>; skips: Record<string, boolean>; focus: number | null; toggle: (day: number) => void }) {
  return (
    <>
      <div className="sc-wk-l"><b>{p.id}</b><span>{p.crop}</span></div>
      {week.days.map((d, i) => {
        const c = week.cell(p, i), skip = !!skips[`${p.id}:${i}`];
        return (
          <button key={d.d} className={`sc-wk-c ${p.fault ? "fault" : skip ? "skip" : ""} ${focus === i ? "focus" : ""}`} disabled={!!p.fault} onClick={() => toggle(i)}
            title={p.fault ? `${p.id} is blocked: ${p.fault}` : `${p.id} ${d.d}: ${c.mm.toFixed(1)} mm from ${hh(c.start)}, ${fmt(dailyM3(p) * (d.et0 / week.days[0].et0))} m³`}>
            {p.fault ? "Blocked" : skip ? "Skipped" : <><b>{c.mm.toFixed(1)} mm</b><span>{hh(c.start)}</span></>}
          </button>
        );
      })}
    </>
  );
}
