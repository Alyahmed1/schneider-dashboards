import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Bar as RBar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { assets, ASSET_TONE, C, equipmentData, maintenanceData, rangeLabel, type Asset, type AssetStatus, type Filters } from "./data";
import { axis, Bar, Card, chartAnim, Chip, Detail, grid, KpiCard, rise, Segmented, Tip, useLast, type ModalTone, Replay, usePersisted } from "./ui";
import { useLiveKpis, useLiveRows } from "./live";
import type { Go } from "./nav";

const ASSET_MODAL: Record<AssetStatus, ModalTone> = { Running: "green", Idle: "yellow", Maintenance: "orange", Fault: "navy" };

const STATUS_FILTERS = ["All", "Running", "Idle", "Maintenance", "Fault"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function Equipment({ f, go }: { f: Filters; go: Go }) {
  const d = useMemo(() => equipmentData(f), [f]);
  const { kpis } = useLiveKpis(d.kpis);
  const causes = useLiveRows(d.causes, "min", "cause", 0.05, 0);
  const list = useMemo(() => assets(f), [f]);
  const [st, setSt] = useState<StatusFilter>("All");
  const [sel, setSel] = useState<Asset | null>(null);
  const a0 = useLast(sel);
  const shown = list.filter((a) => st === "All" || a.status === (st as AssetStatus));
  const wos = useMemo(() => maintenanceData(f).workOrders, [f]);
  const [woDoneMap] = usePersisted<Record<string, boolean>>("jotun-wo-done", {});
  const woDone = wos.filter((w) => woDoneMap[w.id]).length;
  const woOpen = wos.length - woDone;
  const woOverdue = wos.filter((w) => !woDoneMap[w.id] && w.status === "Overdue").length;

  return (
    <>
      <div className="grid g-kpi">{kpis.map((k, i) => <KpiCard key={k.id} k={k} i={i} />)}</div>

      <Card title="Asset health" sub={`${shown.length} of ${list.length} assets`} i={1}
        right={<Segmented value={st} options={STATUS_FILTERS} onChange={setSt} label="Asset status" />}>
        <motion.div layout className="grid g-assets">
          {shown.map((a, i) => {
            const c = a.health >= 80 ? C.good : a.health >= 65 ? C.yellow : C.bad;
            return (
              <motion.div layout key={a.id} className="card asset clickable" {...rise(i)} tabIndex={0} role="button" onClick={() => setSel(a)} onKeyDown={(e) => { if (e.key === "Enter") setSel(a); }}>
                <div className="asset-top">
                  <div><h4>{a.name}</h4><small>{a.kind} · {a.family}</small></div>
                  <Chip tone={ASSET_TONE[a.status]}>{a.status}</Chip>
                </div>
                <div className="big">{a.health}<small>% health</small></div>
                <Bar pct={a.health} color={c} />
                <div className="kv-line" style={{ marginTop: 10, marginBottom: 0 }}><span>OEE {a.oee ? `${a.oee}%` : "—"}</span><b>Serviced {a.service}</b></div>
              </motion.div>
            );
          })}
          {!shown.length && <p className="empty">No assets with this status.</p>}
        </motion.div>
      </Card>

      <div className="grid g-2">
        <Card title="Downtime by cause" sub={`Minutes lost · ${rangeLabel(f.range)}`} i={2}>
          <Replay className="chart-h">
            <ResponsiveContainer>
              <BarChart data={causes} margin={{ left: -6, right: 6, top: 8 }}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="cause" {...axis} interval={0} tick={{ fontSize: 10.5 }} />
                <YAxis {...axis} width={44} />
                <Tooltip content={<Tip unit=" min" />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <RBar dataKey="min" name="lost" radius={[6, 6, 0, 0]} {...chartAnim}>
                  {d.causes.map((x, i) => <Cell key={x.cause} fill={i === 0 ? C.yellow : i < 3 ? C.warn : C.blue} />)}
                </RBar>
              </BarChart>
            </ResponsiveContainer>
          </Replay>
        </Card>

        <Card title="Maintenance at a glance" sub="Work orders for these assets" i={3}
          right={<button className="link-btn" onClick={() => go("maintenance")}>Open maintenance<ArrowRight size={14} /></button>}>
          <div className="row-kv">
            {[
              { label: "Open", n: woOpen, color: C.blue },
              { label: "Overdue", n: woOverdue, color: C.bad },
              { label: "Done", n: woDone, color: C.good },
            ].map((r) => (
              <div key={r.label}>
                <div className="kv-line"><span>{r.label}</span><b>{r.n} of {wos.length}</b></div>
                <Bar pct={wos.length ? (r.n / wos.length) * 100 : 0} color={r.color} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      {a0 && (
        <Detail open={!!sel} onClose={() => setSel(null)} tone={ASSET_MODAL[a0.status]} eyebrow={`${a0.id} · ${a0.kind}`} title={a0.name}
          big={`${a0.health}%`} bigNote="health"
          steps={{ labels: ["Fault", "Poor", "Fair", "Good", "Excellent"], current: a0.health >= 90 ? 4 : a0.health >= 75 ? 3 : a0.health >= 60 ? 2 : a0.health >= 45 ? 1 : 0 }}
          rows={[["Status", a0.status], ["Product family", a0.family], ["OEE", a0.oee ? `${a0.oee} %` : "Not running"], ["Last service", a0.service]]}
          actions={<button className="mbtn" onClick={() => { setSel(null); go("maintenance"); }}>Open in Maintenance</button>} />
      )}
    </>
  );
}
