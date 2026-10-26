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
- Safety is a simulated camera wall: the views are pictures from the brief, the detection boxes are drawn and move along paths (`src/camdata.ts`); no real video or people. Assistant answers come from rules over the dashboard's own sample data (`src/assistantengine.ts`); a production version would hand that data to a language model as tools. Platform is a reference architecture diagram with sample rates.
- Guided tour: the Guided tour button (or the cover's second button) plays a 12-step, about 100-second walkthrough of all eight tabs with captions; arrow keys step, Space pauses, Esc closes. Open the site with `?story=1` to start it automatically, e.g. for screen recording. The tour's steps and the commands each tab listens for are in `src/storytour.ts`.
- Layout: on laptops and desktops (width 1100 px or more, height 600 px or more) every tab fits the screen with no page scrolling, from 1280x720 up to 1920x1080 and beyond; panels share the height, maps and charts stretch, long lists scroll inside their panel (rules in src/fit.css). Phones and short screens use the normal scrolling page. Tested at 390x844, 844x390, 820x1180, 1280x720, 1366x768, 1440x900, 1536x864 and 1920x1080. Tabs other than Home load on demand and are preloaded after the first screen.
- Naming rule on Windows: never give a data file the same name as a component (assets.ts and Assets.tsx clash), hence `assetdata.ts`, `energymodel.ts`, `watermodel.ts`, `assistantengine.ts`, `storytour.ts`.
- Status: Phase 5 done (guided tour, polish, fit-to-screen). Next: launch video and hosting.
