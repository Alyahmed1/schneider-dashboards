import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { ranges, zones, water, FAST_ZONE_IDS, type RangeKey, type Zone } from "./data";
import { Panel } from "./Panel";

export default function App() {
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [lineEnd, setLineEnd] = useState<{ x: number; y: number } | null>(null);
  const [range, setRange] = useState<RangeKey>("7");
  const [fastTick, setFastTick] = useState(0);
  const [slowTick, setSlowTick] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [fastLeft, setFastLeft] = useState(5);
  const [doneAlerts, setDoneAlerts] = useState<string[]>([]);
  const [alertsPage, setAlertsPage] = useState(false);
  const [light, setLight] = useState(() => window.localStorage.getItem("airport-theme") === "light");
  const reduce = useReducedMotion();
  const zone =
    zoneId === "water" ? water : (zones.find((item) => item.id === zoneId) ?? null);
  const fastOpen = zone !== null && FAST_ZONE_IDS.has(zone.id);
  const tick = fastOpen ? fastTick : slowTick;
  const menuZones = zones.filter((item) => item.id !== "power");
  const power = zones.find((item) => item.id === "power");
  const statusZones = [...zones, water];
  const alerts = statusZones.flatMap((item) =>
    item.rows["7"]
      .filter((row) => row.tone !== "ok")
      .map((row) => ({ ...row, zoneId: item.id })),
  );
  const alertKey = (item: { zoneId: string; name: string }) => `${item.zoneId}-${item.name}`;
  const openAlerts = alerts.filter((item) => !doneAlerts.includes(alertKey(item)));
  const previewAlerts = openAlerts.slice(0, 3);
  const clock = useCairoClock();

  useLayoutEffect(() => {
    const id = hoverId ?? zoneId;
    const button = id
      ? document.querySelector<HTMLButtonElement>(`.hotspot[data-zone="${id}"]`)
      : null;
    const frame = button?.closest(".frame");
    if (!button || !frame) {
      setLineEnd(null);
      return;
    }
    const box = button.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();
    const toX = (value: number) => ((value - frameBox.left) / frameBox.width) * 100;
    const toY = (value: number) => ((value - frameBox.top) / frameBox.height) * 100;
    const left = toX(box.left);
    const right = toX(box.right);
    const top = toY(box.top);
    const bottom = toY(box.bottom);
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const startX = 41;
    const startY = 19;
    const dx = centerX - startX;
    const dy = centerY - startY;
    const hits: { x: number; y: number; t: number }[] = [];
    if (dx !== 0) {
      const leftT = (left - startX) / dx;
      const leftY = startY + leftT * dy;
      if (leftT > 0 && leftT <= 1 && leftY >= top && leftY <= bottom) {
        hits.push({ x: left, y: leftY, t: leftT });
      }
      const rightT = (right - startX) / dx;
      const rightY = startY + rightT * dy;
      if (rightT > 0 && rightT <= 1 && rightY >= top && rightY <= bottom) {
        hits.push({ x: right, y: rightY, t: rightT });
      }
    }
    if (dy !== 0) {
      const topT = (top - startY) / dy;
      const topX = startX + topT * dx;
      if (topT > 0 && topT <= 1 && topX >= left && topX <= right) {
        hits.push({ x: topX, y: top, t: topT });
      }
      const bottomT = (bottom - startY) / dy;
      const bottomX = startX + bottomT * dx;
      if (bottomT > 0 && bottomT <= 1 && bottomX >= left && bottomX <= right) {
        hits.push({ x: bottomX, y: bottom, t: bottomT });
      }
    }
    hits.sort((a, b) => a.t - b.t);
    const end = hits[0] ?? { x: centerX, y: centerY };
    setLineEnd({ x: end.x, y: end.y });
  }, [hoverId, zoneId]);

  useEffect(() => {
    window.localStorage.setItem("airport-theme", light ? "light" : "dark");
  }, [light]);

  useEffect(() => {
    if (zoneId) setAlertsPage(false);
  }, [zoneId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setZoneId(null);
        setAlertsPage(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFastLeft((left) => {
        if (left <= 1) {
          setFastTick((value) => value + 1);
          return 5;
        }
        return left - 1;
      });
      setSecondsLeft((left) => {
        if (left <= 1) {
          setSlowTick((value) => value + 1);
          return 60;
        }
        return left - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={light ? "shell light" : "shell"}>
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-plate">
            <img src="/logos/we.png" alt="WE" />
            <img className="logo-aveva" src="/logos/aveva.png" alt="AVEVA" />
          </div>
          <h1>Smart Airport City</h1>
        </div>
        <nav>
          <button
            type="button"
            className={zoneId === null ? "nav on" : "nav"}
            onClick={() => {
              setZoneId(null);
              setAlertsPage(false);
            }}
          >
            <HomeIcon />
            Overview
          </button>
          {menuZones.map((item) => (
            <button
              key={item.id}
              type="button"
              className={zoneId === item.id ? "nav on" : "nav"}
              onClick={() => setZoneId(item.id)}
            >
              <span className={`nav-dot tone-${item.status}`} />
              <Mark name={zoneIcon[item.id]} />
              {item.title}
            </button>
          ))}
          {power && (
            <div className="util-row">
              <p className="util-label">Utilities</p>
              <div className="util-pair">
                <button
                  type="button"
                  className={zoneId === "power" ? "nav on" : "nav"}
                  onClick={() => setZoneId("power")}
                >
                  <span className={`nav-dot tone-${power.status}`} />
                  <Mark name="bolt" />
                  Power
                </button>
                <button
                  type="button"
                  className={zoneId === "water" ? "nav on" : "nav"}
                  onClick={() => setZoneId("water")}
                >
                  <span className="nav-dot tone-ok" />
                  <Mark name="drop" />
                  Water
                </button>
              </div>
            </div>
          )}
        </nav>
        <p className="sidebar-foot">
          <Mark name="plane" />
          Smarter Airport. A Better Journey.
        </p>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <h2>{zone ? zone.title : "Overview"}</h2>
            <p>
              {zone ? zone.blurb : "Each named box on the picture opens its own numbers."}
            </p>
          </div>
          <div className="topbar-meta">
            <button
              type="button"
              className="theme-switch"
              aria-label={light ? "Dark" : "Light"}
              onClick={() => setLight((on) => !on)}
            >
              <Mark name={light ? "moon" : "sun"} />
            </button>
            <span className="live-pill">Live</span>
            <div className="clock">
              <span className="clock-time">{clock.time}</span>
              <span className="clock-date">
                {clock.date} · Cairo · next update {fastOpen ? fastLeft : secondsLeft}s
              </span>
            </div>
          </div>
        </header>

        <div className={zone ? "workspace split" : "workspace overview"}>
          {!zone && (
            <div className="glance">
              {GLANCE.map((item) => {
                const source = findZone(item.id);
                const kpi = source.kpis[item.kpi];
                const cardTick = FAST_ZONE_IDS.has(item.id) ? fastTick : slowTick;
                const base = kpi.values["7"];
                const value = nudge(base, cardTick, item.kpi);
                const delta = liveDelta(base, value, kpi.deltas["7"]);
                const good = kpi.lowerIsBetter ? delta <= 0 : delta >= 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="glance-card"
                    onClick={() => setZoneId(item.id)}
                  >
                    <span className="glance-top">
                      <i className={`mark-plate plate-${item.icon}`}>
                        <Mark name={item.icon} />
                      </i>
                      {kpi.label}
                    </span>
                    <strong>
                      {formatGlance(value, kpi.suffix)}
                      <small>{kpi.suffix}</small>
                    </strong>
                    <em className={good ? "good" : "bad"}>
                      {delta > 0 ? "Up" : "Down"} {Math.abs(delta)}%
                    </em>
                  </button>
                );
              })}
            </div>
          )}
          {alertsPage && !zone ? (
            <section className="alert-page">
              <header className="alert-head">
                <div className="alert-title">
                  <i className="alert-bell">
                    <Mark name="bell" />
                  </i>
                  <span className="alert-rule" />
                  <div>
                    <h2>Alerts & Notifications</h2>
                    <p>Real-time updates and important events across the airport</p>
                  </div>
                </div>
                <div className="alert-actions">
                  <button type="button" className="alert-back" onClick={() => setAlertsPage(false)}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="mark-all"
                    onClick={() =>
                      setDoneAlerts((current) => {
                        const keys = alerts.map((item) => alertKey(item));
                        const allDone = keys.every((key) => current.includes(key));
                        return allDone
                          ? current.filter((key) => !keys.includes(key))
                          : [...new Set([...current, ...keys])];
                      })
                    }
                  >
                    <Mark name="tick" />
                    Mark all done
                  </button>
                </div>
              </header>
              <ul>
                {alerts.map((item, index) => {
                  const key = alertKey(item);
                  const done = doneAlerts.includes(key);
                  const toneLabel = item.tone === "alert" ? "Critical" : item.tone === "watch" ? "Warning" : "Info";
                  return (
                    <li key={key} className={done ? "done" : ""}>
                      <i className="alert-ico">
                        <Mark name={zoneIcon[item.zoneId]} />
                      </i>
                      <div className="alert-copy">
                        <p>
                          <strong>{item.name}</strong> {item.detail}
                        </p>
                        <small>
                          <Mark name="clock" /> Today, {alertClock(index)}
                        </small>
                      </div>
                      <span className={`alert-pill tone-${item.tone}`}>
                        <Mark name={item.tone === "ok" ? "tick" : "bang"} />
                        {toneLabel}
                      </span>
                      <button
                        type="button"
                        className={done ? "check on" : "check"}
                        onClick={() =>
                          setDoneAlerts((current) =>
                            current.includes(key)
                              ? current.filter((entry) => entry !== key)
                              : [...current, key],
                          )
                        }
                      >
                        <Mark name="tick" />
                        {done ? "Done" : "Mark done"}
                      </button>
                      <button type="button" className="alert-go" onClick={() => setZoneId(item.zoneId)} aria-label={`Open ${item.name}`}>
                        <Mark name="chevron" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
          <div className="picture-wrap">
            <div className="frame">
              <img src="/airport.jpeg" alt="Smart Airport picture. Each named card opens its own numbers." />
              <svg className="links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {lineEnd && (
                  <path
                    className="link on"
                    d={`M 41 19 Q ${(41 + lineEnd.x) / 2} ${Math.min(lineEnd.y, 19) - 2} ${lineEnd.x} ${lineEnd.y}`}
                  />
                )}
              </svg>
              {zones.flatMap((item) =>
                item.spots.map((spot, index) => (
                  <button
                    key={`${item.id}-${index}`}
                    type="button"
                    data-zone={item.id}
                    className={zoneId === item.id ? "hotspot on" : "hotspot"}
                    style={{
                      left: `${spot.left}%`,
                      top: `${spot.top}%`,
                    }}
                    aria-pressed={zoneId === item.id}
                    onClick={() => setZoneId(item.id)}
                    onMouseEnter={() => setHoverId(item.id)}
                    onMouseLeave={() => setHoverId(null)}
                  >
                    {item.title}
                  </button>
                )),
              )}
            </div>
          </div>
          )}

          {!zone && (
            <aside className="rail">
              <section className="rail-card weather">
                <h3>
                  <Mark name="cloud" />
                  Cairo International Airport
                </h3>
                <div className="weather-body">
                  <div className="weather-now">
                    <Mark name="partly" />
                    <div>
                      <p className="weather-temp">28°C</p>
                      <p className="weather-sky">Partly Cloudy</p>
                    </div>
                  </div>
                  <div className="weather-facts">
                    <ul>
                      <li><span>Visibility</span><strong>10 km</strong></li>
                      <li><span>Wind</span><strong>12 km/h NE</strong></li>
                      <li><span>Runway</span><strong>27L / 27R</strong></li>
                    </ul>
                    <p className="weather-ok"><i className="nav-dot tone-ok" /> Normal</p>
                  </div>
                </div>
              </section>
              <section className="rail-card">
                <h3>
                  <i className="mark-plate plate-bell">
                    <Mark name="bell" />
                  </i>
                  Alerts & Notifications
                  <span className="alert-count">{openAlerts.length}</span>
                </h3>
                <ul>
                  {previewAlerts.map((item) => {
                    const key = alertKey(item);
                    return (
                      <li key={key}>
                        <button type="button" onClick={() => setZoneId(item.zoneId)}>
                          <i className="rail-ico">
                            <Mark name={zoneIcon[item.zoneId]} />
                          </i>
                          <span>
                            <strong>{item.name}</strong>
                            <small>{item.detail}</small>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="check"
                          onClick={() => setDoneAlerts((current) => [...current, key])}
                        >
                          Mark done
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {openAlerts.length > 3 && (
                  <button type="button" className="show-all" onClick={() => setAlertsPage(true)}>
                    Show all {openAlerts.length}
                  </button>
                )}
              </section>
              <section className="rail-card status-card">
                <h3>
                  <i className="mark-plate plate-status">
                    <Mark name="status" />
                  </i>
                  System status
                </h3>
                <ul>
                  {statusZones.map((item) => {
                    const statusTick = FAST_ZONE_IDS.has(item.id) ? fastTick : slowTick;
                    const reading = item.kpis[0];
                    const live = nudge(reading.values["7"], statusTick, 4);
                    return (
                      <li key={item.id}>
                        <button type="button" className="status-row" onClick={() => setZoneId(item.id)}>
                          <i className="rail-ico">
                            <Mark name={zoneIcon[item.id]} />
                          </i>
                          <span>
                            <strong>{item.title}</strong>
                            <small>
                              {item.statusLabel} · {formatGlance(live, reading.suffix)}
                              {reading.suffix}
                            </small>
                          </span>
                          <span className={`nav-dot tone-${item.status}`} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="legend">
                  <span><i className="nav-dot tone-ok" /> Normal</span>
                  <span><i className="nav-dot tone-watch" /> Warning</span>
                  <span><i className="nav-dot tone-alert" /> Critical</span>
                </p>
              </section>
            </aside>
          )}
          {zone && (
            <Panel
              zone={zone}
              range={range}
              ranges={ranges}
              reduce={Boolean(reduce)}
              tick={tick}
              onRange={setRange}
              onClose={() => setZoneId(null)}
            />
          )}
        </div>
      </section>
    </div>
  );
}

const GLANCE = [
  { id: "smartgates", kpi: 0, icon: "people" },
  { id: "gates", kpi: 1, icon: "bag" },
  { id: "power", kpi: 0, icon: "bolt" },
  { id: "surveillance", kpi: 1, icon: "shield" },
  { id: "parking", kpi: 1, icon: "park" },
] as const;

const zoneIcon: Record<string, string> = {
  surveillance: "camera",
  datacenter: "server",
  fiveg: "signal",
  gates: "bag",
  airside: "plane",
  buses: "bus",
  lighting: "lamp",
  parking: "park",
  smartgates: "gate",
  power: "bolt",
  water: "drop",
};

function alertClock(index: number) {
  const total = 9 * 60 + 24 - index * 14;
  const hour24 = Math.floor((((total % (12 * 60)) + 12 * 60) % (12 * 60)) / 60) || 12;
  const minute = ((total % 60) + 60) % 60;
  const suffix = total >= 12 * 60 ? "PM" : "AM";
  return `${hour24}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function findZone(id: string): Zone {
  return id === "water" ? water : zones.find((item) => item.id === id)!;
}

function nudge(value: number, tick: number, salt: number) {
  return value * (1 + Math.sin(tick * 1.4 + salt) * 0.04);
}

function liveDelta(base: number, value: number, delta: number) {
  if (!base) return delta;
  const moved = ((value - base) / base) * 100;
  return Math.round((delta + moved) * 10) / 10;
}

function HomeIcon() {
  return <Mark name="home" />;
}

function Mark({ name }: { name: string }) {
  return (
    <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
      {markShape[name]}
    </svg>
  );
}

const markShape: Record<string, ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />,
  people: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M6 19c1.2-3 3.2-4.5 6-4.5s4.8 1.5 6 4.5" />
    </>
  ),
  bag: (
    <>
      <rect x="6" y="7" width="12" height="12" rx="2" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    </>
  ),
  bolt: <path d="M13 3 6 13h5l-1 8 8-12h-5z" />,
  shield: <path d="M12 3 5 6v6c0 4.2 2.8 7.2 7 9 4.2-1.8 7-4.8 7-9V6z" />,
  park: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M10 16V8h3.2a2.4 2.4 0 0 1 0 4.8H10" />
    </>
  ),
  cloud: <path d="M7 17h10a4 4 0 0 0 .4-8 5 5 0 0 0-9.6-1.2A3.5 3.5 0 0 0 7 17z" />,
  partly: (
    <>
      <circle cx="8" cy="8" r="2" fill="#f0c14a" stroke="none" />
      <path stroke="#f0c14a" d="M8 3.4v1.2M8 11.4v1.2M3.4 8h1.2M11.4 8h1.2M4.7 4.7l.8.8M10.5 10.5l.8.8M4.7 11.3l.8-.8M10.5 5.5l.8-.8" />
      <path d="M8 18.2h9a3 3 0 0 0 .3-6 3.8 3.8 0 0 0-7.3-.8A2.6 2.6 0 0 0 8 18.2z" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </>
  ),
  status: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-2h6l2 2h3v10H4z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  server: (
    <>
      <rect x="5" y="4" width="14" height="6" rx="1" />
      <rect x="5" y="14" width="14" height="6" rx="1" />
      <path d="M8 7h.1M8 17h.1" />
    </>
  ),
  signal: <path d="M5 16a9 9 0 0 1 14 0M8 13a5 5 0 0 1 8 0M12 18h.1" />,
  plane: <path d="M3 13 21 5l-6 14-2.5-5.5z" />,
  bus: (
    <>
      <rect x="5" y="4" width="14" height="12" rx="2" />
      <path d="M5 12h14M8 20v-2M16 20v-2" />
    </>
  ),
  lamp: (
    <>
      <path d="M9 20h6M12 20v-4" />
      <path d="M8 10a4 4 0 1 1 8 0c0 2-2 3-2 6H10c0-3-2-4-2-6z" />
    </>
  ),
  gate: (
    <>
      <path d="M5 20V6h14v14" />
      <path d="M9 20V10h6v10" />
    </>
  ),
  drop: <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />,
  tick: <path d="M5 12.5 9.2 17 19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 9v3.5l2 1.5" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  bang: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 8v4M12 15.5h.1" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 4.5v1.8M12 17.7v1.8M4.5 12h1.8M17.7 12h1.8M7 7l1.2 1.2M15.8 15.8 17 17M7 17l1.2-1.2M15.8 8.2 17 7" />
    </>
  ),
  moon: <path d="M15 5.2A6.5 6.5 0 1 0 18.8 14 5.2 5.2 0 0 1 15 5.2z" />,
  eye: (
    <>
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  wind: (
    <>
      <path d="M4 8h10a2 2 0 1 0-2-2" />
      <path d="M4 12h14a2 2 0 1 1-2 2" />
      <path d="M4 16h8a2 2 0 1 0-2 2" />
    </>
  ),
};

function formatGlance(value: number, suffix: string) {
  if (suffix === "%" || suffix === " MWh" || suffix === " m3") {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }
  return Math.round(value).toLocaleString("en-US");
}

function useCairoClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(now);

  return { time, date };
}
