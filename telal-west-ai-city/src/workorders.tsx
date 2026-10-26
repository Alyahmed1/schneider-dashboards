import { createContext, useContext, useState, type ReactNode } from "react";

export type WoStatus = "Open" | "In progress" | "Done";
export interface WorkOrder { id: string; title: string; asset?: string; priority: "High" | "Medium" | "Low"; due: string; status: WoStatus; source: "AI forecast" | "Leak detection" | "Camera event" | "Resident request" | "Manual" }

const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };

/** a few orders to start with, so the list is never empty */
const SEED: WorkOrder[] = [
  { id: "WO-1041", title: "Replace filter bank, school air handler", asset: "AH-2", priority: "Medium", due: day(6), status: "Open", source: "AI forecast" },
  { id: "WO-1038", title: "Re-torque pump coupling, hospital chiller 2", asset: "CH-2", priority: "High", due: day(3), status: "In progress", source: "AI forecast" },
  { id: "WO-1035", title: "Firmware update, street lighting controllers", asset: "LC-12", priority: "Low", due: day(12), status: "Open", source: "Manual" },
];

interface Ctx { orders: WorkOrder[]; add: (w: Omit<WorkOrder, "id" | "status">) => string; advance: (id: string) => void; open: number }
const C = createContext<Ctx>({ orders: [], add: () => "", advance: () => {}, open: 0 });

/** work orders shared by the tabs: Assets raises them from a forecast, Utilities from a leak */
export function WorkOrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<WorkOrder[]>(SEED);
  const add: Ctx["add"] = (w) => {
    const id = `WO-${1042 + orders.length - SEED.length + 1}`;
    setOrders((o) => [{ ...w, id, status: "Open" }, ...o]);
    return id;
  };
  const advance = (id: string) => setOrders((o) => o.map((w) => (w.id === id ? { ...w, status: w.status === "Open" ? "In progress" : w.status === "In progress" ? "Done" : "Open" } : w)));
  return <C.Provider value={{ orders, add, advance, open: orders.filter((w) => w.status !== "Done").length }}>{children}</C.Provider>;
}
export const useWorkOrders = () => useContext(C);
export { day as inDays };
