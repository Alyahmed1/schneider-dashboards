import type { Ministry } from "./data";

/** the ministry's symbol: the national eagle for the ministry that has one, otherwise a bright gradient tile with a white icon */
export default function MinistryIcon({ m, size = 40 }: { m: Ministry; size?: number }) {
  const Icon = m.icon;
  return (
    <span className={`m-ico ${m.emblem ? "emblem" : ""}`} style={{ width: size, height: size, ["--accent" as string]: m.accent, ["--accent2" as string]: m.accent2 }}>
      {m.emblem ? <img src={m.emblem} alt="" draggable={false} style={{ height: Math.round(size * 0.78), width: "auto" }} /> : <Icon size={Math.round(size * 0.55)} strokeWidth={2} />}
    </span>
  );
}
