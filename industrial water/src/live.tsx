import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const Ctx = createContext(0);

/** one shared clock: every live number on screen moves on the same beat */
export function LiveProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setT((n) => n + 1), 2000);
    return () => window.clearInterval(id);
  }, []);
  return <Ctx.Provider value={t}>{children}</Ctx.Provider>;
}

export const useTick = () => useContext(Ctx);

/** a small smooth wobble around 1, so a reading drifts like a real sensor */
export const wobble = (t: number, amp: number, seed = 0) =>
  1 + amp * (Math.sin(t * 0.9 + seed * 2.3) * 0.6 + Math.sin(t * 0.37 + seed * 5.1) * 0.4);
