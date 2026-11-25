import { Fragment, useMemo, useState } from "react";
import { AlertCircle, ArrowDownUp, ChevronDown, ChevronRight, Download, FileSpreadsheet, Layers, Search, Trash2, Wallet } from "lucide-react";
import { BOQ, DOMAINS, DOMAIN_COLOR, ROADMAP, type BoqItem, type Delivery } from "./data";
import { usePrices } from "./state";
import { Kpi, KpiRow, Panel, Seg, fmt } from "./ui";

type ColorBy = "delivery" | "layer" | "price";
type SortKey = "id" | "name" | "price";
const DELIVERIES: Delivery[] = ["5-year licence", "One-time supply", "Service"];
const DEL_COLOR: Record<Delivery, string> = { "5-year licence": "var(--violet)", "One-time supply": "var(--accent)", "Service": "var(--warn)" };
const LAYERS = ["Platform", "Application", "Security", "Infrastructure", "Service"] as const;
const LAYER_COLOR: Record<string, string> = { Platform: "var(--info)", Application: "var(--accent)", Security: "var(--bad)", Infrastructure: "var(--muted)", Service: "var(--warn)" };

export default function Scope() {
  const { prices, set, clear, total, filled } = usePrices();
  const [q, setQ] = useState("");
  const [dom, setDom] = useState("all");
  const [del, setDel] = useState<"all" | Delivery>("all");
  const [view, setView] = useState<"grouped" | "flat">("grouped");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "id", dir: 1 });
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [shut, setShut] = useState<Set<string>>(new Set());
  const [colorBy, setColorBy] = useState<ColorBy>("delivery");
  const toggle = <T,>(s: Set<T>, v: T) => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; };
  const sortBy = (key: SortKey) => setSort((p) => ({ key, dir: p.key === key ? (p.dir === 1 ? -1 : 1) : 1 }));

  const rows = useMemo(() => {
    const f = BOQ.filter((b) => (dom === "all" || b.domain === dom) && (del === "all" || b.delivery === del) && `${b.name} ${b.ar ?? ""} ${b.domain} ${b.driver ?? ""}`.toLowerCase().includes(q.toLowerCase()));
    const val = (b: BoqItem) => (sort.key === "id" ? b.id : sort.key === "name" ? b.name.toLowerCase() : prices[b.id] ?? -1);
    return [...f].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * sort.dir);
  }, [q, dom, del, sort, prices]);

  const groups = useMemo(() => DOMAINS.map((d) => ({ d, items: rows.filter((b) => b.domain === d) })).filter((g) => g.items.length), [rows]);
  const sum = (items: BoqItem[]) => items.reduce((a, b) => a + (prices[b.id] ?? 0), 0);
  const countBy = (d: string) => BOQ.filter((b) => d === "all" || b.domain === d).length;

  const segs = colorBy === "delivery" ? DELIVERIES.map((d) => ({ name: d, color: DEL_COLOR[d], n: BOQ.filter((b) => b.delivery === d).length }))
    : colorBy === "layer" ? LAYERS.map((l) => ({ name: l, color: LAYER_COLOR[l], n: BOQ.filter((b) => b.layer === l).length }))
    : [{ name: "Priced", color: "var(--good)", n: filled }, { name: "No price yet", color: "var(--muted)", n: BOQ.length - filled }];

  const csv = () => {
    const head = ["#", "Item", "Domain", "Layer", "Delivery", "Unit", "Quantity", "Sizing driver", "Price (EGP)"];
    const lines = BOQ.map((b) => [b.id, `"${b.name.replace(/"/g, '""')}"`, b.domain, b.layer, b.delivery, b.unit, `"${b.qty}"`, `"${b.driver ?? ""}"`, prices[b.id] ?? ""].join(","));
    const url = URL.createObjectURL(new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: "alamein-coc-boq.csv" }).click();
    URL.revokeObjectURL(url);
  };

  const Row = ({ b }: { b: BoqItem }) => {
    const isOpen = open.has(b.id);
    return (
      <Fragment>
        <tr className={`boq-r ${isOpen ? "open" : ""}`}>
          <td className="muted">{b.id}</td>
          <td>
            <button className="boq-name" onClick={() => setOpen(toggle(open, b.id))} aria-expanded={isOpen}>
              {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}<b>{b.name}</b>
            </button>
            <div className="badges">
              {view === "flat" && <span className="badge" style={{ ["--c" as string]: DOMAIN_COLOR[b.domain] }}>{b.domain}</span>}
              {b.fit && <span className="badge fit">Schneider / AVEVA fit</span>}
              {b.flag && <span className="badge warn"><AlertCircle size={10} /> to confirm</span>}
            </div>
          </td>
          <td>{b.layer}</td>
          <td>{b.delivery}</td>
          <td>{b.qty}</td>
          <td className="r"><input className="price" inputMode="numeric" placeholder="TBD" aria-label={`Price for ${b.name}`} value={prices[b.id] !== undefined ? fmt(prices[b.id]) : ""}
            onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); set(b.id, v === "" ? null : Number(v)); }} /></td>
        </tr>
        {isOpen && (
          <tr className="boq-d"><td />
            <td colSpan={5}>
              <dl>
                {b.ar && <><dt>Arabic</dt><dd dir="rtl">{b.ar}</dd></>}
                <dt>Unit</dt><dd>{b.unit}</dd>
                <dt>Sizing driver</dt><dd>{b.driver ?? "None stated"}</dd>
                {b.flag && <><dt>To confirm</dt><dd className="warn">{b.flag}</dd></>}
              </dl>
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  return (
    <div className="tab">
      <KpiRow cols={5}>
        <Kpi n={0} label="BoQ items" value={BOQ.length} icon={FileSpreadsheet} sub="from COC.xlsx" />
        <Kpi n={1} label="Priced so far" value={filled} suffix={` / ${BOQ.length}`} icon={Wallet} tone={filled ? "good" : "warn"} sub={filled ? "type prices in the table" : "the Excel has no prices"} />
        <Kpi n={2} label="Total (EGP)" value={total} icon={Wallet} tone="info" sub={filled ? "sum of the prices entered" : "TBD"} />
        <Kpi n={3} label="Domains" value={DOMAINS.length} icon={Layers} tone="violet" sub="scope areas" />
        <Kpi n={4} label="Items to confirm" value={BOQ.filter((b) => b.flag).length} icon={AlertCircle} tone="bad" sub="flagged in the table" />
      </KpiRow>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1.75fr) minmax(0,1fr)" }}>
        <Panel i={0} title="Bill of quantities" aside={
          <div className="tools">
            <label className="search"><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" aria-label="Search items" /></label>
            <Seg label="View" value={view} onChange={setView} options={[{ id: "grouped", label: "Grouped" }, { id: "flat", label: "Flat" }]} />
            <button className="btn" onClick={csv}><Download size={13} />CSV</button>
            <button className="btn" onClick={clear} disabled={!filled}><Trash2 size={13} />Clear prices</button>
          </div>}>
          <div className="boq-filters">
            <div className="dchips" role="group" aria-label="Filter by domain">
              {["all", ...DOMAINS].map((d) => (
                <button key={d} className={`chip ${dom === d ? "on" : ""}`} onClick={() => setDom(d)} style={{ ["--c" as string]: d === "all" ? "var(--accent)" : DOMAIN_COLOR[d as keyof typeof DOMAIN_COLOR] }}>
                  <i />{d === "all" ? "All" : d}<em>{countBy(d)}</em>
                </button>
              ))}
            </div>
            <Seg label="Delivery" value={del} onChange={setDel} options={[{ id: "all", label: "All" }, ...DELIVERIES.map((d) => ({ id: d, label: d === "5-year licence" ? "Licence" : d === "One-time supply" ? "One-time" : d }))]} />
          </div>
          <div className="scroll">
            <table className="tbl boq">
              <thead><tr>
                <th><button className="th" onClick={() => sortBy("id")}>#<ArrowDownUp size={10} /></button></th>
                <th><button className="th" onClick={() => sortBy("name")}>Item<ArrowDownUp size={10} /></button></th>
                <th>Layer</th><th>Delivery</th><th>Qty</th>
                <th className="r"><button className="th" onClick={() => sortBy("price")}>Price (EGP)<ArrowDownUp size={10} /></button></th>
              </tr></thead>
              <tbody>
                {view === "grouped" ? groups.map((g) => (
                  <Fragment key={g.d}>
                    <tr className="boq-g" onClick={() => setShut(toggle(shut, g.d))}>
                      <td colSpan={5}><span className="gbar" style={{ background: DOMAIN_COLOR[g.d] }} />{shut.has(g.d) ? <ChevronRight size={13} /> : <ChevronDown size={13} />}<b>{g.d}</b><em>{g.items.length} {g.items.length === 1 ? "item" : "items"}</em></td>
                      <td className="r">{sum(g.items) ? fmt(sum(g.items)) : <span className="muted">TBD</span>}</td>
                    </tr>
                    {!shut.has(g.d) && g.items.map((b) => <Row key={b.id} b={b} />)}
                  </Fragment>
                )) : rows.map((b) => <Row key={b.id} b={b} />)}
                {rows.length === 0 && <tr><td colSpan={6} className="empty">No items match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="col" style={{ gridTemplateRows: "minmax(0,1.45fr) minmax(0,1fr)" }}>
          <Panel i={1} title="Scope map" aside={<Seg label="Colour by" value={colorBy} onChange={setColorBy} options={[{ id: "delivery", label: "Delivery" }, { id: "layer", label: "Layer" }, { id: "price", label: "Price" }]} />}>
            <div className="sm">
              <div className="sm-blocks">
                {DOMAINS.map((d) => {
                  const items = BOQ.filter((b) => b.domain === d);
                  const tot = sum(items);
                  return (
                    <div key={d} className={`sblock ${dom === d ? "on" : ""} ${dom !== "all" && dom !== d ? "dim" : ""}`} style={{ ["--n" as string]: items.length, ["--c" as string]: DOMAIN_COLOR[d] }}>
                      <button className="sblock-h" onClick={() => setDom(dom === d ? "all" : d)} aria-pressed={dom === d} title={`Filter the table to ${d}`}><b>{d}</b><span>{tot ? fmt(tot) : `${items.length}`}</span></button>
                      <div className="tiles">
                        {items.map((b) => {
                          const c = colorBy === "delivery" ? DEL_COLOR[b.delivery] : colorBy === "layer" ? LAYER_COLOR[b.layer] : prices[b.id] !== undefined ? "var(--good)" : "var(--muted)";
                          return <button key={b.id} className={`tile ${b.flag ? "flag" : ""} ${colorBy === "price" && prices[b.id] === undefined ? "plain" : ""}`} style={{ ["--t" as string]: c }}
                            title={`#${b.id} ${b.name}${b.flag ? " (to confirm)" : ""}`} aria-label={`Show item ${b.id}, ${b.name}`}
                            onClick={() => { setDom(b.domain); setView("grouped"); setOpen(new Set([b.id])); setShut(new Set()); }}>{b.id}</button>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="sm-note">Bar: split by {colorBy} <span className="dotnote">● to confirm</span></p>
              <div className="sm-bar" aria-label={`Items by ${colorBy}`}>
                {segs.filter((g) => g.n > 0).map((g) => <span key={g.name} style={{ ["--t" as string]: g.color, flex: g.n }} title={`${g.name}: ${g.n}`}>{g.n > 3 ? `${g.name} ${g.n}` : g.n}</span>)}
              </div>
            </div>
          </Panel>
          <Panel i={2} title="5-year delivery roadmap" aside={<span className="muted">illustrative</span>}>
            <div className="gantt scroll">
              <div className="gantt-h">{[1, 2, 3, 4, 5].map((y) => <span key={y}>Year {y}</span>)}</div>
              {ROADMAP.map((r) => (
                <div key={r.name} className="gantt-r">
                  <span className="gantt-n" title={r.name}>{r.name}<small>{r.progress}%</small></span>
                  <div className="gantt-t"><i className="gantt-b" style={{ left: `${(r.from / 5) * 100}%`, width: `${((r.to - r.from) / 5) * 100}%`, background: `${DOMAIN_COLOR[r.domain]}33`, borderColor: DOMAIN_COLOR[r.domain] }}><u style={{ width: `${r.progress}%`, background: DOMAIN_COLOR[r.domain] }} /></i></div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
