import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ArrowUpRight, Check, Pause, Undo2 } from "lucide-react";
import type { Tone, logisticsData } from "./data";
import { Bar, Chip, SearchBox, Segmented, usePersisted } from "./ui";

export type Truck = ReturnType<typeof logisticsData>["trucks"][number];
export type Loc = "queue" | "out" | "in" | "departed" | "hold";

const CAP = 4; // bays per direction
const BAY_BASE = { out: 1, in: 5 } as const;
// trucks that start in the yard queue so there is something to assign
const START_QUEUED = new Set(["T-212", "T-219", "T-223"]);
const initialLoc = (t: Truck): Loc => (START_QUEUED.has(t.id) || t.bay === "—" ? "queue" : t.dir === "Outbound" ? "out" : "in");

/** Where every truck is. Shared by the board, the list, the KPI and the summary so they always agree. */
export function useDock(trucks: Truck[]) {
  const [state, setState] = usePersisted<Record<string, Loc>>("jotun-dock-v2", {});
  const locOf = (t: Truck): Loc => state[t.id] ?? initialLoc(t);
  const move = (id: string, loc: Loc) => setState((p) => ({ ...p, [id]: loc }));
  const inLoc = (loc: Loc) => trucks.filter((t) => locOf(t) === loc);
  const bayOf = (t: Truck): number | null => { const l = locOf(t); return l === "out" || l === "in" ? BAY_BASE[l] + inLoc(l).indexOf(t) : null; };
  return { locOf, move, inLoc, bayOf, reset: () => setState({}) };
}
export type Dock = ReturnType<typeof useDock>;

const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const parseLoad = (load: string) => {
  const [prod, qty = ""] = load.split(" · ");
  const m = qty.match(/^([\d.]+)\s*(.*)$/);
  return { prod, num: m ? m[1] : qty, unit: m ? m[2] : "" };
};
const cardTone = (t: Truck, loc: Loc) => (loc === "hold" ? "navy" : loc === "queue" && t.status === "Delayed" ? "orange" : t.dir === "Outbound" ? "yellow" : "green");

function whereLabel(loc: Loc, bay: number | null) {
  return loc === "queue" ? "Yard queue" : loc === "departed" ? "Departed" : loc === "hold" ? "On hold" : `Bay ${bay}`;
}
function statusOf(t: Truck, loc: Loc): { tone: Tone; label: string } {
  if (loc === "departed") return { tone: "good", label: "Departed" };
  if (loc === "hold") return { tone: "warn", label: "On hold" };
  if (loc === "queue") return t.status === "Delayed" ? { tone: "bad", label: "Delayed" } : { tone: "mute", label: "Queued" };
  return { tone: "info", label: t.dir === "Inbound" ? "Unloading" : "Loading" };
}

function TruckCard({ t, loc, bay, overlay }: { t: Truck; loc: Loc; bay: number | null; overlay?: boolean }) {
  const p = parseLoad(t.load);
  return (
    <div className={`pcard ${cardTone(t, loc)} ${overlay ? "overlay" : ""}`}>
      <div className="pc-top"><span>{t.dir}{bay ? ` · Bay ${bay}` : ""}</span><span className="pc-go"><ArrowUpRight size={13} /></span></div>
      <div>
        <div className="pc-title">{t.carrier}</div>
        <div className="pc-sub">{p.prod} · {t.id}</div>
      </div>
      <div className="pc-bottom">
        <div className="pc-big">{p.num}<small>{p.unit}</small></div>
        <div className="pc-right"><span className="pc-eta">{t.eta}</span><span className="pc-av">{initials(t.carrier)}</span></div>
      </div>
    </div>
  );
}

function DragTruck({ t, loc, bay, onOpen }: { t: Truck; loc: Loc; bay: number | null; onOpen: (t: Truck) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: t.id });
  return (
    <div ref={setNodeRef} className={`pwrap ${isDragging ? "ghost" : ""}`} {...listeners} {...attributes} onClick={() => onOpen(t)}>
      <TruckCard t={t} loc={loc} bay={bay} />
    </div>
  );
}

function Column({ id, title, dot, count, cap, hint, children }: { id: Loc; title: string; dot: string; count: number; cap?: number; hint: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`pcol ${isOver ? "over" : ""}`}>
      <div className="pcol-head"><i className={`pdot ${dot}`} /><b>{title}</b><span className="pcol-count">{count}{cap ? `/${cap}` : ""}</span></div>
      <div className="pcol-body">{children}{!count && <p className="col-empty">{hint}</p>}</div>
    </div>
  );
}

function Zone({ id, kind, title, sub, trucks, onReturn }: { id: Loc; kind: "good" | "hold"; title: string; sub: string; trucks: Truck[]; onReturn: (t: Truck) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`pzone ${kind} ${isOver ? "over" : ""}`}>
      <span className="pzone-ico">{kind === "good" ? <Check size={16} /> : <Pause size={16} />}</span>
      <div className="pzone-text">
        <b>{title} <span>{trucks.length}</span></b>
        <small>{trucks.length ? "Tap a truck to bring it back to the queue" : sub}</small>
        {!!trucks.length && (
          <div className="pzone-pills">
            {trucks.map((t) => <button key={t.id} className="pzone-pill" onClick={() => onReturn(t)} title={`Return ${t.id} to the yard queue`}>{t.id}<Undo2 size={11} /></button>)}
          </div>
        )}
      </div>
    </div>
  );
}

interface ToastState { text: string; undo?: () => void }

export function DockBoard({ trucks, dock, onOpen }: { trucks: Truck[]; dock: Dock; onOpen: (t: Truck) => void }) {
  const [view, setView] = useState<"Board" | "List">("Board");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t); }, [toast]);

  const match = (t: Truck) => !q || `${t.id} ${t.carrier} ${t.load}`.toLowerCase().includes(q.toLowerCase());
  const col = (loc: Loc) => dock.inLoc(loc).filter(match);
  const activeTruck = trucks.find((t) => t.id === active);

  const drop = (e: DragEndEvent) => {
    setActive(null);
    const t = trucks.find((x) => x.id === String(e.active.id));
    if (!t || !e.over) return;
    const to = String(e.over.id) as Loc;
    const from = dock.locOf(t);
    if (to === from) return;
    if ((to === "out" && t.dir !== "Outbound") || (to === "in" && t.dir !== "Inbound")) {
      setToast({ text: `${t.id} is ${t.dir.toLowerCase()}. Use the ${t.dir.toLowerCase()} bays.` }); return;
    }
    if ((to === "out" || to === "in") && dock.inLoc(to).length >= CAP) {
      setToast({ text: `All ${to === "out" ? "outbound" : "inbound"} bays are busy.` }); return;
    }
    const bayNo = to === "out" || to === "in" ? BAY_BASE[to] + dock.inLoc(to).length : 0;
    dock.move(t.id, to);
    const text = to === "departed" ? `${t.id} · ${t.carrier} departed` : to === "hold" ? `${t.id} put on hold`
      : to === "queue" ? `${t.id} back in the yard queue` : `${t.id} assigned to bay ${bayNo}`;
    setToast({ text, undo: () => { dock.move(t.id, from); setToast(null); } });
  };

  const bayNote = (loc: "out" | "in") => `${dock.inLoc(loc).length}/${CAP} bays used`;

  return (
    <>
      <div className="dock-tools">
        <Segmented value={view} options={["Board", "List"] as const} onChange={setView} label="Dock view" />
        <SearchBox value={q} onChange={setQ} placeholder="Search truck or carrier…" />
        <button className="btn" onClick={() => { dock.reset(); setToast(null); }}>Reset</button>
      </div>

      {view === "Board" ? (
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={(e) => setActive(String(e.active.id))} onDragEnd={drop} onDragCancel={() => setActive(null)}>
          <div className="pboard">
            <Column id="queue" title="Yard queue" dot="navy" count={col("queue").length} hint="No trucks waiting">
              {col("queue").map((t) => <DragTruck key={t.id} t={t} loc="queue" bay={null} onOpen={onOpen} />)}
            </Column>
            <Column id="out" title="Outbound bays 1–4" dot="yellow" count={dock.inLoc("out").length} cap={CAP} hint="Drop an outbound truck on a free bay">
              {col("out").map((t) => <DragTruck key={t.id} t={t} loc="out" bay={dock.bayOf(t)} onOpen={onOpen} />)}
            </Column>
            <Column id="in" title="Inbound bays 5–8" dot="green" count={dock.inLoc("in").length} cap={CAP} hint="Drop an inbound truck on a free bay">
              {col("in").map((t) => <DragTruck key={t.id} t={t} loc="in" bay={dock.bayOf(t)} onOpen={onOpen} />)}
            </Column>
          </div>
          <div className="pdrops">
            <Zone id="departed" kind="good" title="Departed" sub="Drop a truck here when it leaves the site" trucks={dock.inLoc("departed")} onReturn={(t) => dock.move(t.id, "queue")} />
            <Zone id="hold" kind="hold" title="On hold" sub="Drop a truck here to pause it, for example a quality or paperwork issue" trucks={dock.inLoc("hold")} onReturn={(t) => dock.move(t.id, "queue")} />
          </div>
          <p className="dock-note">{bayNote("out")} outbound · {bayNote("in")} inbound</p>
          <DragOverlay dropAnimation={{ duration: 180 }}>
            {activeTruck ? <TruckCard t={activeTruck} loc={dock.locOf(activeTruck)} bay={dock.bayOf(activeTruck)} overlay /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Truck</th><th>Carrier</th><th>Direction</th><th>Load</th><th>Where</th><th>Status</th></tr></thead>
            <tbody>
              {trucks.filter(match).map((t) => {
                const loc = dock.locOf(t), s = statusOf(t, loc);
                return (
                  <motion.tr layout key={t.id} className="clickable" tabIndex={0} onClick={() => onOpen(t)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(t); }}>
                    <td className="mono">{t.id}</td><td className="strong">{t.carrier}</td><td>{t.dir}</td><td>{t.load}</td>
                    <td className="mono">{whereLabel(loc, dock.bayOf(t))}</td><td><Chip tone={s.tone}>{s.label}</Chip></td>
                  </motion.tr>
                );
              })}
              {!trucks.filter(match).length && <tr><td colSpan={6} className="empty">No trucks match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.2 }}>
            <span>{toast.text}</span>
            {toast.undo && <button onClick={toast.undo}><Undo2 size={14} />Undo</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function DockSummary({ trucks, dock }: { trucks: Truck[]; dock: Dock }) {
  const rows: { label: string; n: number; of: number; color: string }[] = useMemo(() => [
    { label: "Yard queue", n: dock.inLoc("queue").length, of: trucks.length, color: "#2f4a9e" },
    { label: "Outbound bays", n: dock.inLoc("out").length, of: CAP, color: "#ffc20e" },
    { label: "Inbound bays", n: dock.inLoc("in").length, of: CAP, color: "#34d399" },
    { label: "Departed", n: dock.inLoc("departed").length, of: trucks.length, color: "#2dd4bf" },
    { label: "On hold", n: dock.inLoc("hold").length, of: trucks.length, color: "#ff9f43" },
  ], [trucks, dock.inLoc]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="row-kv">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="kv-line"><span>{r.label}</span><b>{r.n} of {r.of}</b></div>
          <Bar pct={r.of ? (r.n / r.of) * 100 : 0} color={r.color} />
        </div>
      ))}
    </div>
  );
}
