/** Exports for the Maintenance tab: a PDF report in the colours of whichever theme is on screen, and a plain CSV file.
 *  The colours are read from the page's own CSS variables at the moment of the export, so the report always matches the app. */

export interface ReportSpec {
  file: string; // file name without the date and extension
  title: string;
  subtitle: string;
  summary: [string, string][]; // small boxes above the table
  note: string; // what the table shows (the filter in use)
  columns: string[];
  rows: string[][];
  widths?: number[]; // relative column widths
  /** a cell that should look like a coloured pill (or a coloured number) */
  tone?: (row: number, col: number, text: string) => "teal" | "ink" | "bad" | "warn" | "good" | "mute" | undefined;
}

type RGB = [number, number, number];

function rgb(value: string, fallback: RGB): RGB {
  const s = value.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) { const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16)); return [r, g, b]; }
  m = /rgba?\(([^)]+)\)/i.exec(s);
  if (m) { const p = m[1].split(/[\s,/]+/).map(Number); if (p.length >= 3 && p.every((x) => !Number.isNaN(x))) return [p[0], p[1], p[2]]; }
  return fallback;
}
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;
const lum = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

function theme() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fb: RGB) => rgb(css.getPropertyValue(name), fb);
  const bg = v("--bg", [244, 241, 234]);
  const card = v("--card", [255, 255, 255]);
  return {
    // only the first font in the list counts: "sans-serif" at the end of a list must not look like a serif font
    serif: /^\W*(fraunces|georgia|times)/i.test(css.getPropertyValue("--display").trim()),
    bg, card,
    alt: mix(card, bg, 0.45),
    head: v("--surface-2", mix(card, bg, 0.5)),
    ink: v("--ink", [11, 42, 51]),
    muted: v("--muted", [107, 128, 137]),
    text2: v("--text-2", [74, 102, 112]),
    line: v("--line", [227, 222, 210]),
    teal: v("--teal", [14, 143, 138]),
    good: v("--good", [31, 169, 113]),
    warn: v("--warn", [240, 138, 36]),
    bad: v("--bad", [226, 73, 90]),
  };
}

/** the standard PDF fonts only know Latin letters, so a few symbols are swapped for plain ones */
const clean = (s: string) => s
  .replace(/₂/g, "2").replace(/Δ/g, "d").replace(/→/g, "->").replace(/≥/g, ">=").replace(/≤/g, "<=")
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[^\x20-\x7E -ÿ–—•]/g, "?");

const dayStamp = () => new Date().toISOString().slice(0, 10);

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadCsv(spec: ReportSpec) {
  const esc = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [spec.columns, ...spec.rows].map((r) => r.map(esc).join(","));
  save(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${spec.file}-${dayStamp()}.csv`);
}

export async function downloadPdf(spec: ReportSpec) {
  // loaded only when someone exports, so the dashboard itself stays light
  const [{ jsPDF }, table] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = table.default;
  const T = theme();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const heading = T.serif ? "times" : "helvetica";
  const paint = () => { doc.setFillColor(...T.bg); doc.rect(0, 0, W, H, "F"); };
  paint();

  // title band
  doc.setFillColor(...T.card);
  doc.rect(10, 10, W - 20, 22, "F");
  doc.setFillColor(...T.teal);
  doc.rect(10, 10, 2.2, 22, "F");
  doc.setFont(heading, "bold");
  doc.setFontSize(19);
  doc.setTextColor(...T.ink);
  doc.text(clean(spec.title), 18, 20.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...T.muted);
  doc.text(clean(spec.subtitle), 18, 27.5);

  // summary boxes
  const n = Math.max(1, spec.summary.length);
  const gap = 3;
  const bw = (W - 20 - gap * (n - 1)) / n;
  spec.summary.forEach(([label, value], i) => {
    const x = 10 + i * (bw + gap);
    doc.setFillColor(...T.card);
    doc.setDrawColor(...T.line);
    doc.setLineWidth(0.2);
    doc.rect(x, 36, bw, 16, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...T.muted);
    doc.text(clean(label), x + 3, 41.5, { maxWidth: bw - 6 });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...T.ink);
    // a long value shrinks until it fits its box
    let size = 12;
    doc.setFontSize(size);
    while (size > 7 && doc.getTextWidth(clean(value)) > bw - 6) { size -= 0.5; doc.setFontSize(size); }
    doc.text(clean(value), x + 3, 48.5);
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...T.text2);
  doc.text(clean(spec.note), 10, 58);

  const total = (spec.widths ?? []).reduce((s, w) => s + w, 0);
  const columnStyles: Record<number, { cellWidth: number }> = {};
  (spec.widths ?? []).forEach((w, i) => { columnStyles[i] = { cellWidth: ((W - 20) * w) / total }; });

  const pill: Record<string, RGB> = { teal: T.teal, ink: T.ink, bad: T.bad, warn: T.warn, good: T.good, mute: T.card };
  autoTable(doc, {
    startY: 61,
    margin: { left: 10, right: 10, top: 14, bottom: 16 },
    theme: "plain",
    head: [spec.columns.map(clean)],
    body: spec.rows.map((r) => r.map(clean)),
    columnStyles,
    styles: { font: "helvetica", fontSize: 8.5, textColor: T.ink, fillColor: T.card, lineColor: T.line, lineWidth: 0.2, cellPadding: 2.2, valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: T.head, textColor: T.text2, fontStyle: "bold" },
    alternateRowStyles: { fillColor: T.alt },
    willDrawPage: (d) => { if (d.pageNumber > 1) paint(); },
    didParseCell: (d) => {
      if (d.section !== "body" || !spec.tone) return;
      const tone = spec.tone(d.row.index, d.column.index, String(d.cell.raw));
      if (!tone) return;
      const fill = pill[tone];
      d.cell.styles.fillColor = fill;
      d.cell.styles.fontStyle = "bold";
      d.cell.styles.halign = "center";
      d.cell.styles.textColor = tone === "mute" ? T.text2 : lum(fill) > 150 ? [16, 18, 40] : [255, 255, 255];
    },
  });

  // footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...T.line);
    doc.setLineWidth(0.2);
    doc.line(10, H - 12, W - 10, H - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...T.muted);
    doc.text("Smart Wastewater Treatment  |  sample data for demonstration", 10, H - 7.5);
    doc.text(`Page ${p} of ${pages}`, W - 10, H - 7.5, { align: "right" });
  }

  doc.save(`${spec.file}-${dayStamp()}.pdf`);
}
