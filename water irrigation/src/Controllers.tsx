import { useMemo, useState, type ReactNode } from "react";
import { Droplets, Radio } from "lucide-react";
import { fmt, MOMENT_LABELS, momentHour, type Moment } from "./farm";
import { flowLpm, LCTRLS, runMin, siteWeather, zonesAt, type CtrlId, type LCtrl, type LZone, type ZoneNow } from "./landscape";
import { Panel, Segmented } from "./ui";

const hh = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60) % 60).padStart(2, "0")}`;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY = (new Date().getDay() + 6) % 7; // Monday is 0
const m3h = (lpm: number) => (lpm * 60) / 1000;
const MV: Record<CtrlId, number> = { C1: 1, C2: 2, C3: 3 };
const METER: Record<CtrlId, string> = { C1: "FM-1 · Flow meter, gate", C2: "FM-2 · Flow meter, HQ", C3: "FM-3 · Flow meter, roads" };
const SOAK: Record<string, [number, number]> = { Lawn: [8, 20], Flowers: [8, 15], Shrubs: [15, 30], Trees: [20, 45], Palms: [20, 45] }; // cycle and soak minutes

/** a label and a value box, like a field on the controller screen */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="ct-row"><span>{label}</span>{children}</div>;
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
function Station({ c, n, status, running, onStart, onStop, flowOn }: { c: LCtrl; n: ZoneNow; status: string; running: boolean; onStart: () => void; onStop: () => void; flowOn: boolean }) {
  const z = n.z;
  const [cy, so] = SOAK[z.type];
  const [rt, setRt] = useState(String(Math.round(runMin(z))));
  const [cycle, setCycle] = useState(String(cy));
  const [soak, setSoak] = useState(String(so));
  const [delay, setDelay] = useState("30");
  const [prio, setPrio] = useState(true);
  const [msg, setMsg] = useState("");
  const learned = m3h(flowLpm(z));
  return (
    <Panel title={`${c.id} · Station ${z.id}`} className="ct-st" i={2}>
      <div className="ct-hero">
        <span className={`ct-valve ${running ? "on" : ""} ${z.fault ? "bad" : ""}`}><Droplets size={26} /></span>
        <div><b>{z.name}</b><small>{z.type} · {fmt(z.area)} m²</small></div>
        <em className={`chip ${z.fault ? "bad" : running ? "info" : status === "Done" ? "good" : status === "Held" ? "warn" : "mute"}`}>{status}</em>
      </div>

      <h4>Manual operation</h4>
      <div className="ct-box">
        <Field label="Runtime"><Num value={rt} onChange={setRt} unit="min" /></Field>
        <div className="ct-btns">
          <button className="btn pri" disabled={!!z.fault || running} onClick={onStart} title={z.fault ?? "Open the valve now"}>Start</button>
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
        <button className="btn" onClick={() => setMsg(`Read back from ${c.id}`)}>Update</button>
        <button className="btn pri" onClick={() => setMsg(`Sent to ${c.id}: ${rt} min, cycle ${cycle}, soak ${soak}`)}>Apply</button>
      </div>
      <p className="ct-foot" aria-live="polite">{msg || `Fields start from the plan for ${z.id}.`}</p>
    </Panel>
  );
}

/** Landscape · Controllers: schedule, valve panel and flow sensor for each of the three irrigation controllers */
export default function Controllers({ start }: { start?: string }) {
  const [cid, setCid] = useState<CtrlId>(LCTRLS.some((c) => c.id === start) ? (start as CtrlId) : "C1");
  const [moment, setMoment] = useState<Moment>("Evening");
  const [etAdj, setEtAdj] = useState("100");
  const [rainDelay, setRainDelay] = useState("Off");
  const [windMax, setWindMax] = useState("35");
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const [days, setDays] = useState<Record<string, boolean[]>>({});
  const [sel, setSel] = useState<Record<string, string>>({});
  const [mgr, setMgr] = useState<Record<string, boolean>>({});
  const [mon, setMon] = useState<Record<string, boolean>>({});
  const hour = momentHour(moment);
  const adj = +etAdj;
  const snap = useMemo(() => zonesAt(hour, adj), [hour, adj]);
  const w = siteWeather(hour);

  const c = LCTRLS.find((x) => x.id === cid)!;
  const idx = LCTRLS.indexOf(c);
  const cDays = days[cid] ?? DAYS.map(() => true);
  const dayOk = cDays[TODAY];
  const held = rainDelay === "On" || w.wind > +windMax || !dayOk;
  const mine = snap.filter((n) => n.z.ctrl === cid);
  const zone: LZone = (mine.find((n) => n.z.id === sel[cid]) ?? mine[0]).z;
  const nz = mine.find((n) => n.z === zone)!;

  const state = (n: ZoneNow) => (manual[n.z.id] && !n.z.fault ? "Manual" : n.status === "Watering" && held ? "Held" : n.status);
  const isOpen = (n: ZoneNow) => (manual[n.z.id] && !n.z.fault) || (n.status === "Watering" && !held);
  const tone = (s: string) => (s === "Watering" || s === "Manual" ? "info" : s === "Fault" ? "bad" : s === "Held" ? "warn" : s === "Done" ? "good" : "mute");
  const lpm = mine.reduce((s, n) => s + (isOpen(n) ? (n.lpm || flowLpm(n.z)) : 0), 0);
  const openNow = mine.filter(isOpen).length;
  const totalM3 = mine.filter((n) => !n.z.fault).reduce((s, n) => s + (flowLpm(n.z) * runMin(n.z, adj)) / 1000, 0);
  const alarm = mine.some((n) => n.z.fault) ? "VALVE FAULT" : held && mine.some((n) => n.status === "Watering") ? "WATERING HELD" : lpm > 0 ? "ZONE ACTIVITY" : "NORMAL";
  const alarmTone = alarm === "VALVE FAULT" ? "bad" : alarm === "WATERING HELD" ? "warn" : lpm > 0 ? "info" : "good";
  const learned = m3h(flowLpm(zone));
  const events = Array.from({ length: 8 }, (_, i) => mine[i] ?? null);
  const stopAll = () => setManual((m) => { const o = { ...m }; mine.forEach((n) => { o[n.z.id] = false; }); return o; });

  return (
    <div className="vw ct">
      <div className="ct-top">
        <h2>Irrigation controllers</h2>
        <Segmented<CtrlId> label="Controller" value={cid} options={LCTRLS.map((x) => x.id)} onChange={setCid} />
        <span className="ct-name">{c.name} · {c.place}</span>
        <div className="ct-rules">
          <label>Rain delay<Segmented<string> label="Rain delay" value={rainDelay} options={["Off", "On"]} onChange={setRainDelay} /></label>
          <label>Wind lockout km/h<Segmented<string> label="Wind lockout" value={windMax} options={["15", "25", "35"]} onChange={setWindMax} /></label>
          <Segmented<Moment> label="Time of day" value={moment} options={MOMENT_LABELS} onChange={setMoment} />
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
              <h4>Start times</h4>
              <div className="ct-starts">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className={i === 0 ? "on" : ""}><span>Start {i + 1}</span><b>{i === 0 ? hh(c.start) : "--:--"}</b><em>{i === 0 ? "ON" : "OFF"}</em></div>
                ))}
              </div>
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
                    {events.map((n, i) => n ? (
                      <tr key={i} className={n.z.id === zone.id ? "sel" : ""} onClick={() => setSel((m) => ({ ...m, [cid]: n.z.id }))}>
                        <td>{i + 1}</td><td>STATION</td><td><b>{n.z.id}</b></td>
                        <td>{n.z.fault ? "—" : `${hh(n.start)}–${hh(n.end)}`}</td>
                        <td>{n.z.fault ? <em className="chip bad">Fault</em> : <>{fmt(runMin(n.z, adj))} min <em className={`chip ${tone(state(n))}`}>{state(n)}</em></>}</td>
                      </tr>
                    ) : (
                      <tr key={i} className="nan"><td>{i + 1}</td><td>//NAN//</td><td>0</td><td>—</td><td>0</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Station key={zone.id} c={c} n={nz} status={state(nz)} running={isOpen(nz)} flowOn={lpm > 0}
        onStart={() => setManual((m) => ({ ...m, [zone.id]: true }))} onStop={() => setManual((m) => ({ ...m, [zone.id]: false }))} />

      <Panel title="Flow sensor" className="ct-fl" i={3}>
        <div className="ct-hero">
          <span className={`ct-led ${alarm === "VALVE FAULT" ? "bad" : lpm > 0 ? "on" : ""}`} aria-label={lpm > 0 ? "Flowing" : "No flow"} />
          <div><b>{METER[cid].split(" · ")[1]}</b><small>{METER[cid].split(" · ")[0]} · {c.id}</small></div>
        </div>
        <div className="ct-box"><Field label="Current flow"><Val v={m3h(lpm).toFixed(1)} unit="m³/h" /></Field></div>

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
          <Field label="Manual allowance"><Val v="5.0" unit="m³" /></Field>
          <Field label="Alarm clear delay"><Val v="0 : 1" unit="min" /></Field>
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
