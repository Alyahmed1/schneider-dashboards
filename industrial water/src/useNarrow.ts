import { useEffect, useState } from "react";

/** true on phone-width screens, where the diagram is shown as a vertical flow instead */
export function useNarrow(max = 759): boolean {
  const q = `(max-width: ${max}px)`;
  const [n, setN] = useState(() => (typeof window !== "undefined" ? window.matchMedia(q).matches : false));
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setN(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [q]);
  return n;
}
