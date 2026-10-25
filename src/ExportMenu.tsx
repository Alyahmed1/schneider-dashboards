import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

/** one "Export" button with a small menu: a PDF report in the app's colours, or the data as a CSV file */
export default function ExportMenu({ onPdf, onCsv }: { onPdf: () => Promise<void> | void; onCsv: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  const run = async (fn: () => Promise<void> | void) => {
    setOpen(false);
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <div className="xp" ref={box}>
      <button className="xp-btn" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} disabled={busy}>
        <Download size={14} /> {busy ? "Preparing…" : "Export"}
      </button>
      {open && (
        <div className="xp-menu" role="menu">
          <button role="menuitem" onClick={() => run(onPdf)}><FileText size={16} /><span>Report<small>PDF, in the colours of the app</small></span></button>
          <button role="menuitem" onClick={() => run(onCsv)}><FileSpreadsheet size={16} /><span>Data<small>CSV, opens in Excel</small></span></button>
        </div>
      )}
    </div>
  );
}
