import { useEffect, useRef, useState } from "react";
import { Bus as BusIcon, Car, Clock, MonitorPlay, Pause, Play, Timer } from "lucide-react";
import { CITY, MAP_H, MAP_W } from "./data";
import { DOT_CACHE } from "./CityMap";
import { rng, useTick } from "./live";
import { useCity } from "./model";
import { useFilters } from "./state";
import { MapStage, createClock, useSimTime, type Clock as SimClock, type Focus } from "./PanZoom";
import { BUSES, ROUTES, ROUTE_BY_ID, STATIONS, STATIONS_TOTAL, busKmh, busLoad, busNow, etaMin, nextStop, type Station } from "./transit";
import { sp } from "./Overview";
import { Kpi, KpiRow, Meter, Panel, StatusPill, fmt } from "./ui";

const eta = (m: number) => (m < 0.5 ? "now" : `${Math.round(m)} min`);
const SEGS = 8;

function Buses({ clock, routeSel, selBus, onPick, sk }: { clock: SimClock; routeSel: string | null; selBus: string | null; onPick: (id: string) => void; sk: number }) {
  const t = useSimTime(clock, 20);
  return (
    <g>
      {BUSES.map((b) => {
        const n = busNow(b, t), dim = routeSel !== null && routeSel !== b.route, r = 12 * sk;
        return (
          <g key={b.id} className={`bus ${dim ? "dim" : ""}`} role="button" tabIndex={0} aria-label={`Bus ${b.id}, ${n.route.name}`} onClick={() => onPick(b.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(b.id); } }}>
            {selBus === b.id && <circle cx={n.x} cy={n.y} r={r * 1.75} className="rd-ring" />}
            <circle cx={n.x} cy={n.y} r={r} fill={n.route.color} className="bus-c" />
            <BusIcon x={n.x - 7 * sk} y={n.y - 7 * sk} size={14 * sk} color="#fff" strokeWidth={2.4} />
            <title>{`Bus ${b.id} · ${n.route.name}`}</title>
          </g>
        );
      })}
    </g>
  );
}

function Details({ clock, routeSel, selBus, selStop, tick, onBus, onClear }: { clock: SimClock; routeSel: string | null; selBus: string | null; selStop: string | null; tick: number; onBus: (id: string) => void; onClear: () => void }) {
  const t = useSimTime(clock, 4);
  const bus = BUSES.find((b) => b.id === selBus);
  const stop = STATIONS.find((s) => s.id === selStop);

  if (bus) {
    const n = busNow(bus, t), ns = nextStop(n), load = busLoad(bus.id, tick);
    return (
      <div className="detail">
        <div className="detail-h"><span className="swatch" style={{ background: n.route.color }} /><b>Bus {bus.id}</b><span className="muted">{n.route.name}</span><button className="link" onClick={onClear}>Close</button></div>
        <dl className="kv"><dt>Heading to</dt><dd>{n.forward ? n.route.stations[n.route.stations.length - 1].zone?.name ?? "end of line" : n.route.stations[0].zone?.name ?? "start of line"}</dd>
          <dt>Next stop</dt><dd><b>{ns.stop.id}</b> · {ns.stop.zone?.name ?? "city edge"}</dd><dt>Arrives in</dt><dd><b>{eta(ns.min)}</b></dd><dt>Speed</dt><dd>{busKmh(bus.id, tick)} km/h</dd></dl>
        <Meter label="Passengers on board" value={load} decimals={0} tone={load > 85 ? "bad" : load > 65 ? "warn" : "good"} />
      </div>
    );
  }
  if (stop) {
    const rows = BUSES.filter((b) => b.route === stop.route).map((b) => { const n = busNow(b, t); return { b, n, m: etaMin(b, n.route, stop, n) }; }).sort((a, b) => a.m - b.m).slice(0, 6);
    const route = ROUTE_BY_ID[stop.route];
    return (
      <div className="detail">
        <div className="detail-h"><span className="swatch" style={{ background: route.color }} /><b>Station {stop.id}</b><span className="muted">{stop.zone?.name ?? "city edge"}</span><button className="link" onClick={onClear}>Close</button></div>
        <p className="note">{route.name}, a bus every {route.headway} min (sample)</p>
        <ul className="rows scroll">{rows.map(({ b, m }) => <li key={b.id}><button className="rowbtn" onClick={() => onBus(b.id)}>Bus {b.id}</button><b>{eta(m)}</b></li>)}</ul>
      </div>
    );
  }
  const list = BUSES.filter((b) => !routeSel || b.route === routeSel).map((b) => { const n = busNow(b, t); return { b, n, ns: nextStop(n) }; }).sort((a, b) => a.ns.min - b.ns.min);
  return (
    <ul className="rows scroll buslist">
      {list.map(({ b, n, ns }) => (
        <li key={b.id}><button className="rowbtn" onClick={() => onBus(b.id)}><span className="swatch" style={{ background: n.route.color }} />Bus {b.id}<small>next {ns.stop.id}</small></button><b>{eta(ns.min)}</b></li>
      ))}
    </ul>
  );
}

export default function Mobility() {
  const m = useCity();
  const tick = useTick();
  const { zone } = useFilters();
  const [routeSel, setRouteSel] = useState<string | null>(null);
  const [selBus, setSelBus] = useState<string | null>(null);
  const [selStop, setSelStop] = useState<string | null>(null);
  const [traffic, setTraffic] = useState(false);
  const [parking, setParking] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [focus, setFocus] = useState<Focus | undefined>();
  const nonce = useRef(0);
  const clock = useRef<SimClock | null>(null);
  if (!clock.current) clock.current = createClock();
  useEffect(() => { const c = clock.current!; c.start(); return () => c.stop(); }, []);
  useEffect(() => { clock.current!.setPlaying(playing); }, [playing]);

  const pickBus = (id: string) => {
    const b = BUSES.find((x) => x.id === id)!, n = busNow(b, clock.current!.get());
    setSelBus(id); setSelStop(null); setRouteSel(b.route);
    setFocus({ x: n.x, y: n.y, k: 2.2, n: ++nonce.current });
  };
  const pickStop = (s: Station) => { setSelStop(s.id); setSelBus(null); setRouteSel(s.route); };
  const pickRoute = (id: string) => { setRouteSel(routeSel === id ? null : id); setSelBus(null); setSelStop(null); setFocus({ x: MAP_W / 2, y: MAP_H / 2, k: 1, n: ++nonce.current }); };
  const clear = () => { setSelBus(null); setSelStop(null); };

  const busTotal = BUSES.length;
  const detailTitle = selBus ? "Selected bus" : selStop ? "Arrivals" : "Live buses";

  return (
    <div className="tab">
      <KpiRow cols={6}>
        <Kpi n={0} label="Parking lots" value={m.lots} icon={Car} tone="violet" sub={`${fmt(m.occupied)} occupied`} />
        <Kpi n={1} label="Occupancy" value={m.occPct} decimals={0} suffix="%" icon={Car} tone={m.occPct > 85 ? "bad" : "accent"} spark={sp(m.series.parking, "Occupancy")} />
        <Kpi n={2} label="Bus stations" value={CITY.busStations} icon={BusIcon} tone="warn" sub={`${busTotal} buses on ${ROUTES.length} routes`} />
        <Kpi n={3} label="Average wait" value={m.wait} decimals={1} suffix=" min" icon={Timer} tone="info" />
        <Kpi n={4} label="On-time rate" value={m.onTime} decimals={0} suffix="%" icon={Clock} tone="good" />
        <Kpi n={5} label="Signage online" value={m.screens} icon={MonitorPlay} tone="bad" sub={`${m.screensOnline.toFixed(1)}% online`} />
      </KpiRow>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,2.3fr) minmax(0,1fr)" }}>
        <Panel i={0} title="" className="planmap" aside={
          <div className="chips">
            <button className={`chip ${traffic ? "on" : ""}`} onClick={() => setTraffic(!traffic)} style={{ ["--c" as string]: "var(--good)" }}><i />Traffic</button>
            <button className={`chip ${parking ? "on" : ""}`} onClick={() => setParking(!parking)} style={{ ["--c" as string]: "#8a63c8" }}><i />Parking</button>
          </div>}>
          <MapStage W={MAP_W} H={MAP_H} label="New Alamein City bus routes, stations and live buses on the master plan" focus={focus}
            base={<image className="map-img" href="/master-plan.webp" x="0" y="0" width={MAP_W} height={MAP_H} />}
            overlay={<>
              <div className="maphint">Drag to move · scroll to zoom · click a bus or a station</div>
              {traffic && <div className="maplegend"><span><i className="good" />Flowing</span><span><i className="warn" />Slow</span><span><i className="bad" />Jam</span><em>sample</em></div>}
            </>}>
            {(zk) => {
              const sk = 1 / Math.sqrt(zk);
              return (
                <g>
                  {ROUTES.map((r, ri) => {
                    const dim = routeSel !== null && routeSel !== r.id;
                    return (
                      <g key={r.id} className={`route ${dim ? "dim" : ""}`} pointerEvents="none">
                        <path d={r.path.d} className="route-case" style={{ strokeWidth: 12 * sk }} />
                        {traffic
                          ? Array.from({ length: SEGS }, (_, i) => {
                              const q = rng(ri * 100 + i * 7 + Math.floor(tick / 3) * 977)();
                              return <path key={i} d={r.path.slice(i / SEGS, (i + 1) / SEGS)} className={`route-seg ${q > 0.93 ? "bad" : q > 0.76 ? "warn" : "good"}`} style={{ strokeWidth: 7 * sk }} />;
                            })
                          : <path d={r.path.d} className="route-line" style={{ stroke: r.color, strokeWidth: 7 * sk }} />}
                      </g>
                    );
                  })}
                  {parking && (
                    <g pointerEvents="none">
                      {DOT_CACHE.parking.map((d) => {
                        const q = rng(d.k * 53 + Math.floor(tick / 2) * 131)();
                        const f = zone !== "all" && zone !== d.zone;
                        return <circle key={d.k} cx={d.x} cy={d.y} r={7.5 * sk} className={`pk ${q > 0.9 ? "bad" : q > 0.6 ? "warn" : "good"} ${f ? "faded" : ""}`} />;
                      })}
                    </g>
                  )}
                  {STATIONS.map((s) => {
                    const r = ROUTE_BY_ID[s.route], dim = (routeSel !== null && routeSel !== s.route) || (zone !== "all" && s.zone?.id !== zone);
                    return (
                      <g key={s.id} className={`stn ${dim ? "dim" : ""}`} role="button" tabIndex={0} aria-label={`Station ${s.id}${s.zone ? `, ${s.zone.name}` : ""}`} onClick={() => pickStop(s)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickStop(s); } }}>
                        {selStop === s.id && <circle cx={s.x} cy={s.y} r={14 * sk} className="rd-ring" />}
                        <circle cx={s.x} cy={s.y} r={6.4 * sk} className="stn-c" style={{ stroke: r.color, strokeWidth: 3.4 * sk }} />
                        <title>{`Station ${s.id}${s.zone ? ` · ${s.zone.name}` : ""}`}</title>
                      </g>
                    );
                  })}
                  <Buses clock={clock.current!} routeSel={routeSel} selBus={selBus} onPick={pickBus} sk={sk} />
                </g>
              );
            }}
          </MapStage>
        </Panel>
        <div className="col" style={{ gridTemplateRows: "auto minmax(0,1fr)" }}>
          <Panel i={1} title="Routes" aside={
            <><StatusPill tone="info">sample</StatusPill><button className="btn" onClick={() => setPlaying(!playing)} aria-pressed={!playing} title={playing ? "Pause the buses" : "Play the buses"}>{playing ? <Pause size={13} /> : <Play size={13} />}{playing ? "Pause" : "Play"}</button></>}>
            <ul className="rtl">
              {ROUTES.map((r) => (
                <li key={r.id}>
                  <button className={routeSel === r.id ? "on" : ""} onClick={() => pickRoute(r.id)} style={{ ["--c" as string]: r.color }} aria-pressed={routeSel === r.id}>
                    <i className="swatch" /><span className="rn"><b>{r.name}</b><small>{r.stops} stops · {r.buses} buses · every {r.headway} min</small></span><em>{r.onTime}%</em>
                  </button>
                </li>
              ))}
            </ul>
            <p className="note">{STATIONS_TOTAL} stations in total · on-time rate per route</p>
          </Panel>
          <Panel i={2} title={detailTitle} className="grow" aside={routeSel && !selBus && !selStop ? <button className="link" onClick={() => setRouteSel(null)}>All routes</button> : undefined}>
            <Details clock={clock.current!} routeSel={routeSel} selBus={selBus} selStop={selStop} tick={tick} onBus={pickBus} onClear={clear} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
