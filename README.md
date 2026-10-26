# Telal West AI City dashboard

A demo "AI City" command center for the Telal West development (PRE Group, 380 feddan, New Zayed), built from the New Zayed development brief. Real facts from the brief (areas, boundary lengths, drive times) are used as printed. Every live number is sample data.

Images are AI-generated and are presented for concept illustration only.

## Run it

```
npm install
npm run dev
```

Open http://localhost:4728

Build for hosting: `npm run build` (output in `dist/`).

## Notes

- Stack: Vite, React, TypeScript, Recharts, Framer Motion.
- Look: cream, deep green and gold (sampled from the brief) with serif headings; a dark mode is the toggle. All colours and fonts are in `src/tokens.css`.
- `reference/` holds the pages of the client's PDF for working only; it is git-ignored and not published.
- Cover: put the looping aerial video at `public/cover.mp4`; until it exists the cover shows `public/cover-still.jpg` with a slow push-in.
- The master plan is traced from the brief's colour zoning map into `src/planGeometry.ts` (generated, not hand-edited). Zone areas are measured from the drawing: commercial is the printed 76 feddan and the other zones share the printed 304.
- Utilities (energy with what-if sliders, water with leak detection) and Assets (predictive maintenance with PDF and CSV export, shared work orders) are built on small sample models in `src/energymodel.ts`, `src/watermodel.ts` and `src/assetdata.ts`.
- Status: Phase 3 done (Home, Master Plan, Mobility, Utilities, Assets). Safety, Assistant and Platform come in phase 4.
