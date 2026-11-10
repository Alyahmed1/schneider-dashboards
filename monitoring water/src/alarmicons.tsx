import { Activity, BellRing, CircleCheck, Info, OctagonAlert, TriangleAlert, Wrench, WifiOff, Check, type LucideIcon } from "lucide-react";
import type { AlarmCls, AlarmState, Sev } from "./alarmdata";

/** one symbol per severity, state and class, used on the bell, the Alarms page, the events log and the alerts dialog */
const SEV: Record<Sev, { icon: LucideIcon; cls: string }> = {
  Critical: { icon: OctagonAlert, cls: "bad" },
  Warning: { icon: TriangleAlert, cls: "warn" },
  Info: { icon: Info, cls: "info" },
};
const STATE: Record<AlarmState, LucideIcon> = { UNACK: BellRing, ACK: Check, ACK_RTN: CircleCheck };
const CLS: Record<AlarmCls, LucideIcon> = { PROCESS: Activity, EQUIPMENT: Wrench, COMMUNICATION: WifiOff };

export const SevIcon = ({ sev, size = 16 }: { sev: Sev; size?: number }) => { const S = SEV[sev]; return <S.icon size={size} className={`ai ${S.cls}`} aria-hidden />; };
export const StateIcon = ({ state, size = 16 }: { state: AlarmState; size?: number }) => { const I = STATE[state]; return <I size={size} className="ai" aria-hidden />; };
export const ClsIcon = ({ cls, size = 16 }: { cls: AlarmCls; size?: number }) => { const I = CLS[cls]; return <I size={size} className="ai" aria-hidden />; };
