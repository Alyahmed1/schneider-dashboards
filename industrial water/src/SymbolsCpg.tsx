import { Boiler, Etp, Filter, Ro, Tank } from "./Symbols";

/** Factory equipment drawings. Each one is drawn around (0,0) inside a 104 x 116 tile. */
function Soft() {
  return (
    <g>
      <rect className="sv-fill" x={-34} y={-48} width={42} height={92} rx={13} />
      <rect className="sv-water" x={-32} y={-38} width={38} height={18} />
      <rect className="l-resin" x={-32} y={-20} width={38} height={40} />
      <g className="beads">{[[-26, -12], [-16, -4], [-6, -12], [2, -4], [-22, 6], [-10, 8], [-2, 14], [-26, 16]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.800} style={{ animationDelay: `${i * 0.25}s` }} />)}</g>
      <rect className="sv-fill" x={14} y={4} width={32} height={40} rx={4} />
      <rect className="sv-salt" x={16} y={16} width={28} height={26} />
      <text className="sv-txt" x={30} y={-2}>brine</text>
      <path className="sv-ln" d="M8 28 H14" />
    </g>
  );
}

function Uv() {
  return (
    <g>
      <rect className="sv-fill" x={-44} y={-14} width={88} height={52} rx={10} />
      <rect className="sv-water" x={-42} y={-12} width={84} height={48} rx={8} />
      {[-4, 10, 24].map((y, i) => (
        <g key={y}>
          <path className="uv-lamp" d={`M-36 ${y} H36`} style={{ animationDelay: `${i * 0.3}s` }} />
          <path className="sv-ln thin" d={`M-36 ${y} H36`} />
        </g>
      ))}
      <path className="flow-mini" d="M-40 -22 H40" />
      <text className="sv-txt" x={0} y={-30}>UV-C</text>
    </g>
  );
}

function Fill() {
  return (
    <g>
      <rect className="sv-fill" x={-30} y={-40} width={60} height={26} rx={5} />
      {[-18, 0, 18].map((x, i) => (
        <g key={x}>
          <path className="sv-ln" d={`M${x} -14 V0`} />
          <circle className="drip" cx={x} cy={2} r={2} style={{ animationDelay: `${i * 0.3}s` }} />
        </g>
      ))}
      <rect className="sv-fill" x={-52} y={34} width={104} height={9} rx={3} />
      <g className="belt">
        {[-52, -24, 4, 32, 60].map((x) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <rect className="bottle" x={-6} y={8} width={12} height={26} rx={4} />
            <rect className="bottle-cap" x={-3} y={4} width={6} height={5} rx={1} />
            <rect className="bottle-fill" x={-4.500} y={16} width={9} height={16} rx={3} />
          </g>
        ))}
      </g>
    </g>
  );
}

function Cip() {
  return (
    <g>
      {[-24, 24].map((cx, i) => (
        <g key={cx}>
          <rect className="sv-fill" x={cx - 18} y={-6} width={36} height={52} rx={6} />
          <rect className={i === 0 ? "sv-caustic" : "sv-water"} x={cx - 16} y={i === 0 ? 8 : 16} width={32} height={i === 0 ? 36 : 28} />
          <text className="sv-txt" x={cx} y={-12}>{i === 0 ? "caustic" : "rinse"}</text>
        </g>
      ))}
      <path className="cip-loop" d="M-24 -6 V-26 H24 V-6" />
      <path className="sv-ln thick" d="M-6 -32 L6 -20 M-6 -20 L6 -32" />
      <g transform="translate(0 -26)"><g className="spin"><circle r={5} className="sv-fill" /><path className="sv-ln thin" d="M-9 0 H9 M0 -9 V9" /></g></g>
    </g>
  );
}

export function CpgSymbol({ id, level }: { id: string; level: number }) {
  switch (id) {
    case "rawt": return <Tank level={level} raw />;
    case "pre": return <Filter />;
    case "soft": return <Soft />;
    case "ro": return <Ro />;
    case "uv": return <Uv />;
    case "ptank": return <Tank level={level} />;
    case "fill": return <Fill />;
    case "cip": return <Cip />;
    case "util": return <Boiler />;
    default: return <Etp />;
  }
}
