import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ALARM_LOG, atOf, NOW, type LogAlarm } from "./alarmLog";

export interface DoneInfo { at: number; by: string }
interface AlarmsState {
  log: LogAlarm[];
  done: Record<string, DoneInfo>;
  markDone: (id: string) => void;
  undo: (id: string) => void;
}

const KEY = "aqua-alarms-done";
const defaults: Record<string, DoneInfo> = Object.fromEntries(
  ALARM_LOG.filter((a) => a.doneDefault).map((a) => [a.id, { at: NOW - a.doneDefault!.minsAgo * 60000, by: a.doneDefault!.by }]),
);
/** what the user changed, remembered in the browser: null means "reopened" */
function readOverrides(): Record<string, DoneInfo | null> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, DoneInfo | null>; } catch { return {}; }
}

const Ctx = createContext<AlarmsState>({ log: ALARM_LOG, done: defaults, markDone: () => {}, undo: () => {} });

export function AlarmsProvider({ children }: { children: ReactNode }) {
  const [over, setOver] = useState<Record<string, DoneInfo | null>>(readOverrides);
  const save = useCallback((next: Record<string, DoneInfo | null>) => {
    setOver(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private window: changes are just not remembered */ }
  }, []);
  const done = useMemo(() => {
    const d: Record<string, DoneInfo> = { ...defaults };
    for (const [id, v] of Object.entries(over)) { if (v) d[id] = v; else delete d[id]; }
    return d;
  }, [over]);
  const value = useMemo<AlarmsState>(() => ({
    log: ALARM_LOG,
    done,
    markDone: (id) => save({ ...over, [id]: { at: Date.now(), by: "AVEVA" } }),
    undo: (id) => save({ ...over, [id]: null }),
  }), [done, over, save]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAlarmLog = () => useContext(Ctx);

/** active alarms, newest first */
export function activeAlarms(log: LogAlarm[], done: Record<string, DoneInfo>) {
  return log.filter((a) => !done[a.id]).sort((a, b) => atOf(b) - atOf(a));
}
