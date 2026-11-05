import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/** counts up from 0 the first time it shows, then follows the value */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const ctl = animate(from.current, value, {
      duration: from.current === 0 ? 1.4 : 0.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { from.current = v; setShown(v); },
    });
    return () => ctl.stop();
  }, [value]);
  return <>{shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

export const C = { aqua: "#3dbcdc", blue: "#4a9be8", violet: "#8e94e8", good: "#3ecf5a", warn: "#f0a030", bad: "#e8467c", copper: "#e8873a" };
