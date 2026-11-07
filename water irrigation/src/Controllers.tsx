import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Droplets, Pause, Play, Radio } from "lucide-react";
import { fmt, MOMENT_LABELS, momentHour, type Moment } from "./farm";
import { flowLpm, LCTRLS, runMin, siteWeather, zonesAt, type CtrlId, type LCtrl, type LZone, type ZoneNow } from "./landscape";
import { Panel, Segmented } from "./ui";

const hh = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60) % 60).padStart(2, "0")}`;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY = (new Date().getDay() + 6) % 7; // Monday is 0
const m3h = (lpm: number) => (lpm * 60) / 1000;
const TICK_MS = 250, STEP_H = 0.025; // the clock moves 1.5 minutes every quarter second when playing: a 40-minute run lasts about 7 seconds
const SAMPLES = 90;
interface Run { rem: number; p: number } // minutes left and share done of a valve that is open now
interface Manual { end: number; total: number } // a hand run: hour it ends and its length in minutes
const MV: Record<CtrlId, number> = { C1: 1, C2: 2, C3: 3 };
const METER: Record<CtrlId, string> = { C1: "FM-1 · Flow meter, gate", C2: "FM-2 · Flow meter, HQ", C3: "FM-3 · Flow meter, roads" };
const SOAK: Record<string, [number, number]> = { Lawn: [8, 20], Flowers: [8, 15], Shrubs: [15, 30], Trees: [20, 45], Palms: [20, 45] }; // cycle and soak minutes

/** a label and a value box, like a field on the controller screen */
function Field({ label, children, opt }: { label: string; children: ReactNode; opt?: boolean }) {
  return <div className={`ct-row${opt ? " ct-opt" : ""}`}><span>{label}</span>{children}</div>;
}
function Val({ v, unit }: { v: string; unit?: string }) {
  return <div className="ct-val"><b>{v}</b>{unit && <small>{unit}</small>}</div>;
}
function Num({ value, onChange, unit, disabled }: { value: string; onChange: (v: string) => void; unit: string; disabled?: boolean }) {
  return (
    <label className="ct-val in">
      <input inputMode="decimal" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, "").slice(0, 5))} aria-label={unit} />
      <small>{unit}</small>
    </label>
  );
}
function Toggle({ on, labels = ["On", "Off"], onChange, label }: { on: boolean; labels?: [string, string]; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="ct-tgl" role="group" aria-label={label}>
      <button className={on ? "on" : ""} aria-pressed={on} onClick={() => onChange(true)}>{labels[0]}</button>
      <button className={!on ? "off" : ""} aria-pressed={!on} onClick={() => onChange(false)}>{labels[1]}</button>
    </div>
  );
}

/** the valve panel for one station; it is re-created for each zone so its fields start from that zone's values */
function Station({ c, n, status, running, run, onStart, onStop, flowOn }: { c: LCtrl; n: ZoneNow; status: string; running: boolean; run: Run | null; onStart: (min: number) => void; onStop: () => void; flowOn: boolean }) {
  const z = n.z;
  const [cy, so] = SOAK[z.type];
  const [rt, setRt] = useState(String(Math.round(runMin(z))));
  const [cycle, setCycle] = useState(String(cy));
  const [soak, setSoak] = useState(String(so));
  const [delay, setDelay] = useState("30");
  const [prio, setPrio] = useState(true);
  const [msg, setMsg] = useState("");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Apply shows "sending", then the controller's answer a moment later
  const send = (text: string) => { setMsg(`Sending to ${c.id}…`); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setMsg(text), 700); };
  const learned = m3h(flowLpm(z));
  const R = 20, C = 2 * Math.PI * R;
  return (
    <Panel title={`${c.id} · Station ${z.id}`} className="ct-st" i={2}>
      <div className="ct-hero">
        <span className={`ct-valve ${running ? "on" : ""} ${z.fault ? "bad" : ""}`}>
          <Droplets size={26} />
          {run && <svg className="ct-ring" viewBox="0 0 48 48" aria-hidden><circle cx="24" cy="24" r={R} className="bg" /><circle cx="24" cy="24" r={R} className="fg" strokeDasharray={`${Math.max(0, Math.min(1, run.p)) * C} ${C}`} transform="rotate(-90 24 24)" /></svg>}
        </span>
        <div><b>{z.name}</b><small>{z.type} · {fmt(z.area)} m²</small></div>
        <em className={`chip ${z.fault ? "bad" : running ? "info" : status === "Done" ? "good" : status === "Held" ? "warn" : "mute"}`}>{run ? `${status} · ${Math.max(1, Math.ceil(run.rem))} min` : status}</em>
      </div>

      <h4>Manual operation</h4>
      <div className="ct-box">
        <Field label="Runtime"><Num value={rt} onChange={setRt} unit="min" /></Field>
        <div className="ct-btns">
          <button className="btn pri" disabled={!!z.fault || running} onClick={() => onStart(Math.max(1, +rt || 1))} title={z.fault ?? "Open the valve now"}>Start</button>
          <button className="btn" disabled={!running} onClick={onStop}>Stop</button>
        </div>
      </div>

      <h4>Cycle and soak</h4>
      <div className="ct-box">
        <Field label="Cycle time"><Num value={cycle} onChange={setCycle} unit="min" /></Field>
        <Field label="Soak time"><Num value={soak} onChange={setSoak} unit="min" /></Field>
      </div>

      <h4>Hydraulic connection</h4>
      <div className="ct-box">
        <div className="ct-mv-l">Master valves</div>
        <div className="ct-mv">
          {[1, 2, 3, 4, 5, 6].map((k) => <span key={k} className={k === MV[c.id] && flowOn ? "on" : ""}><i />MV {k}</span>)}
        </div>
        <Field label="Link flow zone"><Val v={METER[c.id].split(" · ")[0]} /></Field>
      </div>

      <h4>Flow setting</h4>
      <div className="ct-box">
        <Field label="Flow priority"><Toggle on={prio} onChange={setPrio} label="Flow priority" /></Field>
        <Field label="Learned flow"><Val v={z.fault ? "0.0" : learned.toFixed(1)} unit="m³/h" /></Field>
        <Field label="Flow delay"><Num value={delay} onChange={setDelay} unit="s" /></Field>
      </div>

      <div className="ct-btns end">
        <button className="btn" onClick={() => send(`Read back from ${c.id}: all fields match`)}>Update</button>
        <button className="btn pri" onClick={() => send(`Confirmed by ${c.id}: ${rt} min, cycle ${cycle}, soak ${soak}`)}>Apply</button>
      </div>
      <p className="ct-foot" aria-live="polite">{msg || `Fields start from the plan for ${z.id}.`}</p>
    </Panel>
  );
}

/** the day plan of one controller: a lane for each station on a time line zoomed to its run, with the clock moving across all lanes */
function DayPlan({ mine, hour, adj, tone, selected, onPick }: { mine: ZoneNow[]; hour: number; adj: number; tone: (s: string) => string; selected: string; onPick: (id: string) => void }) {
  const t0 = Math.min(...mine.map((n) => n.start)), t1 = Math.max(...mine.map((n) => n.end));
  const from = Math.floor((t0 - 0.25) * 2) / 2, to = Math.ceil((t1 + 0.25) * 2) / 2, span = to - from;
  const pct = (h: number) => `${((h - from) / span) * 100}%`;
  const inside = hour >= from && hour <= to;
  const ticks = Array.from({ length: Math.floor(span) + 1 }, (_, i) => Math.ceil(from) + i).filter((h) => h <= to);
  const n = mine.length;
  return (
    <div className="ct-plan" style={{ gridTemplateRows: `repeat(${n}, minmax(var(--lane-min, 14px), 34px)) auto` }} aria-label="Day plan">
      {mine.map((x, i) => (
        <button key={`l${x.z.id}`} className={`ct-lab ${x.z.id === selected ? "sel" : ""}`} style={{ gridRow: i + 1 }} onClick={() => onPick(x.z.id)}>{x.z.id}</button>
      ))}
      {mine.map((x, i) => {
        const wide = (runMin(x.z, adj) / 60 / span) * 100;
        return (
          <div key={`t${x.z.id}`} className="ct-lane" style={{ gridRow: i + 1 }}>
            <button className={`ct-blk ${tone(x.status)} ${x.z.id === selected ? "sel" : ""}`} style={{ left: pct(x.start), width: `calc(${wide}% - 2px)` }}
              onClick={() => onPick(x.z.id)} title={`${x.z.id} ${x.z.name}: ${hh(x.start)}–${hh(x.end)}`}>{wide > 15 ? `${Math.round(runMin(x.z, adj))} min` : ""}</button>
          </div>
        );
      })}
      <div className="ct-nowwrap" style={{ gridRow: `1 / span ${n}` }}>{inside && <i className="ct-now" style={{ left: pct(hour) }} aria-hidden />}</div>
      <div className="ct-plan-ax" style={{ gridRow: n + 1 }}>
        {ticks.map((h) => <span key={h} style={{ left: pct(h) }}>{String(h % 24).padStart(2, "0")}:00</span>)}
      </div>
    </div>
  );
}

/** the live flow of the meter: the last few seconds as a line, the target and the limits behind it */
function FlowTrace({ data, target, over, under }: { data: number[]; target: number; over: number; under: number }) {
  const W = 120, H = 32;
  const top = Math.max(target * over * 1.15, ...data, 0.5);
  const y = (v: number) => H - 2 - (v / top) * (H - 4);
  const pts = data.map((v, i) => `${i ? "L" : "M"}${((i / (SAMPLES - 1)) * W).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="ct-trace" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Flow over the last seconds">
      {target > 0 && <rect x="0" y={y(target * over)} width={W} height={Math.max(0, y(target * under) - y(target * over))} className="band" />}
      {target > 0 && <line x1="0" x2={W} y1={y(target)} y2={y(target)} className="tgt" vectorEffect="non-scaling-stroke" />}
      {data.length > 1 && <path d={pts} className="ln" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

/** Landscape · Controllers: schedule, valve panel and flow sensor for each of the three irrigation controllers. A clock runs the day so valves open, count down and close in front of you. */
export default function Controllers({ start }: { start?: string }) {
  const [cid, setCid] = useState<CtrlId>(LCTRLS.some((c) => c.id === start) ? (start as CtrlId) : "C1");
  const [hour, setHour] = useState(() => (LCTRLS.find((x) => x.id === (LCTRLS.some((c) => c.id === start) ? start : "C1"))?.start ?? 2.5) - 0.1);
  const [play, setPlay] = useState(true);
  const [follow, setFollow] = useState(true);
  const [etAdj, setEtAdj] = useState("100");
  const [rainDelay, setRainDelay] = useState("Off");
  const [windMax, setWindMax] = useState("35");
  const [manual, setManual] = useState<Record<string, Manual>>({});
  const [days, setDays] = useState<Record<string, boolean[]>>({});
  const [sel, setSel] = useState<Record<string, string>>({});
  const [mgr, setMgr] = useState<Record<string, boolean>>({});
  const [mon, setMon] = useState<Record<string, boolean>>({});
  const [, frame] = useState(0);
  const bufs = useRef<Record<CtrlId, number[]>>({ C1: [], C2: [], C3: [] });
  const lpmNow = useRef(0);
  const adj = +etAdj;
  const snap = useMemo(() => zonesAt(hour, adj), [hour, adj]);
  const w = siteWeather(hour);
  const moment = MOMENT_LABELS.find((m) => Math.abs(momentHour(m) - hour) < 0.01);

  const c = LCTRLS.find((x) => x.id === cid)!;
  const idx = LCTRLS.indexOf(c);
  const cDays = days[cid] ?? DAYS.map(() => true);
  const dayOk = cDays[TODAY];
  const held = rainDelay === "On" || w.wind > +windMax || !dayOk;
  const mine = snap.filter((n) => n.z.ctrl === cid);
  const zone: LZone = (mine.find((n) => n.z.id === sel[cid]) ?? mine[0]).z;
  const nz = mine.find((n) => n.z === zone)!;

  const hand = (n: ZoneNow) => { const m = manual[n.z.id]; return m && !n.z.fault && hour < m.end ? m : undefined; };
  const state = (n: ZoneNow) => (hand(n) ? "Manual" : n.status === "Watering" && held ? "Held" : n.status);
  const isOpen = (n: ZoneNow) => !!hand(n) || (n.status === "Watering" && !held);
  const runOf = (n: ZoneNow): Run | null => {
    const m = hand(n);
    if (m) { const rem = (m.end - hour) * 60; return { rem, p: 1 - rem / m.total }; }
    if (n.status === "Watering" && !held) return { rem: (n.end - hour) * 60, p: (hour - n.start) / (n.end - n.start) };
    return null;
  };
  const tone = (s: string) => (s === "Watering" || s === "Manual" ? "info" : s === "Fault" ? "bad" : s === "Held" ? "warn" : s === "Done" ? "good" : "mute");
  const lpm = mine.reduce((s, n) => s + (isOpen(n) ? (n.lpm || flowLpm(n.z)) : 0), 0);
  const openNow = mine.filter(isOpen).length;
  const totalM3 = mine.filter((n) => !n.z.fault).reduce((s, n) => s + (flowLpm(n.z) * runMin(n.z, adj)) / 1000, 0);
  const alarm = mine.some((n) => n.z.fault) ? "VALVE FAULT" : held && mine.some((n) => n.status === "Watering") ? "WATERING HELD" : lpm > 0 ? "ZONE ACTIVITY" : "NORMAL";
  const alarmTone = alarm === "VALVE FAULT" ? "bad" : alarm === "WATERING HELD" ? "warn" : lpm > 0 ? "info" : "good";
  const learned = m3h(flowLpm(zone));
  const events = Array.from({ length: 8 }, (_, i) => mine[i] ?? null);
  const stopAll = () => setManual((m) => { const o = { ...m }; mine.forEach((n) => { delete o[n.z.id]; }); return o; });
  lpmNow.current = lpm;
  const runningId = mine.find(isOpen)?.z.id;

  // the clock: moves while playing; the flow meter keeps sampling either way
  useEffect(() => {
    const id = window.setInterval(() => {
      if (play) setHour((h) => { const x = h + STEP_H; if (x >= 24) { setManual({}); return x - 24; } return x; });
      const b = bufs.current[cid], prev = b.length ? b[b.length - 1] : 0, goal = m3h(lpmNow.current);
      b.push(Math.max(0, prev + (goal - prev) * 0.35 + (goal > 0 ? (Math.random() - 0.5) * goal * 0.04 : 0)));
      if (b.length > SAMPLES) b.shift();
      frame((k) => k + 1);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [play, cid]);
  // follow the valve that is open on this controller
  useEffect(() => { if (follow && runningId) setSel((m) => (m[cid] === runningId ? m : { ...m, [cid]: runningId })); }, [follow, runningId, cid]);
  const pick = (id: string) => { setFollow(false); setSel((m) => ({ ...m, [cid]: id })); };
  const trace = bufs.current[cid];
  const label = (rowRun: Run | null, n: ZoneNow) => (rowRun ? `${Math.max(1, Math.ceil(rowRun.rem))} min left` : n.z.fault ? "—" : `${hh(n.start)}–${hh(n.end)}`);

  return (
    <div className="vw ct">
      <div className="ct-top">
        <h2>Irrigation controllers</h2>
        <Segmented<CtrlId> label="Controller" value={cid} options={LCTRLS.map((x) => x.id)} onChange={(id) => { setCid(id); setHour(LCTRLS.find((x) => x.id === id)!.start - 0.1); setFollow(true); }} />
        <span className="ct-name">{c.name} · {c.place}</span>
        <div className="ct-rules">
          <label>Rain delay<Segmented<string> label="Rain delay" value={rainDelay} options={["Off", "On"]} onChange={setRainDelay} /></label>
          <label>Wind lockout km/h<Segmented<string> label="Wind lockout" value={windMax} options={["15", "25", "35"]} onChange={setWindMax} /></label>
          <div className="ct-clock">
            <button className="ct-play" onClick={() => { setPlay((p) => !p); setFollow(true); }} aria-label={play ? "Pause the day" : "Play the day"} title={play ? "Pause" : "Play the day"}>{play ? <Pause size={15} /> : <Play size={15} />}</button>
            <b aria-live="off">{hh(hour)}</b>
            <Segmented<Moment> label="Time of day" value={(moment ?? "") as Moment} options={MOMENT_LABELS} onChange={(m) => { setPlay(false); setFollow(true); setHour(momentHour(m)); }} />
            <button className="btn" onClick={() => { const d = new Date(); setHour(d.getHours() + d.getMinutes() / 60); setFollow(true); }} title="Jump to the real time">Now</button>
          </div>
        </div>
      </div>

      <Panel title={`Irrigation schedule · Program ${idx + 1}`} className="ct-sched" i={1}
        right={<span className="ct-link"><Radio size={14} />{c.link} {c.rssi} dBm · firmware {c.fw} · seen {c.lastSeen}</span>}>
        <div className="ct-scroll">
          <div className="ct-prog">
            <div className="ct-box">
              <Field label="Program number"><Val v={`Program ${idx + 1}`} /></Field>
              <Field label="Program selected"><Val v={`${idx + 1} of ${LCTRLS.length}`} /></Field>
            </div>
            <div className="ct-box">
              <Field label="Seasonal adjust source"><Val v="PROGRAM" /></Field>
              <Field label="Seasonal adjust"><Segmented<string> label="Seasonal adjust" value={etAdj} options={["80", "100", "120"]} onChange={setEtAdj} /></Field>
            </div>
          </div>

          <div className="ct-two">
            <div className="ct-box">
              <h4>Start settings</h4>
              <Field label="Start type"><Val v="AUTO" /></Field>
              <Field label="Stack or overlap"><Val v="STACK" /></Field>
              <Field label="No-water start"><Val v="09:00" /></Field>
              <Field label="No-water end"><Val v="16:00" /></Field>
              <Field label="Event delay"><Val v="0" unit="s" /></Field>
              <h4>Start time</h4>
              <Field label="Start 1"><Val v={hh(c.start)} unit="ON" /></Field>
            </div>

            <div className="ct-box ct-ev">
              <h4>Schedule type</h4>
              <Field label="Water days">
                <div className="ct-days" role="group" aria-label="Water days">
                  {DAYS.map((d, i) => (
                    <button key={d} className={`${cDays[i] ? "on" : ""} ${i === TODAY ? "today" : ""}`} aria-pressed={cDays[i]}
                      onClick={() => setDays((m) => ({ ...m, [cid]: cDays.map((v, k) => (k === i ? !v : v)) }))}>{d}</button>
                  ))}
                </div>
              </Field>
              {!dayOk && <p className="ct-foot warn">Today is not a water day: watering is held.</p>}
              <h4>Events</h4>
              <div className="tbl">
                <table>
                  <thead><tr><th>Order</th><th>Event type</th><th>ID</th><th>Runs</th><th>Runtime</th></tr></thead>
                  <tbody>
                    {events.map((n, i) => {
                      if (!n) return <tr key={i} className="nan"><td>{i + 1}</td><td>//NAN//</td><td>0</td><td>—</td><td>0</td></tr>;
                      const r = runOf(n);
                      return (
                        <tr key={i} className={`${n.z.id === zone.id ? "sel" : ""} ${r ? "live" : ""} ${state(n) === "Done" ? "fin" : ""}`} style={r ? { ["--p" as string]: `${Math.round(Math.max(0, Math.min(1, r.p)) * 100)}%` } : undefined} onClick={() => pick(n.z.id)}>
                          <td>{i + 1}</td><td>STATION</td><td><b>{n.z.id}</b></td>
                          <td>{label(r, n)}</td>
                          <td>{n.z.fault ? <em className="chip bad">Fault</em> : <>{fmt(runMin(n.z, adj))} min <em className={`chip ${tone(state(n))}`}>{state(n)}</em></>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="ct-box ct-planbox">
            <h4>Day plan · {c.id}</h4>
            <DayPlan mine={mine} hour={hour} adj={adj} tone={tone} selected={zone.id} onPick={pick} />
          </div>
        </div>
      </Panel>

      <Station key={zone.id} c={c} n={nz} status={state(nz)} running={isOpen(nz)} run={runOf(nz)} flowOn={lpm > 0}
        onStart={(min) => setManual((m) => ({ ...m, [zone.id]: { end: hour + min / 60, total: min } }))} onStop={() => setManual((m) => { const o = { ...m }; delete o[zone.id]; return o; })} />

      <Panel title="Flow sensor" className="ct-fl" i={3}>
        <div className="ct-hero">
          <span className={`ct-led ${alarm === "VALVE FAULT" ? "bad" : lpm > 0 ? "on" : ""}`} aria-label={lpm > 0 ? "Flowing" : "No flow"} />
          <div><b>{METER[cid].split(" · ")[1]}</b><small>{METER[cid].split(" · ")[0]} · {c.id}</small></div>
        </div>
        <div className="ct-box ct-live">
          <Field label="Current flow"><Val v={(trace.length ? trace[trace.length - 1] : 0).toFixed(1)} unit="m³/h" /></Field>
          <FlowTrace data={trace} target={zone.fault ? 0 : learned} over={1.3} under={0.4} />
        </div>

        <h4>Zone status</h4>
        <div className={`ct-alarm ${alarmTone}`}><span>Zone alarm</span><b>{alarm}</b></div>

        <h4>Flow parameters · {zone.id}</h4>
        <div className="ct-box">
          <Field label="Flow target"><Val v={zone.fault ? "0.0" : learned.toFixed(1)} unit="m³/h" /></Field>
          <Field label="Max flow limit"><Val v={(learned * 1.3).toFixed(1)} unit="m³/h" /></Field>
          <Field label="Over flow limit"><Val v="130.0" unit="%" /></Field>
          <Field label="Unscheduled flow limit"><Val v="0.0" unit="m³/h" /></Field>
          <Field label="Under flow limit"><Val v="40.0" unit="%" /></Field>
          <Field label="Monthly budget"><Val v={fmt(zone.fault ? 0 : (flowLpm(zone) * runMin(zone, adj) * 30) / 1000)} unit="m³" /></Field>
          <Field opt label="Manual allowance"><Val v="5.0" unit="m³" /></Field>
          <Field opt label="Alarm clear delay"><Val v="0 : 1" unit="min" /></Field>
        </div>

        <h4>Flow operation</h4>
        <div className="ct-box">
          <Field label="Flow manager"><Toggle on={!!mgr[cid]} labels={["Enabled", "Disabled"]} onChange={(v) => setMgr((m) => ({ ...m, [cid]: v }))} label="Flow manager" /></Field>
          <Field label="Flow monitor"><Toggle on={mon[cid] ?? true} labels={["Enabled", "Disabled"]} onChange={(v) => setMon((m) => ({ ...m, [cid]: v }))} label="Flow monitor" /></Field>
          <Field label="Flow zone alarm"><button className="btn" onClick={stopAll} disabled={!openNow} title="Closes every valve on this controller that is running by hand">Clear</button></Field>
        </div>
        <p className="ct-foot">{openNow} valve{openNow === 1 ? "" : "s"} open · {fmt(totalM3, 1)} m³ planned today · wind {w.wind} km/h{held ? " (watering held)" : ""}</p>
      </Panel>
    </div>
  );
}
