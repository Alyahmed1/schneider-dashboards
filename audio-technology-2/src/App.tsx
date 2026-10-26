import { useEffect, useState, type ReactElement } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, Photo, clock, dateLabel, useTick } from "./ui";
import { AccessScreen, CranesScreen, FiveGScreen, OverviewScreen, SurveillanceScreen, type ScreenProps } from "./screens";
import { AlertsScreen } from "./alerts";
import { DetailsScreen, detailOwner, type DetailKind } from "./details";
import { HardwareScreen, MonitoringScreen, PowerScreen, VehiclesScreen, WarehouseScreen, WaterScreen } from "./screens2";

type Tab = { id: string; label: string; icon: string; screen: (p: ScreenProps) => ReactElement };

const tabs: Tab[] = [
  { id: "overview", label: "Overview", icon: "home", screen: OverviewScreen },
  { id: "surveillance", label: "Surveillance", icon: "camera", screen: SurveillanceScreen },
  { id: "access", label: "Access Control", icon: "shieldcheck", screen: AccessScreen },
  { id: "fiveg", label: "Private 5G", icon: "signal", screen: FiveGScreen },
  { id: "cranes", label: "Cranes", icon: "crane", screen: CranesScreen },
  { id: "monitoring", label: "Monitoring Center", icon: "monitor", screen: MonitoringScreen },
  { id: "vehicles", label: "Vehicles", icon: "truck", screen: VehiclesScreen },
  { id: "warehouse", label: "Warehouse", icon: "warehouse", screen: WarehouseScreen },
  { id: "hardware", label: "Hardware Failure", icon: "gear", screen: HardwareScreen },
  { id: "power", label: "Power", icon: "bolt", screen: PowerScreen },
  { id: "water", label: "Water", icon: "drop", screen: WaterScreen },
];

const utilities = new Set(["power", "water"]);

/** The sidebar tab a sub-page (alerts or details) belongs to, so it stays highlighted. */
function owner(tab: string) {
  if (tab.startsWith("alerts:")) return tab.slice(7);
  if (tab.startsWith("details:")) return detailOwner[tab.slice(8) as DetailKind];
  return tab;
}

/* Overview and Surveillance use the "banner" header (images 2 and 3); every other tab uses the top-bar layout (images 4-6). */
const bannerTabs = new Set(["overview", "surveillance"]);

/* Monitoring Center and Vehicles use a third layout (images 9 and 10): brand block in the sidebar, title + status strip in the header. */
const statusTabs: Record<string, { title: string; sub: string; icon?: string }> = {
  monitoring: { title: "Monitoring Center", sub: "Unified Port Operations & Intelligence" },
  vehicles: { title: "Vehicles", sub: "Fleet Operations & Transport Monitoring", icon: "truck" },
};

const bannerTitle: Record<string, { sub: string; tag?: string }> = {
  overview: { sub: "IoT Operations Overview" },
  surveillance: { sub: "Surveillance", tag: "Real-time monitoring  |  Safer operations  |  Smarter decisions" },
};

/* ───────── Home: clickable infographic ───────── */

const W = 1280;
const H = 853;

type Hot = { id: string; label: string; l: number; t: number; w: number; h: number };

const hotspots: Hot[] = [
  { id: "surveillance", label: "Surveillance", l: 1.6, t: 16.2, w: 18.9, h: 19.6 },
  { id: "access", label: "Access Control", l: 23.1, t: 16.6, w: 20.2, h: 18.1 },
  { id: "cranes", label: "Crane Management", l: 55.7, t: 15.8, w: 19.3, h: 18.4 },
  { id: "monitoring", label: "Centralized Monitoring Center", l: 77, t: 15.2, w: 22.6, h: 22.9 },
  { id: "power", label: "Power Management", l: 84.8, t: 39.3, w: 14.8, h: 17.9 },
  { id: "vehicles", label: "Smart Vehicle Solutions", l: 2.6, t: 59.2, w: 20.2, h: 21.5 },
  { id: "warehouse", label: "Warehouse Management", l: 28.4, t: 63.9, w: 21.3, h: 20.9 },
  { id: "hardware", label: "Hardware Failure Prediction", l: 52.7, t: 66.8, w: 23, h: 18.8 },
  { id: "fiveg", label: "Private 5G", l: 44.5, t: 19, w: 7.6, h: 16 },
];

const hub = { x: 612, y: 215 };

function linePath(h: Hot) {
  const x = ((h.l + h.w / 2) / 100) * W;
  const y = ((h.t + h.h / 2) / 100) * H;
  const mx = (hub.x + x) / 2;
  const my = Math.min(hub.y, y) - 30 + Math.abs(y - hub.y) * 0.25;
  return `M${hub.x},${hub.y} Q${mx},${my} ${x},${y}`;
}

function HomeScreen({ go }: { go: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const [launch, setLaunch] = useState<string | null>(null);

  const open = (id: string) => {
    if (launch) return;
    setLaunch(id);
    window.setTimeout(() => go(id), 650);
  };

  return (
    <div className="home">
      <Photo src="/home.jpg" ratio={W / H} mode="contain" className="home-stage">
        <svg className="home-lines" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {hotspots.map((h) => {
            const d = linePath(h);
            const hot = hover === h.id || launch === h.id;
            return (
              <g key={h.id}>
                <path d={d} className={`flow ${hot ? "hot" : ""}`} fill="none" />
                {launch === h.id ? (
                  <motion.path d={d} className="launch" fill="none" filter="url(#glow)" initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: "easeIn" }} />
                ) : null}
              </g>
            );
          })}
          <circle cx={hub.x} cy={hub.y} r="6" className="hub" />
          <circle cx={hub.x} cy={hub.y} r="6" className="hub-ping" />
        </svg>
        {hotspots.map((h) => (
          <button
            type="button"
            key={h.id}
            className={`hot-box ${hover === h.id ? "on" : ""} ${launch === h.id ? "go" : ""}`}
            style={{ left: `${h.l}%`, top: `${h.t}%`, width: `${h.w}%`, height: `${h.h}%` }}
            onMouseEnter={() => setHover(h.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(h.id)}
            onBlur={() => setHover(null)}
            onClick={() => open(h.id)}
            aria-label={`Open ${h.label}`}
          >
            <span>{h.label} <Icon name="arrowright" size={13} /></span>
          </button>
        ))}
      </Photo>
    </div>
  );
}

/* ───────── Shell ───────── */

export default function App() {
  const [tab, setTab] = useState("home");
  const [now, setNow] = useState(() => new Date());
  const tick = useTick(3500);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const current = tabs.find((t) => t.id === tab);
  const status = statusTabs[tab];
  const banner = bannerTabs.has(tab);
  const variant = status ? "vc" : banner ? "va" : "vb";
  const Screen = current?.screen;
  const title = bannerTitle[tab];

  const time12 = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(now);

  return (
    <div className={`app ${variant}`}>
      {variant === "vb" ? (
        <header className="topbar">
          <button type="button" className="brand" onClick={() => setTab("home")} title="Back to port map">
            <svg viewBox="0 0 64 40" aria-hidden className="brand-mark">
              <path d="M2 36h60M10 36l-4-8h52l-4 8M16 28V14h8v14M28 28V8h4v20M36 28V16h10v12M18 14l-4-6M40 8l8-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Smart Port<b>IoT Solutions</b></span>
          </button>
          <div className="taglines">
            <span>Connected Infrastructure</span>
            <span>Intelligent Operations</span>
            <span>A Safer &amp; Greener Port</span>
          </div>
          <div className="top-right">
            <span className="online"><i /> System Online</span>
            <time>{dateLabel(now)}&nbsp;&nbsp;{clock(now)}</time>
          </div>
        </header>
      ) : null}

      <aside className="side">
        <div className="side-logos">
          <img className="logo-audio" src="/logos/audio.png" alt="Audio Technology" />
        </div>
        {variant !== "vb" ? (
          <button type="button" className="logo-plate" onClick={() => setTab("home")} title="Back to port map">
            <svg viewBox="0 0 64 40" aria-hidden className="brand-mark">
              <path d="M2 36h60M10 36l-4-8h52l-4 8M16 28V14h8v14M28 28V8h4v20M36 28V16h10v12M18 14l-4-6M40 8l8-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {variant === "vc" ? (
              <span>SMART PORT<small>CONNECTED · EFFICIENT · SUSTAINABLE</small></span>
            ) : null}
          </button>
        ) : null}
        <nav className="nav">
          {tabs
            .filter((t) => !utilities.has(t.id))
            .map((t) => (
              <button key={t.id} type="button" className={owner(tab) === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
                {owner(tab) === t.id ? <motion.span layoutId="nav-glow" className="nav-glow" transition={{ type: "spring", stiffness: 420, damping: 36 }} /> : null}
                <Icon name={t.icon} size={20} />
                <span>{t.label}</span>
              </button>
            ))}
          <p className="util">Utilities</p>
          <div className="util-row">
            {tabs
              .filter((t) => utilities.has(t.id))
              .map((t) => (
                <button key={t.id} type="button" className={owner(tab) === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
                  <Icon name={t.icon} size={20} />
                  <span>{t.label}</span>
                </button>
              ))}
          </div>
        </nav>
      </aside>

      <main className="main">
        <motion.div key={`sweep-${tab}`} className="sweep" initial={{ x: "-110%" }} animate={{ x: "110%" }} transition={{ duration: 0.8, ease: "easeInOut" }} />
        {status ? (
          <header className="vhead">
            <div className="vhead-title">
              {status.icon ? <Icon name={status.icon} size={44} /> : null}
              <div>
                <h1>{status.title}</h1>
                <p>{status.sub}</p>
              </div>
            </div>
            <div className="vhead-chips">
              <span className="ok"><Icon name="ship" size={26} /><em><i /> Port Online<small>All systems operational</small></em></span>
              <span><Icon name="wifi" size={26} /><em>5G Connected<small>Low latency network</small></em></span>
              <span><Icon name="cloud" size={26} /><em>Cloud Healthy<small>Services normal</small></em></span>
              <span><Icon name="shield" size={26} /><em>Security Normal<small>No active threats</small></em></span>
              <span className="when"><em>{dateLabel(now)}<b>{time12}</b><small>(UTC+3)</small></em></span>
            </div>
          </header>
        ) : null}
        {banner && title ? (
          <header className="banner">
            <div>
              <h1>Smart Port <b>{title.sub}</b></h1>
              {title.tag ? <p>{title.tag}</p> : null}
            </div>
            <div className="banner-chips">
              <span><Icon name="calendar" size={18} /><em>{dateLabel(now)}<small>{time12} (UTC+3)</small></em></span>
              <span className="ok"><i /> <em>Port Online<small>All systems operational</small></em></span>
              <span><Icon name="signal" size={18} /><em>5G<small>Connected</small></em></span>
              <span><Icon name="cloud" size={18} /><em>Cloud<small>Healthy</small></em></span>
              <span><Icon name="shield" size={18} /><em>Security<small>Normal</small></em></span>
            </div>
          </header>
        ) : null}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            className="slot"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {Screen ? <Screen tick={tick} now={now} go={setTab} /> : tab.startsWith("alerts:") ? <AlertsScreen tick={tick} now={now} go={setTab} module={tab.slice(7)} /> : tab.startsWith("details:") ? <DetailsScreen tick={tick} now={now} go={setTab} kind={tab.slice(8) as DetailKind} /> : <HomeScreen go={setTab} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
