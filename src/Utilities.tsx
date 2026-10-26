import { useState } from "react";
import { useStoryCmd } from "./storytour";
import Energy from "./Energy";
import Water from "./Water";
import type { TabId } from "./data";

/** Utilities: energy optimization and water monitoring, two views of the community's networks */
export default function Utilities({ go, focus }: { go: (tab: TabId, target?: string) => void; focus?: string }) {
  const [view, setView] = useState<"energy" | "water">(focus === "water" ? "water" : "energy");
  useStoryCmd((c, a) => { if (c === "ut:view") setView(a as "energy" | "water"); });
  return (
    <div className="plan">
      <div className="subtabs" role="tablist">
        <button role="tab" aria-selected={view === "energy"} className={view === "energy" ? "on" : ""} onClick={() => setView("energy")}>Energy optimization</button>
        <button role="tab" aria-selected={view === "water"} className={view === "water" ? "on" : ""} onClick={() => setView("water")}>Water monitoring</button>
      </div>
      {view === "energy" ? <Energy /> : <Water go={go} />}
    </div>
  );
}
