import { Clarifier, Etp } from "./Symbols";

/** Mine equipment drawings. Each one is drawn around (0,0) inside a 104 x 116 tile. */
const pts = (a: number[][]) => a.map(([x, y]) => `${x} ${y}`).join(" L");

function Pit() {
  return (
    <g>
      <path className="sv-fill" d={`M${pts([[-52, -40], [-38, -40], [-38, -26], [-26, -26], [-26, -12], [-14, -12], [-14, 2], [-4, 2], [-4, 16], [22, 16], [22, 2], [32, 2], [32, -12], [42, -12], [42, -26], [52, -26], [52, 58], [-52, 58]])} Z`} />
      <rect className="sv-water" x={-3} y={16} width={24} height={7} />
      <g className="wave"><path className="sv-ln" d="M-20 16 q4 -3 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0" /></g>
      <path className="sv-ln" d="M4 23 V30 H16" />
      <circle className="sv-fill" cx={28} cy={30} r={12} />
      <g transform="translate(28 30)"><g className="spin"><path className="sv-ln thin" d="M0 -8 V8 M-7 -4 L7 4 M-7 4 L7 -4" /></g></g>
      <path className="sv-ln thin" d="M-52 -40 H-38 M-38 -26 H-26 M-26 -12 H-14" />
      <g className="truck"><rect className="sv-fill" x={-34} y={-40} width={14} height={8} rx={2} /><circle className="sv-fill" cx={-31} cy={-31} r={2.500} /><circle className="sv-fill" cx={-23} cy={-31} r={2.500} /></g>
    </g>
  );
}

function Mill() {
  return (
    <g>
      <circle className="sv-fill" cx={-4} cy={6} r={34} />
      <circle className="sv-slurry" cx={-4} cy={6} r={27} />
      <g transform="translate(-4 6)"><g className="spin slow"><circle r={30} className="gear" /></g></g>
      <g className="balls">{[[-12, 14], [-2, 18], [8, 12], [-18, 6], [2, 8], [-8, 22]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4} style={{ animationDelay: `${i * 0.2}s` }} />)}</g>
      <path className="sv-ln thick" d="M-4 -34 V-46 M-12 -42 L-4 -34 L4 -42" />
      <rect className="sv-fill" x={32} y={20} width={16} height={20} rx={3} />
      <path className="sv-ln" d="M30 30 H32" />
    </g>
  );
}

function Flot() {
  return (
    <g>
      {[-23, 23].map((cx, i) => (
        <g key={cx}>
          <path className="sv-fill" d={`M${cx - 19} -12 H${cx + 19} V38 H${cx - 19} Z`} />
          <rect className="sv-slurry" x={cx - 17} y={4} width={34} height={32} />
          <path className="sv-ln" d={`M${cx} -30 V24`} />
          <g transform={`translate(${cx} 26)`}><g className="spin"><path className="sv-ln" d="M-9 0 H9" /></g></g>
          <g className="froth">{[-10, -2, 7, 13].map((x, j) => <circle key={x} cx={cx + x} cy={2} r={3.500} style={{ animationDelay: `${(i * 4 + j) * 0.3}s` }} />)}</g>
          <path className="sv-ln thin" d={`M${cx - 19} -12 H${cx - 25}`} />
        </g>
      ))}
      <path className="conc-line" d="M-46 -12 H-60 M46 -12 H56" />
    </g>
  );
}

function Thickener() {
  return (
    <g>
      <Clarifier />
      <path className="sv-slurry" d="M-30 8 H30 L8 38 H-8 Z" />
    </g>
  );
}

function Tail() {
  return (
    <g>
      <rect className="sv-water" x={-34} y={2} width={86} height={40} />
      <g className="wave"><path className="sv-ln" d="M-52 2 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0" /></g>
      <rect className="sv-slurry" x={-12} y={32} width={64} height={10} />
      <path className="sv-fill" d={`M${pts([[-52, -10], [-34, -10], [-8, 42], [-8, 58], [-52, 58]])} Z`} />
      <rect className="sv-fill" x={-52} y={42} width={104} height={16} />
      <path className="sv-ln dashed" d="M-34 -10 H52" />
      <path className="sv-ln" d="M40 -9 V1 M37 -5 L40 -9 L43 -5 M37 -3 L40 1 L43 -3" />
      <text className="sv-txt" x={26} y={-14}>freeboard</text>
      <g className="drops slow">{[-30, -26].map((x, i) => <circle key={x} cx={x + 4} cy={48} r={1.800} style={{ animationDelay: `${i * 0.8}s` }} />)}</g>
    </g>
  );
}

function Pond() {
  return (
    <g>
      <rect className="sv-water" x={-52} y={8} width={104} height={50} />
      <g className="wave"><path className="sv-ln" d="M-70 8 q9 -6 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0" /></g>
      <rect className="sv-fill" x={-26} y={-10} width={46} height={18} rx={3} />
      <rect className="sv-fill" x={-14} y={-26} width={16} height={16} rx={2} />
      <circle className="sv-fill" cx={30} cy={-1} r={9} />
      <g transform="translate(30 -1)"><g className="spin"><path className="sv-ln thin" d="M0 -6 V6 M-5 -3 L5 3 M-5 3 L5 -3" /></g></g>
      <path className="sv-ln" d="M39 -1 H46 V-30" />
      <g className="ripple"><ellipse cx={-4} cy={26} rx={10} ry={3} /><ellipse cx={26} cy={40} rx={10} ry={3} style={{ animationDelay: "1s" }} /></g>
    </g>
  );
}

function Dust() {
  return (
    <g>
      <path className="road" d="M-52 44 H52" />
      <g className="bob">
        <rect className="sv-fill" x={-42} y={2} width={18} height={30} rx={3} />
        <rect className="sv-water" x={-38} y={6} width={10} height={9} />
        <rect className="sv-fill" x={-22} y={6} width={50} height={24} rx={12} />
        <rect className="sv-water" x={-18} y={10} width={42} height={16} rx={8} />
        {[-32, -4, 18].map((x) => (
          <g key={x} transform={`translate(${x} 36)`}><circle className="sv-fill" r={7} /><g className="spin"><path className="sv-ln thin" d="M-5 0 H5 M0 -5 V5" /></g></g>
        ))}
      </g>
      <g className="spray">{[0, 1, 2, 3].map((i) => <circle key={i} cx={34 + i * 3} cy={26} r={2} style={{ animationDelay: `${i * 0.25}s` }} />)}</g>
    </g>
  );
}

function Crush() {
  return (
    <g>
      <path className="sv-fill" d="M-38 -38 H38 L16 8 H-16 Z" />
      <g className="jaw"><path className="sv-fill" d="M-12 -18 L12 -18 L8 8 L-8 8 Z" /></g>
      <g className="drops">{[-8, 0, 8].map((x, i) => <circle key={x} cx={x} cy={12} r={2.600} style={{ animationDelay: `${i * 0.35}s` }} />)}</g>
      <rect className="sv-fill" x={-46} y={36} width={92} height={9} rx={4} />
      <path className="flow-mini" d="M-40 40.500 H40" />
      <g className="spray">{[0, 1, 2].map((i) => <circle key={i} cx={-30 + i * 3} cy={-30} r={1.800} style={{ animationDelay: `${i * 0.3}s` }} />)}</g>
    </g>
  );
}

function Svc() {
  return (
    <g>
      <circle className="sv-fill" cx={-8} cy={14} r={22} />
      <g transform="translate(-8 14)"><g className="spin"><path className="sv-ln" d="M0 -14 V14 M-12 -7 L12 7 M-12 7 L12 -7" /></g></g>
      <rect className="sv-fill" x={14} y={4} width={26} height={20} rx={4} />
      <circle className="sv-fill" cx={-28} cy={-24} r={11} />
      <g transform="translate(-28 -24)"><g className="needle"><path className="sv-ln" d="M0 0 L7 -4" /></g></g>
      <path className="sv-ln" d="M-28 -13 V-8 H-8 V-8" />
      <path className="sv-ln" d="M10 -30 l6 -6 l6 6 l6 -6 l6 6 l6 -6" />
    </g>
  );
}

function Wtp() {
  return (
    <g>
      <rect className="sv-fill" x={-46} y={-14} width={34} height={52} rx={4} />
      <rect className="sv-water" x={-44} y={-4} width={30} height={40} />
      <g transform="translate(-29 -30)"><rect className="sv-fill" x={-8} y={-8} width={16} height={14} rx={2} /></g>
      <path className="sv-ln" d="M-29 -24 V20" />
      <g transform="translate(-29 22)"><g className="spin"><path className="sv-ln" d="M-10 0 H10" /></g></g>
      <path className="sv-ln" d="M-12 6 H0" />
      <path className="sv-fill" d="M0 -14 H46 V10 L20 38 H0 Z" />
      <path className="sv-water" d="M2 -4 H44 V10 L20 36 H2 Z" />
      {[-4, 8, 20].map((x) => <path key={x} className="sv-ln thin" d={`M${x} 0 L${x + 14} 26`} />)}
      <g className="bubbles">{[-36, -28, -22].map((x, i) => <circle key={x} cx={x} cy={30} r={2.400} style={{ animationDelay: `${i * 0.5}s` }} />)}</g>
    </g>
  );
}

export function MmmSymbol({ id }: { id: string }) {
  switch (id) {
    case "pit": return <Pit />;
    case "mill": return <Mill />;
    case "flot": return <Flot />;
    case "thick": return <Thickener />;
    case "tail": return <Tail />;
    case "pond": return <Pond />;
    case "dust": return <Dust />;
    case "crush": return <Crush />;
    case "svc": return <Svc />;
    case "wtp": return <Wtp />;
    default: return <Etp />;
  }
}
