import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Activity, Ban, Camera as CamIcon, Car, CloudFog, CloudRain, Footprints, Users, Construction, Gauge, LayoutGrid, Lightbulb, Maximize2, Minus, MonitorOff, Moon, Package, Plus, ScanSearch, Send, Siren, Sun, Timer, TrafficCone, Truck, Undo2, Wind, Wrench, Eye, type LucideIcon } from "lucide-react";
import { CAMS, readCam, type Cam, type Fault, type FaultKind, type Scenario } from "./cams";
import { type RoadSev, useRoad } from "./road";
import { PRESETS, autoVms, type VmsMode } from "./vms";
import { useTick } from "./live";
import { rowsFor } from "./model";
import { useFilters } from "./state";
import { sp } from "./Overview";
import { Kpi, KpiRow, Panel, StatusPill } from "./ui";
import type { PTZ } from "./Scene3D";
import PhotoCam from "./PhotoCam";

const Scene3D = lazy(() => import("./Scene3D"));

const ICON: Record<FaultKind, LucideIcon> = {
  Accident: Siren, Debris: Package, "Stopped vehicle": Car, Breakdown: Truck, "Wrong-way driver": Ban, "Road damage": Wrench, "Low visibility": CloudFog,
  Sandstorm: Wind, Roadworks: Construction, Queue: TrafficCone, "Lamp fault": Lightbulb, "Lens dust": CamIcon, "VMS offline": MonitorOff, Pedestrian: Footprints, Pedestrians: Users, "Heavy rain": CloudRain,
};
const SEV_COLOR: Record<RoadSev, string> = { critical: "var(--bad)", warning: "var(--warn)", info: "var(--info)" };
const SEV_RANK: Record<RoadSev, number> = { critical: 0, warning: 1, info: 2 };
const pad = (n: number) => String(n).padStart(2, "0");
const PTZ0: PTZ = { yaw: 0, zoom: 1 };
const noop = () => {};
const worstOf = (f: Fault[]): RoadSev | null => (f.length ? f.reduce((a, b) => (SEV_RANK[b.sev] < SEV_RANK[a.sev] ? b : a)).sev : null);

interface Read { cam: Cam; sc: Scenario; faults: Fault[] }
interface VmsNow { lines: string[]; mode: VmsMode }

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);
  return now;
}

function Tile({ read, vms, night, overlay, big, ptz, onPtz, now, onPick, onExpand }: { read: Read; vms: VmsNow; night: boolean; overlay: boolean; big: boolean; ptz: PTZ; onPtz: (p: PTZ) => void; now: Date; onPick?: (id: string) => void; onExpand: () => void }) {
  const { cam, sc, faults } = read;
  const fm = faults.find((f) => f.kind === "Stopped vehicle" || f.kind === "Breakdown")?.mins ?? 0;
  const crit = faults.some((f) => f.sev === "critical");
  const vis = sc.weather === "fog" ? "0.3 km" : sc.weather === "sand" ? "1.6 km" : "10+ km";
  return (
    <div className={`tile ${big ? "big" : ""} ${crit ? "alarm" : ""}`}>
      {cam.stream
        ? <video className="cam3d-gl" src={cam.stream} autoPlay muted loop playsInline />
        : cam.photo
        ? <PhotoCam cam={cam} sc={sc} night={night} overlay={overlay} compact={!big} faultMins={fm} />
        : <Suspense fallback={<div className="feedload">Starting camera…</div>}>
            <Scene3D cam={cam} sc={sc} night={night} overlay={overlay} ptz={ptz} onPtz={onPtz} faultMins={fm} vms={{ lines: vms.lines, offline: vms.mode === "offline" }} compact={!big} />
          </Suspense>}
      <div className="scan" aria-hidden />
      {sc.dust && <div className="dustlens" aria-hidden />}
      <div className="hud hud-tl">
        {onPick
          ? <label className="tilesel"><b>CAM {pad(cam.n)}</b><select value={cam.id} onChange={(e) => onPick(e.target.value)} aria-label="Camera on this screen">{CAMS.map((c) => <option key={c.id} value={c.id}>{pad(c.n)} · {c.name}</option>)}</select></label>
          : <b>CAM {pad(cam.n)}</b>}
        <span>{cam.name.toUpperCase()}</span>
      </div>
      <div className="hud hud-tr"><i className="rec" />{pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}<button className="tilebtn" onClick={onExpand} aria-label={big ? "Back to the wall" : `Full screen: camera ${cam.n}`} title={big ? "Back to the wall" : "Full screen"}>{big ? <LayoutGrid size={13} /> : <Maximize2 size={13} />}</button></div>
      {faults.length > 0 && <div className="faultbar">{(big ? faults : faults.slice(0, 1)).map((f) => <span key={f.id} style={{ ["--c" as string]: SEV_COLOR[f.sev] }}>{f.title}</span>)}{!big && faults.length > 1 && <span style={{ ["--c" as string]: "var(--muted)" }}>+{faults.length - 1}</span>}</div>}
      {big && <div className="hud hud-bl"><span>LIMIT 100</span><span>VIS {vis}</span><span>ZOOM {ptz.zoom.toFixed(1)}x</span></div>}
      {big && <div className="ptzctl" role="group" aria-label="Camera zoom"><button onClick={() => onPtz({ ...ptz, zoom: Math.min(3.5, ptz.zoom * 1.3) })} aria-label="Zoom in"><Plus size={14} /></button><button onClick={() => onPtz({ ...ptz, zoom: Math.max(1, ptz.zoom / 1.3) })} aria-label="Zoom out"><Minus size={14} /></button></div>}
      <div className={`tilevms ${vms.mode}`} title="Variable message sign on this road section">
        <b>VMS</b><span>{vms.mode === "offline" ? "OFFLINE · NO REPLY FROM SIGN" : vms.lines.join("  ·  ")}</span><em>{vms.mode}</em>
      </div>
    </div>
  );
}

export default function Surveillance() {
  const road = useRoad();
  const tick = useTick();
  const { range } = useFilters();
  const now = useNow();
  const [tiles, setTiles] = useState<string[]>(["P1", "P2", "P3", "P4", "P5", "P6"]);
  const [focus, setFocus] = useState<string | null>(null);
  const [night, setNight] = useState(() => document.documentElement.dataset.theme === "dark");
  const [overlay, setOverlay] = useState(true);
  const [ptz, setPtz] = useState<PTZ>(PTZ0);
  const [manual, setManual] = useState<Record<string, string[]>>({});
  const [selVms, setSelVms] = useState("C3");
  const [preset, setPreset] = useState(1);

  const reads = useMemo<Read[]>(() => CAMS.map((c) => ({ cam: c, ...readCam(c, road, tick) })), [road, tick]);
  const byId = (id: string) => reads.find((r) => r.cam.id === id)!;
  const vmsOf = (r: Read): VmsNow => (r.sc.vmsOffline ? { lines: [], mode: "offline" } : manual[r.cam.id] ? { lines: manual[r.cam.id], mode: "manual" } : { lines: autoVms(r.sc), mode: "auto" });
  const allFaults = useMemo(() => reads.flatMap((r) => r.faults).sort((a, b) => SEV_RANK[a.sev] - SEV_RANK[b.sev] || a.mins - b.mins), [reads]);
  const critical = allFaults.filter((f) => f.sev === "critical").length;
  const rows = useMemo(() => rowsFor(range, tick, [{ key: "Vehicles", base: 1500, amp: 0.5, seed: 61, phase: 0.2 }]), [range, tick]);
  const k = road.kpi;
  const vmsOnline = reads.filter((r) => !r.sc.vmsOffline).length;
  const manualCount = Object.keys(manual).filter((id) => !byId(id).sc.vmsOffline).length;
  const open = (id: string) => { setFocus(id); setSelVms(id); setPtz(PTZ0); };
  const target = byId(selVms);
  const publish = () => { if (!target.sc.vmsOffline) setManual({ ...manual, [selVms]: PRESETS[preset].lines }); };
  const back = () => { const m = { ...manual }; delete m[selVms]; setManual(m); };

  return (
    <div className="tab">
      <KpiRow cols={6}>
        <Kpi n={0} label="Vehicles per hour" value={k.vph} icon={Activity} tone="accent" sub="both directions (sample)" spark={sp(rows, "Vehicles")} />
        <Kpi n={1} label="Average speed" value={k.avgSpeed} decimals={0} suffix=" km/h" icon={Gauge} tone={k.avgSpeed >= 75 ? "good" : "warn"} sub="limit 100 km/h" />
        <Kpi n={2} label="Active faults" value={allFaults.length} icon={Siren} tone={critical ? "bad" : "warn"} sub={`${critical} critical · ${CAMS.length} cameras`} />
        <Kpi n={3} label="Lowest visibility" value={k.visMin} decimals={1} suffix=" km" icon={Eye} tone={k.visMin < 1 ? "bad" : k.visMin < 5 ? "warn" : "good"} sub="weather stations" />
        <Kpi n={4} label="Message signs online" value={vmsOnline} suffix={` / ${CAMS.length}`} icon={MonitorOff} tone={vmsOnline < CAMS.length ? "warn" : "good"} sub={`${manualCount} showing a manual message`} />
        <Kpi n={5} label="Average clearance" value={k.clearMin} decimals={0} suffix=" min" icon={Timer} tone="violet" sub="time to clear a fault" />
      </KpiRow>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,2.25fr) minmax(0,1fr)" }}>
        <Panel i={0} title={focus ? `CAM ${pad(byId(focus).cam.n)} · ${byId(focus).cam.name}` : "Camera wall · 6 screens"} className="feedpanel" aside={
          <div className="feedtools">
            {focus && <button className="btn" onClick={() => setFocus(null)}><LayoutGrid size={13} />Wall</button>}
            <div className="seg" role="group" aria-label="Day or night">
              <button className={!night ? "on" : ""} onClick={() => setNight(false)} aria-pressed={!night}><Sun size={12} /> Day</button>
              <button className={night ? "on" : ""} onClick={() => setNight(true)} aria-pressed={night}><Moon size={12} /> Night</button>
            </div>
            <button className={`chip ${overlay ? "on" : ""}`} onClick={() => setOverlay(!overlay)} style={{ ["--c" as string]: "var(--good)" }} aria-pressed={overlay}><i /><ScanSearch size={12} />AI detection</button>
          </div>}>
          {focus ? (
            <>
              <div className="wall one"><Tile read={byId(focus)} vms={vmsOf(byId(focus))} night={night} overlay={overlay} big ptz={ptz} onPtz={setPtz} now={now} onExpand={() => setFocus(null)} /></div>
              <div className="camstrip" role="tablist" aria-label="Cameras">
                {reads.map((r) => { const w = worstOf(r.faults); return (
                  <button key={r.cam.id} role="tab" aria-selected={r.cam.id === focus} className={r.cam.id === focus ? "on" : ""} onClick={() => open(r.cam.id)} title={r.cam.name} style={{ ["--c" as string]: w ? SEV_COLOR[w] : "var(--good)" }}><i /><b>{pad(r.cam.n)}</b><span>{r.cam.name}</span></button>
                ); })}
              </div>
            </>
          ) : (
            <div className="wall">
              {tiles.map((id, i) => (
                <Tile key={i} read={byId(id)} vms={vmsOf(byId(id))} night={night} overlay={overlay} big={false} ptz={PTZ0} onPtz={noop} now={now}
                  onPick={(c) => setTiles(tiles.map((t, j) => (j === i ? c : t)))} onExpand={() => open(id)} />
              ))}
            </div>
          )}
        </Panel>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1fr) minmax(0,1.25fr)" }}>
          <Panel i={1} title="Detected faults" aside={<StatusPill tone={critical ? "bad" : allFaults.length ? "warn" : "good"}>{allFaults.length} active</StatusPill>}>
            <ul className="incs scroll">
              {allFaults.map((f) => {
                const I = ICON[f.kind], c = CAMS.find((x) => x.id === f.cam)!;
                return (
                  <li key={f.id}>
                    <button className={f.cam === focus ? "on" : ""} onClick={() => open(c.id)}>
                      <span className="inc-ic" style={{ background: SEV_COLOR[f.sev] }}><I size={14} color="#fff" strokeWidth={2.3} /></span>
                      <span className="inc-t"><b>{f.title}</b><em>CAM {pad(c.n)} · {c.name}</em><small>{f.detail}</small><small>{f.mins < 1 ? "just now" : f.mins < 60 ? `${f.mins} min` : `${Math.floor(f.mins / 60)} h ${f.mins % 60} min`} · confidence {f.conf}%</small></span>
                    </button>
                  </li>
                );
              })}
              {!allFaults.length && <li className="empty">No faults detected on any camera.</li>}
            </ul>
          </Panel>
          <Panel i={2} title="Message signs (VMS)" aside={<StatusPill tone={vmsOnline < CAMS.length ? "warn" : "good"}>{vmsOnline}/{CAMS.length} online</StatusPill>}>
            <ul className="vmslist scroll">
              {reads.map((r) => { const v = vmsOf(r); return (
                <li key={r.cam.id}>
                  <button className={selVms === r.cam.id ? "on" : ""} onClick={() => setSelVms(r.cam.id)}>
                    <span className="vmsname">{pad(r.cam.n)} {r.cam.name}</span>
                    <span className={`led ${v.mode}`}>{v.mode === "offline" ? "- - -" : v.lines.join(" · ")}</span>
                    <em className={`mode ${v.mode}`}>{v.mode}</em>
                  </button>
                </li>
              ); })}
            </ul>
            <div className="vmsed">
              <span className="muted small">Sign {pad(target.cam.n)}</span>
              <select value={preset} onChange={(e) => setPreset(Number(e.target.value))} aria-label="Message to publish">{PRESETS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}</select>
              <button className="btn" onClick={publish} disabled={target.sc.vmsOffline}><Send size={13} />Publish</button>
              <button className="btn" onClick={back} disabled={!manual[selVms]}><Undo2 size={13} />Auto</button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
