import { OFFERS, PLAN_NOTE, type TabId } from "./data";

/** which phase builds each tab */
const PHASE: Record<string, number> = { safety: 4, assistant: 4, platform: 4 };

/** stands in for a tab that a later phase builds; shows what the brief says that tab is for */
export default function Soon({ tab, label }: { tab: TabId; label: string }) {
  const items = OFFERS.filter((o) => o.tab === tab);
  return (
    <div className="soon">
      <div className="soon-eyebrow">Coming in phase {PHASE[tab]}</div>
      <h2>{label}</h2>
      {tab === "plan" && <p>{PLAN_NOTE}</p>}
      {items.map((o) => <div className="soon-offer" key={o.name}><b>{o.name}</b><p>{o.text}</p></div>)}
    </div>
  );
}
