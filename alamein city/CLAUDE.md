# New Alamein City COC dashboard: project notes for Claude

A demo City Operations Center dashboard for New Alamein City, built from `C:\Users\Aly ahmed\Desktop\COC.xlsx` (a Bill of Quantities, Arabic and English) and the master plan picture in this folder. Owner: Aly Ahmed. Aly works approve-first and pushes only when told.

## Run it
- Double-click `start-dashboard.bat`, or `npm install` once and `npm run dev`. Open http://localhost:4750 (4721 to 4728, 4731, 4732, 4740, 4741 belong to the other dashboards).
- Check: `npx tsc --noEmit`, build: `npm run build`. `?tab=surveillance` (or any tab id) opens a tab directly and skips the cover.
- Stack: Vite, React 19, TypeScript, Recharts, Framer Motion, Lucide. Same pattern as `telal-west-ai-city`.

## What is real and what is sample
- REAL (Excel): the 25 BoQ lines and the sizing numbers (156,360 meters, 30 operators, 1,600 poles, 5,000 water sensors, 1,000 bins, 50 bus stations, 1,690 signage screens, 1,000 parking lots, 14,000 IBMS points, 50,000 citizen units, 31 workstations, 5 years). In `src/data.ts`.
- SAMPLE: zone shares, live readings, alerts, the North Coast road data, bus routes and timings, diagrams' splits. Everything that moves is generated in `src/model.ts` and `src/state.tsx` and labelled "sample" on screen.
- The Excel price column is EMPTY. The Scope tab (price cells, cost pivot, roadmap) was REMOVED at Aly's request (2026-11-25); never invent prices. The BoQ stays in `data.ts` only to feed the Assistant. Excel problems it can still tell: ADMS twice, 30 operators vs 31 workstations, "Workstaks" typo, one merged quantity cell for three cyber lines.

## Decisions (Aly approved)
- Top navigation bar, no sidebar. 8 tabs plus an Assistant: Overview, Master Plan, Utilities, Mobility, Environment, Citizens, Security, Surveillance, Assistant. The old camera surveillance was REMOVED (not in the BoQ); the new Surveillance tab (2026-11-25, replaces Scope) is a 6-screen camera wall of the North Coast road: simulated 3D cameras (Three.js, `Scene3D.tsx`, real lane dimensions: 3 x 3.65 m lanes, 2.5 m shoulder, 4 m median), 8 cameras (`cams.ts`, 6 on screen, pick any per screen, full screen per camera), faults driven by `road.ts` incidents (accident, fog, sandstorm, stopped vehicle, breakdown, roadworks, queue, wrong-way, pothole, lamp, lens dust, VMS offline), AI detection boxes, day/night, and VMS integration (`vms.ts`: each road section has a message sign shown in the 3D scene, auto message from the faults or a manual one published from the VMS panel; one sign is offline on purpose). All sample, labelled "simulated feed". 6 of the 14 cameras are LIVE PHOTOS (`PhotoCam.tsx`, `photos.ts`, images `public/cam-p1..p6.png` from Aly's photos, credit "Mahmoud Yousef" on one; add ?cambug to the address to draw the traced lanes): the photo breathes, cloud shadows pass, cars/people/rain are drawn on it in perspective along traced lanes and paths, with AI boxes, faults (stopped car, pedestrian crossing, debris, heavy rain) and night grading; the 8 other cameras are 3D and still selectable per screen. The wall default is the six photos P1 to P6. A camera can play a real stream if `stream` is set in `cams.ts`. The old schematic map code (`terrain.ts`, `RoadBase.tsx`, `road.ts` geometry) is no longer shown on this tab but `road.ts` still feeds the data.
- Mobility is a live transit map on the master plan picture (`transit.ts`): 5 sample bus routes traced on the picture's roads with exactly 50 stations (the real Excel number), 23 moving buses, route picker, play/pause, traffic and parking layers, bus and station details. Both maps use `PanZoom.tsx` (drag, wheel zoom, buttons, double-click resets).
- Logos: Schneider (green, transparent) and AVEVA (white in dark mode, official purple in light mode), top bar only, not on the cover. Never change their colours.
- Light and dark theme (`src/tokens.css`). Global filters: zone and time range. Live refresh every 8 s. Assistant is rule-based (`src/engine.ts`), no API.
- Every tab fits one screen without scrolling from 1280x720 up (rules at the end of `src/app.css`); phones and short screens scroll. Lists scroll inside their own panel.
- KPI cards are deliberately big (Aly asked). Chart animation is off on purpose (charts must appear instantly).

## Pending
- Cover video: Aly is generating it on Kling (start frame is the master plan). When it arrives save it as `public/cover.mp4`; `Cover.tsx` already plays it, with `public/cover-still.jpg` as the fallback.
- LIVE at https://alamein-city-coc.vercel.app (0044b2d, 8ae6040 pushed earlier). The Scope removal, the Surveillance tab and the new Mobility map (2026-11-25) are local only: not committed, not pushed, not deployed until Aly tests them and says so.

## Gotchas
- Zone polygons and the device-dot placement are traced by eye on the 1327x682 image (`ZONES` in `data.ts`); dots are illustrative.
- Recharts ignores axes wrapped in a React fragment; keep `XAxis`/`YAxis` as direct children.
- Windows is case-insensitive: do not name a data file like a component.
