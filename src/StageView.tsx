import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Gauge, Pause, Play, Power, PowerOff, Square, X } from "lucide-react";
import { fmt, stageTrend, type Filters, type Stage } from "./data";
import { axis, C, Chip, CountUp, gridProps, LiveText, popDelay, Replay, Tip } from "./ui";
import { wobble, wobbleCapped } from "./live";
import { QualityRows, LanesTable } from "./Panels";
import { effective, SCENES, type TagDef, type TagState } from "./Scenes";
import { useEquip } from "./Equip";

const STATE_TONE: Record<TagState, "good" | "info" | "bad" | "mute"> = { Running: "good", Standby: "info", Alarm: "bad", Normal: "mute" };
const KPIS = "__kpis__";

/** play and pause icons that turn into each other */
export function PlayPauseIcon({ playing }: { playing: boolean }) {
  return (
    <span className="pp-icon">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={playing ? "pause" : "play"} initial={{ rotate: -90, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.4, opacity: 0 }} transition={{ duration: 0.18 }}>
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Rows({ rows, t, seed }: { rows: TagDef["rows"]; t: number; seed: number }) {
  return (
    <div className="pop-rows">
      {rows.map((x, n) => (
        <div key={x.label}>
          <span>{x.label}</span>
          <b>{typeof x.value === "number" ? <CountUp value={wobbleCapped(x.value, seed + n, t, 0.006, x.unit)} decimals={x.d ?? 0} /> : x.value}<em>{x.unit ? ` ${x.unit}` : ""}</em></b>
        </div>
      ))}
    </div>
  );
}


/** the stage summary shown in the KPIs popup: flow, readings, 24-hour trend and equipment */
export function StageKpis({ stage, t, seed, children }: { stage: Stage; t: number; seed: number; children?: ReactNode }) {
  const trend = useMemo(() => stageTrend(stage.id, stage.flow), [stage.id, stage.flow]);
  return (
    <>
      <div className="pop-head"><div><h3>{stage.name}</h3><p>{stage.note}</p></div><Chip tone={stage.tone === "good" ? "good" : stage.tone}>{stage.tone === "good" ? "Normal" : stage.tone === "warn" ? "Watch" : "Action needed"}</Chip></div>
      <div className="pop-big"><b><CountUp value={wobble(stage.flow, seed, t, 0.004)} /></b><span>{stage.unit} flowing now</span></div>
      <div className="pop-rows three">
        {stage.readings.map((x, n) => <div key={x.label}><span>{x.label}</span><b><LiveText value={x.value} wob={wobble(1, n + 7, t, 0.0012)} /><em> {x.unit}</em></b></div>)}
      </div>
      <Replay className="chart-h xs">
        <ResponsiveContainer>
          <AreaChart data={trend} margin={{ left: -6, right: 6, top: 6 }}>
            <defs><linearGradient id="popG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity={0.35} /><stop offset="100%" stopColor={C.blue} stopOpacity={0.02} /></linearGradient></defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="t" {...axis} interval={5} />
            <YAxis {...axis} width={46} domain={["dataMin - 100", "dataMax + 100"]} tickCount={3} tickFormatter={(v: number) => fmt(v)} />
            <Tooltip content={<Tip unit={stage.unit} />} cursor={{ stroke: C.blue, strokeOpacity: 0.25 }} />
            <Area type="monotone" dataKey="v" name="Flow" stroke={C.blue} strokeWidth={2} fill="url(#popG)" animationDuration={900} />
          </AreaChart>
        </ResponsiveContainer>
      </Replay>
      <ul className="pop-equip">
        {stage.equipment.map((e) => (
          <li key={e.name}>
            <span>{e.name}</span>
            <div className="bar"><i style={{ width: `${e.load}%`, background: e.state === "Alarm" ? C.bad : C.teal }} /></div>
            <Chip tone={e.state === "Running" ? "good" : e.state === "Alarm" ? "bad" : "info"}>{e.state}</Chip>
          </li>
        ))}
      </ul>
                        {children}
    </>
  );
}

/** what a tag shows on the picture, taking the operator on/off choice into account */
export function tagShow(tag: TagDef, on: boolean, seed: number, t: number): string {
  if (!tag.show) return "";
  if (tag.kind === "valve") return on ? "open" : "closed";
  if (!on) return `0${tag.show.unit}`;
  return `${fmt(wobbleCapped(tag.show.v, seed, t, 0.006, tag.show.unit), tag.show.d ?? 0)}${tag.show.unit}`;
}

/** the popup content for one piece of equipment: numbers, load bar, start/stop or on/off, and the special tables */
export function TagInfo({ tag, f, t, seed, stageId }: { tag: TagDef; f: Filters; t: number; seed: number; stageId: string }) {
  const eq = useEquip();
  const ef = effective(tag, stageId, eq.on);
  const pump = tag.kind === "pump";
  let rows = tag.rows;
  if (!ef.on) {
    rows = rows.map((r) => (typeof r.value === "number" ? { ...r, value: 0 } : r.label === "State" ? { ...r, value: pump ? "Stopped" : "Closed" } : r));
    if (pump && !rows.some((r) => r.label === "State")) rows = [{ label: "State", value: "Stopped" }, ...rows];
  }
  return (
    <>
      <div className="pop-head"><div><h3>{tag.name}</h3><p className="mono">{tag.tag}</p></div><Chip tone={STATE_TONE[ef.state]}>{ef.state}</Chip></div>
      {tag.kind && (
        <div className="pop-ctl" role="group" aria-label={pump ? "Start or stop the pump" : "Switch the valve on or off"}>
          <button className={`btn ${ef.on ? "on" : ""}`} onClick={() => eq.set(stageId, tag.id, true)} aria-pressed={ef.on}>{pump ? <><Play size={13} /> Start</> : <><Power size={13} /> On</>}</button>
          <button className={`btn ${!ef.on ? "on" : ""}`} onClick={() => eq.set(stageId, tag.id, false)} aria-pressed={!ef.on}>{pump ? <><Square size={13} /> Stop</> : <><PowerOff size={13} /> Off</>}</button>
          <span>{pump ? (ef.on ? "Running" : "Stopped") : ef.on ? "Open" : "Closed"}</span>
        </div>
      )}
      {rows.length > 0 && <Rows rows={rows} t={t} seed={seed + 50} />}
      {tag.load !== undefined && (
        <div className="pop-load"><div className="bar big"><i style={{ width: `${ef.on ? tag.load : 0}%`, background: ef.state === "Alarm" ? C.bad : C.teal }} /></div><span>{ef.on ? tag.load : 0}% load</span></div>
      )}
      {tag.special === "lanes" && <LanesTable f={f} t={t} />}
      {tag.special === "quality" && <QualityRows t={t} />}
      {tag.note && <p className="pop-note">{tag.note}</p>}
    </>
  );
}

/** the picture of one stage, with clickable tags on the equipment and a KPIs button */
export default function StageView({ stage, f, t, paused = false, onTogglePaused }: { stage: Stage; f: Filters; t: number; paused?: boolean; onTogglePaused?: () => void }) {
  const scene = SCENES[stage.id];
  const [open, setOpen] = useState<string | null>(null);
  // the picture keeps its proportions inside any box, and the tags follow it exactly
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1120, h: 630 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const k = Math.min(size.w / 800, size.h / 450);
  const offX = (size.w - 800 * k) / 2;
  const offY = (size.h - 450 * k) / 2;

  useEffect(() => { setOpen(null); }, [stage.id]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);

  const eq = useEquip();
  const tag = scene.tags.find((x) => x.id === open) ?? null;
  const seed = stage.id.length * 31;

  return (
    <div className="scene-wrap">
      <div ref={box} className={`scene ${paused ? "paused" : ""}`} style={{ ["--tagfs" as string]: `${Math.max(8.5, Math.min(12, 7.9 * k))}px` }}>
        <AnimatePresence mode="wait">
          <motion.svg key={stage.id} className="scene-art" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${stage.name}: process picture`}
            initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <scene.Art />
          </motion.svg>
        </AnimatePresence>

        <div className="scene-title"><b>{stage.name}</b><Chip tone={stage.tone === "good" ? "good" : stage.tone}>{stage.tone === "good" ? "Normal" : stage.tone === "warn" ? "Watch" : "Action needed"}</Chip></div>
        <div className="scene-tools">
          {onTogglePaused && <button className="scene-btn" onClick={onTogglePaused} aria-pressed={paused} aria-label={paused ? "Play the moving water" : "Pause the moving water"}><PlayPauseIcon playing={!paused} /> {paused ? "Play" : "Pause"}</button>}
          <button className="kpi-btn" onClick={() => setOpen(KPIS)}><Gauge size={15} /> KPIs</button>
        </div>

        {scene.tags.map((x, n) => {
          const ef = effective(x, stage.id, eq.on);
          return (
            <div key={`${stage.id}-${x.id}`} className="tag-pos" style={{ left: offX + x.x * k, top: offY + x.y * k }}>
              <motion.button className={`tag st-${ef.state}`}
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: popDelay(n), type: "spring", stiffness: 420, damping: 26 }}
                onClick={() => setOpen(x.id)} aria-label={`${x.name}, ${x.tag}`}>
                <i className="tag-dot" />
                <b>{x.tag}</b>
                {x.show && <span>{tagShow(x, ef.on, seed + n, t)}</span>}
              </motion.button>
            </div>
          );
        })}

        <AnimatePresence>
          {open && (
            <motion.div className="pop-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
              <motion.div className={`pop ${open === KPIS || tag?.special ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={open === KPIS ? `${stage.name} KPIs` : tag?.name}
                initial={{ opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }} transition={{ type: "spring", stiffness: 360, damping: 30 }}
                onClick={(e) => e.stopPropagation()}>
                <button className="pop-x" onClick={() => setOpen(null)} aria-label="Close"><X size={16} /> Close</button>

                {open === KPIS && <StageKpis stage={stage} t={t} seed={seed} />}

                {tag && <TagInfo tag={tag} f={f} t={t} seed={seed} stageId={stage.id} />}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
