import { Fragment } from "react";
import type { FlowCfg, PipeKind } from "./FlowDiagram";
import type { Tone } from "./diagram";

/** The same process as a vertical flow for phone-width screens: one card per stage, animated symbol, status and key readings. */
type Props = {
  flow: FlowCfg;
  sel: string;
  onSelect: (id: string) => void;
  tones: Record<string, Tone>;
  lines: (id: string) => string[];
  num: (id: string, k: string) => number;
  val: (id: string, k: string) => string;
};

export default function PhoneFlow({ flow, sel, onSelect, tones, lines, num, val }: Props) {
  // pipe colour between stage i and i+1: the row of six, then the treated header, then used water to wastewater
  const kinds: PipeKind[] = [...flow.row1, flow.header, flow.collector, flow.collector, flow.collector];
  return (
    <div className="pf">
      {flow.equip.map((e, i) => {
        const tone = tones[e.id];
        return (
          <Fragment key={e.id}>
            <button className={`pf-row ${tone} ${sel === e.id ? "on" : ""}`} onClick={() => onSelect(e.id)} aria-pressed={sel === e.id}>
              <svg className="pf-sym" viewBox="-60 -66 120 132" aria-hidden>
                <defs><clipPath id={`pfclip-${e.id}`}><rect x={-52} y={-58} width={104} height={116} rx={5} /></clipPath></defs>
                <g className={`eq ${tone} ${sel === e.id ? "on" : ""}`}>
                  <rect className="halo" x={-58} y={-64} width={116} height={128} rx={9} />
                  <rect className="tile" x={-52} y={-58} width={104} height={116} rx={5} />
                  <g clipPath={`url(#pfclip-${e.id})`}>{flow.symbol(e.id, num)}</g>
                </g>
              </svg>
              <span className="pf-txt">
                <b><i className={`k-dot ${tone}`} /> {e.n} · {e.name}</b>
                {lines(e.id).map((l) => <span key={l}>{l}</span>)}
              </span>
            </button>
            {i < flow.equip.length - 1 && <div className={`pf-arrow p-${kinds[i]}`} aria-hidden><span /></div>}
          </Fragment>
        );
      })}
      <div className="pf-back"><span>↺ {flow.caps.reuse}</span><b>{val(flow.reuseVal.id, flow.reuseVal.k)} %</b></div>
    </div>
  );
}
