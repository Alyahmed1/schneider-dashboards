import { useId } from "react";

/** the catchment: sewage pumping stations feed the plant on the left, treated water goes to the reuse zones on the right */
export interface Region { id: string; name: string; value: number; warn?: boolean; side: "in" | "out" }

const W = 960, H = 320;
const S = 1.3; // the plant site is drawn at 270 x 176 and enlarged by this
const PW = 270, PH = 176;
const CX = W / 2, MID = H / 2 + 8;
const ys = (n: number) => 58 + n * 72;
const R = 24; // ring radius

/** one ring widget: percentage ring with the zone name beside it (on the outside, away from the plant) */
function Ring({ r, n, x, y, grow, unit }: { r: Region; n: number; x: number; y: number; grow: boolean; unit: string }) {
  const C = 2 * Math.PI * R;
  const left = r.side === "in";
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="hm-zone" style={{ ["--n" as string]: n }}>
        <title>{`${r.name}: ${r.value.toFixed(0)}${unit}`}</title>
        <circle className="hm-region" r={R + 9} />
        <circle className="hm-ring-bg" r={R} />
        <circle className={`hm-ring ${r.warn ? "warn" : ""}`} r={R} strokeDasharray={`${grow ? (C * r.value) / 100 : 0} ${C}`} transform="rotate(-90)" />
        <text className="hm-ring-n" y="5" textAnchor="middle">{r.value.toFixed(0)}%</text>
        <path className={`hm-ring-t ${r.warn ? "warn" : ""}`} d={r.warn ? "M-4 12 L4 12 L0 18Z" : "M-4 18 L4 18 L0 12Z"} />
        <text className="hm-region-n" x={left ? -(R + 16) : R + 16} y="5" textAnchor={left ? "end" : "start"}>{r.name}</text>
      </g>
    </g>
  );
}

export default function CatchmentMap({ regions, unit, grow = true }: { regions: Region[]; unit: string; grow?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const ins = regions.filter((r) => r.side === "in");
  const outs = regions.filter((r) => r.side === "out");
  const lx = 165, rx = W - 165;
  const pl = CX - (PW / 2) * S, pr = CX + (PW / 2) * S; // left and right edge of the plant site
  return (
    <svg className="hm-map" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Catchment map: four sewage pumping stations feed the wastewater treatment plant, which supplies four reuse zones">
      <defs>
        {/* the water in the plant changes colour as it is cleaned: brown, olive, then clear */}
        <linearGradient id={`wg${uid}`} gradientUnits="userSpaceOnUse" x1="6" y1="0" x2={PW - 6} y2="0">
          <stop offset="0" stopColor="var(--pipe-raw)" /><stop offset=".45" stopColor="var(--pipe-sludge)" /><stop offset=".75" stopColor="var(--pipe-clean)" /><stop offset="1" stopColor="var(--pipe-clean)" />
        </linearGradient>
      </defs>

      <text className="hm-map-sea" x={lx} y="14" textAnchor="middle">Pumping stations</text>
      <text className="hm-map-sea" x={CX} y="14" textAnchor="middle">Treatment plant</text>
      <text className="hm-map-sea" x={rx} y="14" textAnchor="middle">Reuse zones</text>

      {/* sewers in, treated water out */}
      {ins.map((_, i) => <path key={`i${i}`} className="hm-pipe raw" d={`M${lx + R + 9} ${ys(i)} C ${pl - 50} ${ys(i)}, ${pl - 50} ${MID}, ${pl} ${MID}`} />)}
      {outs.map((_, i) => <path key={`o${i}`} className="hm-pipe clean" d={`M${pr} ${MID} C ${pr + 50} ${MID}, ${rx - 110} ${ys(i)}, ${rx - R - 9} ${ys(i)}`} />)}

      {/* plant site, seen from above (drawn at its own size, then enlarged around its centre) */}
      <g transform={`translate(${CX} ${MID}) scale(${S}) translate(${-PW / 2} ${-PH / 2})`}>
        <PlantSite gid={`wg${uid}`} />
      </g>

      {ins.map((r, i) => <Ring key={r.id} r={r} n={i} x={lx} y={ys(i)} grow={grow} unit={unit} />)}
      {outs.map((r, i) => <Ring key={r.id} r={r} n={i + 4} x={rx} y={ys(i)} grow={grow} unit={unit} />)}
    </svg>
  );
}

/** the plant units, in a box 270 wide and 176 high */
function PlantSite({ gid }: { gid: string }) {
  const m = PH / 2;
  return (
    <g>
      <rect className="hm-site" x="0" y="0" width={PW} height={PH} />
      <text className="hm-site-n" x="10" y="16">New Cairo WWTP</text>
      <text className="hm-site-s" x={PW - 10} y="16" textAnchor="end">150,000 m³/d</text>
      <path className="hm-pipe site" stroke={`url(#${gid})`} d={`M0 ${m} H${PW}`} />
      <rect className="hm-unit" x="10" y={m - 15} width="20" height="30" />
      <rect className="hm-unit" x="40" y={m - 11} width="18" height="22" />
      <circle className="hm-unit" cx="84" cy={m} r="16" />
      <path className="hm-scraper" d={`M84 ${m} h16`} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect className="hm-unit" x="112" y={m - 37 + i * 26} width="70" height="22" />
          {[0, 1, 2, 3, 4, 5].map((b) => <circle key={b} className="hm-bub" cx={124 + b * 11} cy={m - 26 + i * 26} r="1.7" style={{ ["--d" as string]: `${(b * 0.37 + i * 0.5).toFixed(2)}s` }} />)}
        </g>
      ))}
      <circle className="hm-unit" cx="214" cy={m} r="18" />
      <path className="hm-scraper slow" d={`M214 ${m} h18`} />
      <rect className="hm-unit uv" x="242" y={m - 8} width="18" height="16" />
      <path className="hm-pipe sludge" d={`M84 ${m + 16} V${m + 50} H120 M214 ${m + 18} V${m + 50} H120`} />
      <ellipse className="hm-unit dig" cx="122" cy={m + 60} rx="11" ry="14" />
      <ellipse className="hm-unit dig" cx="148" cy={m + 60} rx="11" ry="14" />
      <path className="hm-pipe gas" d={`M159 ${m + 60} H188`} />
      <rect className="hm-unit chp" x="188" y={m + 50} width="26" height="20" />
      <text className="hm-site-s" x="226" y={m + 64}>CHP</text>
    </g>
  );
}
