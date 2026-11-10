import { useState } from "react";
import { Power, PowerOff, Wrench, WifiOff } from "lucide-react";
import Cluster from "./Cluster";
import SpanView from "./SpanView";
import PolarField from "./PolarField";
import { Consumption, Moisture, Storage } from "./Panels";
import { AlertsDialog, Confirm, ForecastDialog, PumpDialog, ScheduleDialog } from "./Dialogs";
import { useCan } from "./role";
import { clockOf } from "./alarmdata";
import { PIVOTS, type PivotId } from "./pivots";
import { activeAlarms, startChecks, type Actions, type Fleet } from "./model";

type Dlg = null | "forecast" | "pump" | "sched" | "alerts" | "power" | "reset";

/** Tab 2: one pivot, monitoring and control */
export default function Detail({ id, fleet, act }: { id: PivotId; fleet: Fleet; act: Actions }) {
  const p = fleet.pivots[id];
  const meta = PIVOTS.find((x) => x.id === id)!;
  const [dlg, setDlg] = useState<Dlg>(null);
  const close = () => setDlg(null);
  const tune = useCan("tune"), conf = useCan("configure");
  const stale = p.link === "lost";
  return (
    <div className={`detail ${stale ? "stale" : ""}`}>
      {stale && <div className="stale-bar" role="status"><WifiOff size={18} />No signal from {id} · last seen {clockOf(p.lastSeen)} · the values shown may be out of date</div>}
      <div className="d-main" inert={stale}>
        <Cluster p={p} alerts={activeAlarms(fleet, id).length} canTune={tune.ok} onToggle={() => setDlg("power")} onSpeed={(v) => act.setSpeed(id, v)} onAlerts={() => setDlg("alerts")} />
        <SpanView p={p} onNozzle={(i) => act.toggleNozzle(id, i)} />
        <PolarField p={p} label={`Pivot ${id} · ${meta.crop} · ${meta.feddan} feddan`} />
      </div>
      <div className="d-side" inert={stale}>
        <Moisture m={p.moisture} limit={p.dryLimit} lock={conf.why} onAdjust={() => setDlg("forecast")} />
        <Storage s={fleet.storage} lock={conf.why} onAdjust={() => setDlg("pump")} />
        <Consumption p={p} clock={fleet.clock} lock={tune.why} onAdjust={() => setDlg("sched")} />
      </div>
      {dlg === "forecast" && <ForecastDialog p={p} onApply={(l, s) => act.setForecast(id, l, s)} onClose={close} />}
      {dlg === "pump" && <PumpDialog pumps={fleet.pumps} onApply={act.setPumps} onClose={close} />}
      {dlg === "sched" && <ScheduleDialog p={p} onApply={(w) => act.setWindow(id, w)} onClose={close} />}
      {dlg === "alerts" && <AlertsDialog alarms={activeAlarms(fleet, id)} onReset={() => setDlg("reset")} onRepair={(i) => act.repairNozzle(id, i)} onAck={(aid) => act.ack(aid)} onClose={close} />}
      {dlg === "power" && (p.running
        ? <Confirm title={`Stop pivot ${id}?`} icon={<PowerOff size={20} />} text="The span stops where it is and the water is shut off. You can start it again from here." confirmLabel="Stop pivot" onConfirm={() => act.toggle(id)} onClose={close} />
        : <Confirm title={`Start pivot ${id}?`} icon={<Power size={20} />} text="The span starts moving and the water is turned on. Every check below must pass first." checks={startChecks(fleet, id)} confirmLabel="Start pivot" onConfirm={() => act.toggle(id)} onClose={close} />)}
      {dlg === "reset" && <Confirm title="Reset the fault?" icon={<Wrench size={20} />} text={`${p.fault ?? "The fault"}. Check on site that the tower is safe before you reset it. The pivot stays stopped until you start it.`} confirmLabel="Reset fault" onConfirm={() => act.resetFault(id)} onClose={close} />}
    </div>
  );
}
