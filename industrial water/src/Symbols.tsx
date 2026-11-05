

/** Equipment drawings. Each one is drawn around (0,0) inside a 104 x 116 tile and clipped to it. */
const bars = (n: number, x0: number, step: number) => Array.from({ length: n }, (_, i) => x0 + i * step);

export function Intake() {
  return (
    <g>
      <rect className="sv-raw" x={-52} y={40} width={104} height={20} />
      <g className="wave"><path className="sv-ln" d="M-70 42 q9 -7 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0" /></g>
      <rect className="sv-fill" x={-46} y={6} width={26} height={42} rx={3} />
      {bars(4, -41, 6).map((x) => <path key={x} className="sv-ln" d={`M${x} 10 V44`} />)}
      <path className="sv-ln" d="M-20 30 H9" />
      <circle className="sv-fill" cx={26} cy={30} r={17} />
      <g transform="translate(26 30)"><g className="spin"><path className="sv-ln" d="M0 -11 V11 M-10 -5.500 L10 5.500 M-10 5.500 L10 -5.500" /></g></g>
      <path className="sv-ln" d="M-30 -30 q8 -8 16 0 t16 0 t16 0" />
    </g>
  );
}

export function Clarifier() {
  return (
    <g>
      <path className="sv-fill" d="M-38 -34 H38 V12 L9 42 H-9 L-38 12 Z" />
      <path className="sv-water" d="M-36 -24 H36 V12 L8 40 H-8 L-36 12 Z" />
      <g className="wave"><path className="sv-ln" d="M-54 -24 q6 -5 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0" /></g>
      <rect className="sv-fill" x={-3} y={-44} width={6} height={52} />
      <path className="sv-ln" d="M-40 -38 H40" />
      <g transform="translate(0 14)"><g className="sweep"><path className="sv-ln thick" d="M0 0 H32" /></g></g>
      <g className="sludge"><circle cx={-4} cy={34} r={2} /><circle cx={3} cy={36} r={2} /><circle cx={0} cy={30} r={1.600} /></g>
    </g>
  );
}

export function Filter() {
  return (
    <g>
      <rect className="sv-fill" x={-24} y={-48} width={48} height={92} rx={14} />
      <rect className="sv-water" x={-22} y={-38} width={44} height={20} />
      <rect className="l-coal" x={-22} y={-18} width={44} height={12} />
      <rect className="l-sand" x={-22} y={-6} width={44} height={20} />
      <rect className="l-gravel" x={-22} y={14} width={44} height={16} />
      <path className="sv-ln" d="M-22 30 H22" />
      <g className="drops">{[-12, 0, 12].map((x, i) => <circle key={x} cx={x} cy={-34} r={2} style={{ animationDelay: `${i * 0.5}s` }} />)}</g>
    </g>
  );
}

export function Uf() {
  return (
    <g>
      <rect className="sv-fill" x={-24} y={-48} width={48} height={92} rx={9} />
      {bars(8, -17, 4.800).map((x, i) => <path key={x} className="fibre" d={`M${x} -38 V34`} style={{ animationDelay: `${i * 0.18}s` }} />)}
      <path className="sv-ln" d="M-24 -30 H24 M-24 26 H24" />
    </g>
  );
}

export function Ro() {
  return (
    <g>
      <path className="sv-ln" d="M-44 -30 V30" />
      {[-34, -12, 10].map((y, i) => (
        <g key={y}>
          <rect className="sv-fill" x={-38} y={y} width={78} height={18} rx={9} />
          {[-22, -10, 2, 14, 26].map((x) => <path key={x} className="sv-ln thin" d={`M${x} ${y + 4} V${y + 14}`} />)}
          <path className="flow-mini" d={`M-30 ${y + 9} H32`} style={{ animationDelay: `${i * 0.25}s` }} />
        </g>
      ))}
      <path className="sv-ln" d="M-44 -25 H-38 M-44 -3 H-38 M-44 19 H-38" />
      <circle className="sv-fill" cx={-24} cy={42} r={11} />
      <g transform="translate(-24 42)"><g className="spin"><path className="sv-ln thin" d="M0 -7 V7 M-6 -3.500 L6 3.500 M-6 3.500 L6 -3.500" /></g></g>
      <text className="sv-txt" x={12} y={46}>HP pump</text>
    </g>
  );
}

export function Tank({ level, raw = false }: { level: number; raw?: boolean }) {
  const top = 40 - (80 * level) / 100;
  return (
    <g>
      <clipPath id="tankclip"><rect x={-30} y={-42} width={60} height={84} rx={6} /></clipPath>
      <rect className="sv-fill" x={-32} y={-44} width={64} height={88} rx={8} />
      <g clipPath="url(#tankclip)">
        <rect className={raw ? "sv-raw" : "sv-water"} x={-32} y={top} width={64} height={90} />
        <g className="wave"><path className="sv-ln" d={`M-50 ${top} q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0`} /></g>
      </g>
      <text className="sv-big" y={6}>{Math.round(level)}%</text>
    </g>
  );
}

export function Cooling() {
  return (
    <g>
      <path className="sv-fill" d="M-26 -14 C-19 8 -19 24 -36 44 H36 C19 24 19 8 26 -14 Z" />
      <ellipse className="sv-fill" cx={0} cy={-14} rx={26} ry={5} />
      <g transform="translate(0 -14)"><g className="spin slow"><path className="sv-ln thick" d="M-20 0 H20 M0 -3.500 V3.500" /></g></g>
      <path className="sv-water" d="M-32 36 H32 L36 44 H-36 Z" />
      <g className="steam">{[-12, 0, 12].map((x, i) => <circle key={x} cx={x} cy={-24} r={5} style={{ animationDelay: `${i * 0.9}s` }} />)}</g>
    </g>
  );
}

export function Boiler() {
  return (
    <g>
      <rect className="sv-fill" x={-40} y={-2} width={80} height={36} rx={16} />
      <rect className="sv-fill" x={-9} y={-16} width={18} height={14} rx={3} />
      <path className="sv-ln" d="M0 -16 V-30 M-5 -24 L0 -30 L5 -24" />
      <path className="sv-water" d="M-36 18 H36 V20 a14 14 0 0 1 -14 12 H-22 a14 14 0 0 1 -14 -12 Z" />
      <g className="flame"><path d="M-14 50 C-22 42 -12 36 -14 30 C-6 34 -4 42 -9 50 Z M6 50 C-2 42 8 36 6 30 C14 34 16 42 11 50 Z" /></g>
      <g className="steam sm">{[-3, 3].map((x, i) => <circle key={x} cx={x} cy={-32} r={3.500} style={{ animationDelay: `${i * 0.8}s` }} />)}</g>
    </g>
  );
}

export function Process() {
  return (
    <g>
      <rect className="sv-fill" x={-38} y={-6} width={76} height={44} />
      <path className="sv-fill" d="M-38 -6 L-38 -24 L-18 -10 L-18 -24 L2 -10 L2 -24 L22 -10 V-6 Z" />
      <rect className="sv-fill" x={24} y={-40} width={12} height={34} />
      <g className="steam sm">{[30].map((x) => <circle key={x} cx={x} cy={-44} r={4} />)}</g>
      <g transform="translate(-14 19)"><g className="spin slow"><circle r={9} className="gear" /><circle r={3} className="sv-ln" /></g></g>
      <g transform="translate(10 22)"><g className="spin slow rev"><circle r={6} className="gear" /></g></g>
      <rect className="win" x={20} y={8} width={12} height={8} />
    </g>
  );
}

export function Etp() {
  return (
    <g>
      <rect className="sv-fill" x={-46} y={-16} width={42} height={52} rx={3} />
      <rect className="sv-fill" x={4} y={-16} width={42} height={52} rx={3} />
      <rect className="sv-raw" x={-44} y={-6} width={38} height={40} />
      <rect className="sv-water" x={6} y={-6} width={38} height={40} />
      <g className="bubbles">{[-36, -26, -16].map((x, i) => <circle key={x} cx={x} cy={30} r={2.400} style={{ animationDelay: `${i * 0.5}s` }} />)}</g>
      <g className="wave"><path className="sv-ln" d="M-60 -6 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0" /></g>
      <path className="sv-ln" d="M-4 6 H4" />
      <text className="sv-txt" x={-25} y={-24}>aerate</text>
      <text className="sv-txt" x={25} y={-24}>settle</text>
    </g>
  );
}

export function Symbol({ id, level = 74 }: { id: string; level?: number }) {
  switch (id) {
    case "intake": return <Intake />;
    case "clarifier": return <Clarifier />;
    case "filter": return <Filter />;
    case "uf": return <Uf />;
    case "ro": return <Ro />;
    case "tank": return <Tank level={level} />;
    case "cooling": return <Cooling />;
    case "boiler": return <Boiler />;
    case "process": return <Process />;
    case "etp": return <Etp />;
    default: return null;
  }
}
