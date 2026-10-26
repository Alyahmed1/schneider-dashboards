import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/** on / off choices the operator makes for pumps and valves; shared by every tab */
interface EquipState { on: Record<string, boolean>; set: (stage: string, id: string, on: boolean) => void }
const Ctx = createContext<EquipState>({ on: {}, set: () => {} });

export const equipKey = (stage: string, id: string) => `${stage}:${id}`;

export function EquipProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState<Record<string, boolean>>({});
  const value = useMemo<EquipState>(() => ({ on, set: (stage, id, v) => setOn((p) => ({ ...p, [equipKey(stage, id)]: v })) }), [on]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useEquip = () => useContext(Ctx);
