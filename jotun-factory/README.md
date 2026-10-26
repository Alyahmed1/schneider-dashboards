# Jotun Smart Factory Dashboard

A React + Vite demo dashboard for a paint factory: live-style monitoring of the production process, equipment, quality, utilities, maintenance, logistics and alerts, with a drag-and-drop dock bay board.

## Stack

React 19, TypeScript, Vite, Framer Motion, Recharts, dnd-kit, lucide-react.

## Run locally

```bash
npm install
npm run dev      # http://localhost:4724
```

```bash
npm run build    # type-check + production build into dist/
npm run preview  # serve the build on port 4724
```

## Pages

Overview, Process, Equipment, Quality, Utilities, Maintenance, Logistics (dock board), Alerts.

All data is simulated (`src/data.ts`, `src/live.tsx`) for demo purposes.

