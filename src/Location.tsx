import { useState } from "react";
import { Panel, useGrow } from "./ui";

type Cat = "shop" | "edu" | "park" | "club";
/** landmarks of slide 6, placed where the brief draws them around the site (dx, dy from the centre, in map units) */
const LANDMARKS: { name: string; cat: Cat; dx: number; dy: number }[] = [
  { name: "Americana Plaza", cat: "shop", dx: 17, dy: -221 }, { name: "Arkan Plaza", cat: "shop", dx: -215, dy: -115 }, { name: "Zed Park", cat: "park", dx: 208, dy: -146 },
  { name: "El Ahly Club", cat: "club", dx: -215, dy: 6 }, { name: "Hyper One", cat: "shop", dx: 204, dy: 11 }, { name: "Nile University", cat: "edu", dx: -173, dy: 127 },
  { name: "Cairo University (Zayed branch)", cat: "edu", dx: 113, dy: 180 }, { name: "Schools", cat: "edu", dx: 280, dy: 137 }, { name: "Mall of Arabia", cat: "shop", dx: -210, dy: 243 },
  { name: "Park St. West", cat: "shop", dx: -34, dy: 242 },
];
const CAT: Record<Cat, string> = { shop: "Shopping", edu: "Education", park: "Park", club: "Club" };
/** slide 7, key distances by car */
const DRIVE: { name: string; min: number; mark?: string }[] = [
  { name: "Sphinx International Airport", min: 8 }, { name: "Al Dabaa Corridor", min: 2 }, { name: "Arkan Plaza", min: 12, mark: "Arkan Plaza" },
  { name: "Mall of Arabia", min: 15, mark: "Mall of Arabia" }, { name: "Sheikh Zayed", min: 15 }, { name: "6th of October City", min: 20 },
];
const POTENTIALS = [
  "Prime location in the heart of New Zayed", "Near access to Al Dabaa Corridor", "Minutes away from Sphinx International Airport", "Surrounded by premium residential developments",
  "Excellent connectivity to Sheikh Zayed and 6th of October City", "Located within New Zayed's emerging urban expansion", "High investment potential",
  "Near the Grand Egyptian Museum, Giza Pyramids and Sphinx International Airport", "Strategically located near Jirian", "Adjacent to the High-Speed Rail network",
];

const CX = 400, CY = 360;
const RINGS = [{ r: 110, label: "5 KM" }, { r: 220, label: "10 KM" }, { r: 330, label: "15 KM" }];

/** the location slides of the brief: landmarks in 5, 10 and 15 km rings, and the drive times */
export default function Location() {
  const grow = useGrow(250);
  const [pick, setPick] = useState<string | null>(null);
  return (
    <div className="loc-grid">
      <Panel title="Prime location in New Zayed" i={0} aside={<span className="loc-tag">Central. Connected. Convenient.</span>}>
        <svg className="loc-map" viewBox="0 0 800 740" role="img" aria-label="Landmarks around Telal West within 5, 10 and 15 kilometres">
          {RINGS.map((rg, i) => (
            <g key={rg.label}>
              <circle className="loc-ring" cx={CX} cy={CY} r={grow ? rg.r : 0} style={{ transitionDelay: `${i * 160}ms` }} />
              <text className="loc-ring-t" x={CX - 0.37 * rg.r} y={CY - 0.93 * rg.r} textAnchor="middle">{rg.label}</text>
            </g>
          ))}
          {LANDMARKS.map((l, i) => {
            const on = pick === l.name;
            return (
              <g key={l.name} className={`lm ${l.cat} ${on ? "on" : ""} ${pick && !on ? "off" : ""}`} transform={`translate(${CX + l.dx} ${CY + l.dy})`} style={{ ["--n" as string]: i }} tabIndex={0} role="button" aria-label={`${l.name}, ${CAT[l.cat]}`}
                onMouseEnter={() => setPick(l.name)} onMouseLeave={() => setPick(null)} onFocus={() => setPick(l.name)} onBlur={() => setPick(null)}>
                {on && <line x1="0" y1="0" x2={-l.dx} y2={-l.dy} className="lm-line" />}
                <circle r="15" /><circle r="5" className="dot" />
                <text y="30" textAnchor="middle">{l.name}</text>
              </g>
            );
          })}
          <g className="loc-site" transform={`translate(${CX} ${CY})`}>
            <circle r="26" className="pulse" /><circle r="16" />
            <path d="M0 -8 C4 -8 7 -5 7 -1 C7 4 0 11 0 11 C0 11 -7 4 -7 -1 C-7 -5 -4 -8 0 -8Z" /><circle r="2.5" cy="-1" className="hole" />
            <text y="46" textAnchor="middle">TELAL WEST</text>
          </g>
        </svg>
        <p className="map-note">Landmarks are placed where the brief draws them; the brief prints the 5, 10 and 15 km rings and the drive times, not each landmark's distance.</p>
      </Panel>

      <div className="side">
        <Panel title="Key distances by car" i={1}>
          <ul className="drive">
            {DRIVE.map((d, i) => (
              <li key={d.name} className={d.mark && pick === d.mark ? "on" : ""} onMouseEnter={() => d.mark && setPick(d.mark)} onMouseLeave={() => d.mark && setPick(null)}>
                <span>{d.name}</span>
                <span className="dbar"><em style={{ width: grow ? `${(d.min / 20) * 100}%` : 0, transitionDelay: `${300 + i * 90}ms` }} /></span>
                <b>{d.min} min</b>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Location potentials" className="grow" i={2}>
          <ol className="potentials">{POTENTIALS.map((p) => <li key={p}>{p}</li>)}</ol>
        </Panel>
      </div>
    </div>
  );
}
