import Eq from "./Eq";
import type { Sym } from "./cycleData";
import { STAGES } from "./plantStages";

/** El Hamam as a process diagram: the 7 stages in a snake (row 1 left to right, row 2 right to left), equipment drawings joined by moving arrows, one number tile under each. */
const SYM: Record<string, Sym> = { intake: "intake", screen: "screen", clarifier: "clarifier", filter: "filter", chlorine: "contact", outlet: "outlet", field: "pivot" };
const POS: [number, number, "r" | "l" | "d" | null][] = [[1, 1, "r"], [2, 1, "r"], [3, 1, "r"], [4, 1, "d"], [4, 2, "l"], [3, 2, "l"], [2, 2, null]];

export default function StationDiagram({ stage, onPick }: { stage: number; onPick: (i: number) => void }) {
  return (
    <div className="st-diag">
      <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="wcBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4497c0" /><stop offset="0.35" stopColor="#317ba0" /><stop offset="0.7" stopColor="#203a52" /><stop offset="1" stopColor="#182c40" /></linearGradient>
          <linearGradient id="wcTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#66bce8" /><stop offset="1" stopColor="#3582a8" /></linearGradient>
        </defs>
      </svg>
      {STAGES.map((g, i) => {
        const [col, row, dir] = POS[i];
        const tone = g.id === "field" || g.id === "outlet" ? "#34d399" : "#22d3ee";
        return (
          <div key={g.id} className={`sd-node ${stage === i ? "on" : ""}`} style={{ gridColumn: col, gridRow: row, ["--tone" as string]: tone }} role="button" tabIndex={0}
            aria-pressed={stage === i} aria-label={`Step ${i + 1}, ${g.title}`} onClick={() => onPick(i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(i); } }}>
            <b className="sd-pin">{i + 1}</b>
            <div className="sd-eq"><Eq kind={SYM[g.id]} /></div>
            <h5>{g.title}</h5>
            <div className="sd-num"><em>{g.kpis[0][0]}</em><b>{g.kpis[0][1]}</b></div>
            {dir && <div className={`sd-arrow ${dir}`} aria-hidden><i /><i /><i /></div>}
          </div>
        );
      })}
      <div className="sd-node sd-sum" style={{ gridColumn: 1, gridRow: 2 }}>
        <em>PLANT BALANCE</em>
        <div><span>In</span><b>1.04</b></div>
        <div><span>Out to farms</span><b>1.00</b></div>
        <small>M m³/day. The rest is sludge and process loss.</small>
      </div>
    </div>
  );
}
