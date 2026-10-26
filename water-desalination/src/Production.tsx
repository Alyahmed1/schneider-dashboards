import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Anchor, Beaker, Container, Filter, Gauge, Pause, Play, Recycle, Send, Square, Waves, type LucideIcon } from "lucide-react";
import { stages, type Filters, type Stage } from "./data";
import { Card, CountUp, rise } from "./ui";
import { useTick, wobble } from "./live";
import StageView from "./StageView";

/** play and pause icons that turn into each other */
function PlayPauseIcon({ playing }: { playing: boolean }) {
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

const ICON: Record<string, LucideIcon> = { intake: Anchor, pre: Filter, hp: Gauge, ro: Waves, erd: Recycle, post: Beaker, tank: Container, net: Send };

export default function Production({ f, start }: { f: Filters; start?: string }) {
  const t = useTick();
  const list = useMemo(() => stages(f), [f]);
  const [sel, setSel] = useState(start ?? "intake"); // starts at step 1 unless the Overview sent you to a stage
  const cur: Stage = list.find((s) => s.id === sel) ?? list[0];

  // guided tour: walks through the 8 steps, the user picks 3, 5 or 8 seconds per step, and can pause and resume
  const [secs, setSecs] = useState(5);
  const [tour, setTour] = useState({ on: false, paused: false, idx: 0, done: false });
  const [flowOn, setFlowOn] = useState(true); // play / pause for the moving water in the picture
  const left = useRef(secs * 1000);
  const startedAt = useRef(0);
  const sceneRef = useRef<HTMLElement>(null);
  const startTour = () => { setTour({ on: true, paused: false, idx: 0, done: false }); setSel(list[0].id); setJump((n) => n + 1); };
  // on a phone the picture sits below the step grid: once the tour has started, bring it into view just under the sticky top bar
  const [jump, setJump] = useState(0);
  useEffect(() => {
    const el = sceneRef.current;
    if (!jump || !el || !window.matchMedia("(max-width: 720px), (max-height: 500px) and (max-width: 1000px)").matches) return;
    const id = requestAnimationFrame(() => {
      const bar = document.querySelector(".topbar")?.getBoundingClientRect().height ?? 0;
      el.querySelector(".scene-wrap")?.scrollTo({ left: 0 });
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - bar - 8, behavior: reduce ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [jump]);
  const stopTour = () => setTour((x) => (x.on ? { on: false, paused: false, idx: 0, done: false } : x));
  const toggleTour = () => setTour((x) => ({ ...x, paused: !x.paused }));
  useEffect(() => { left.current = secs * 1000; }, [tour.idx, secs, tour.on]);
  useEffect(() => {
    if (!tour.on || tour.paused) return;
    startedAt.current = Date.now();
    const id = window.setTimeout(() => {
      if (tour.idx >= list.length - 1) setTour({ on: false, paused: false, idx: 0, done: true });
      else setTour((x) => ({ ...x, idx: x.idx + 1 }));
    }, left.current);
    return () => { window.clearTimeout(id); left.current = Math.max(0, left.current - (Date.now() - startedAt.current)); };
  }, [tour.on, tour.paused, tour.idx, secs, list.length]);
  useEffect(() => { if (tour.on) setSel(list[tour.idx].id); }, [tour.on, tour.idx, list]);

  return (
    <>
      <Card title="The water journey" sub={tour.on ? `Step ${tour.idx + 1} of ${list.length} · ${list[tour.idx].name}${tour.paused ? " (paused)" : ""} — ${list[tour.idx].note}` : "Tap a step to see its picture, or take the tour."} i={0} className="journey-card compact"
        right={
          <div className="tour-ctl">
            <span className="tour-lab">Time per step</span>
            <div className="seg" role="group" aria-label="Seconds per step">
              {[3, 5, 8].map((s) => <button key={s} className={secs === s ? "on" : ""} onClick={() => setSecs(s)} aria-pressed={secs === s}>{s}s</button>)}
            </div>
            {!tour.on ? (
              <button className="btn" onClick={startTour}><Play size={12} /> {tour.done ? "Replay tour" : "Start tour"}</button>
            ) : (
              <>
                <button className="btn on pp" onClick={toggleTour} aria-label={tour.paused ? "Resume tour" : "Pause tour"}><PlayPauseIcon playing={!tour.paused} /> {tour.paused ? "Resume" : "Pause"}</button>
                <button className="btn" onClick={stopTour}><Square size={12} /> Stop</button>
              </>
            )}
          </div>
        }>
        <div className={`journey ${tour.on ? "touring" : ""}`} role="list">
          <div className="rail" aria-hidden><span /></div>
          {list.map((s, n) => {
            const I = ICON[s.id];
            const on = s.id === sel;
            return (
              <motion.button key={s.id} role="listitem" className={`step ${on ? "on" : ""} tone-${s.tone}`} onClick={() => { stopTour(); setSel(s.id); }} aria-pressed={on} {...rise(n * 0.6)}>
                <span className="node"><I size={17} /></span>
                <b>{s.name}</b>
                <small>{s.short}</small>
                <strong><CountUp value={wobble(s.flow, n + 1, t, 0.004)} /><em> m³/h</em></strong>
                <i className={`dot dot-${s.tone}`} />
              </motion.button>
            );
          })}
        </div>
        {tour.on && <div className="tour-bar pin"><i key={`${tour.idx}-${secs}`} className="tour-fill" style={{ animationDuration: `${secs}s`, animationPlayState: tour.paused ? "paused" : "running" }} /></div>}
      </Card>

      <Card i={1} className="scene-card" sectionRef={sceneRef}>
        <StageView stage={cur} f={f} t={t} paused={!flowOn} onTogglePaused={() => setFlowOn((v) => !v)} />
      </Card>
    </>
  );
}
