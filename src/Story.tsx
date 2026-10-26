import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from "lucide-react";
import type { TabId } from "./data";
import { STEPS, storyCmd } from "./storytour";

/** the tour's captions and controls; it changes tab and sends commands on a timeline, and stays out of the way of the page */
export default function Story({ go, ready, onExit }: { go: (tab: TabId) => void; ready: boolean; onExit: () => void }) {
  const [i, setI] = useState(0);
  const [run, setRun] = useState(0);
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const fired = useRef<Set<number>>(new Set());
  const step = STEPS[i];

  // entering a step: go to its tab and restart its clock
  useEffect(() => {
    if (!ready) return;
    fired.current = new Set();
    setT(0);
    go(STEPS[i].tab);
  }, [i, run, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready || paused || done) return;
    // measure real time between ticks, so a slow or busy machine does not slow the tour down
    let last = performance.now();
    const id = window.setInterval(() => { const n = performance.now(); const dt = Math.min(0.5, (n - last) / 1000); last = n; setT((x) => x + dt); }, 100);
    return () => window.clearInterval(id);
  }, [ready, paused, done]);

  // send each command once when its time comes, and move on at the end of the step
  useEffect(() => {
    if (!ready || done) return;
    step.cmds?.forEach((c, k) => { if (t >= c.t && !fired.current.has(k)) { fired.current.add(k); storyCmd(c.cmd, c.arg); } });
    if (t >= step.secs) { if (i < STEPS.length - 1) setI(i + 1); else setDone(true); }
  }, [t]); // eslint-disable-line react-hooks/exhaustive-deps

  const prev = () => { setDone(false); if (t > 1.5 || i === 0) setRun((r) => r + 1); else setI(i - 1); };
  const next = () => { if (i < STEPS.length - 1) setI(i + 1); else setDone(true); };
  const replay = () => { setDone(false); setPaused(false); setI(0); setRun((r) => r + 1); };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape") onExit();
      else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;
  return (
    <div className="story" role="region" aria-label="Guided tour">
      <div className="story-bars" aria-hidden>
        {STEPS.map((s, k) => <i key={k} className={k < i || done ? "full" : ""}>{k === i && !done && <u style={{ width: `${Math.min(100, (t / s.secs) * 100)}%` }} />}</i>)}
      </div>
      {done ? (
        <div className="story-body">
          <div className="story-text"><small>That is the tour</small><h3>Telal West AI City</h3><p>Eight services, one platform. Everything you saw is sample data on the brief's real plan.</p></div>
          <div className="story-ctl"><button onClick={replay}><RotateCcw size={16} /> Replay</button><button className="go" onClick={onExit}>Explore it yourself</button></div>
        </div>
      ) : (
        <div className="story-body" key={`${i}-${run}`}>
          <div className="story-text"><small>{i + 1} of {STEPS.length}</small><h3>{step.title}</h3><p>{step.text}</p></div>
          <div className="story-ctl">
            <button onClick={prev} aria-label="Previous"><ChevronLeft size={18} /></button>
            <button onClick={() => setPaused(!paused)} aria-label={paused ? "Resume" : "Pause"}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>
            <button onClick={next} aria-label="Next"><ChevronRight size={18} /></button>
            <button onClick={onExit} aria-label="Close the tour"><X size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
