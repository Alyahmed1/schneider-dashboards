# New Alamein City COC dashboard: project notes for Claude

A demo City Operations Center dashboard for New Alamein City, built from `C:\Users\Aly ahmed\Desktop\COC.xlsx` (a Bill of Quantities, Arabic and English) and the master plan picture in this folder. Owner: Aly Ahmed. Aly works approve-first and pushes only when told.

## Run it
- Double-click `start-dashboard.bat`, or `npm install` once and `npm run dev`. Open http://localhost:4750 (4721 to 4728, 4731, 4732, 4740, 4741 belong to the other dashboards).
- Check: `npx tsc --noEmit`, build: `npm run build`. `?tab=scope` (or any tab id) opens a tab directly and skips the cover.
- Stack: Vite, React 19, TypeScript, Recharts, Framer Motion, Lucide. Same pattern as `telal-west-ai-city`.

## What is real and what is sample
- REAL (Excel): the 25 BoQ lines and the sizing numbers (156,360 meters, 30 operators, 1,600 poles, 5,000 water sensors, 1,000 bins, 50 bus stations, 1,690 signage screens, 1,000 parking lots, 14,000 IBMS points, 50,000 citizen units, 31 workstations, 5 years). In `src/data.ts`.
- SAMPLE: zone shares, live readings, alerts, roadmap, diagrams' splits. Everything that moves is generated in `src/model.ts` and `src/state.tsx` and labelled "sample" on screen.
- The Excel price column is EMPTY. Prices are editable cells on the Scope tab (saved in localStorage); totals and the cost pivot update from them. Never invent prices.
- Excel problems flagged on the Scope tab: ADMS twice, 30 operators vs 31 workstations, "Workstaks" typo, one merged quantity cell for three cyber lines.

## Decisions (Aly approved)
- Top navigation bar, no sidebar. 8 tabs plus an Assistant: Overview, Master Plan, Utilities, Mobility, Environment, Citizens, Security, Scope, Assistant. Camera surveillance was added and then REMOVED at Aly's request (it is not in the BoQ).
- Logos: Schneider (green, transparent) and AVEVA (white in dark mode, official purple in light mode), top bar only, not on the cover. Never change their colours.
- Light and dark theme (`src/tokens.css`). Global filters: zone and time range. Live refresh every 8 s. Assistant is rule-based (`src/engine.ts`), no API.
- Every tab fits one screen without scrolling from 1280x720 up (rules at the end of `src/app.css`); phones and short screens scroll. Lists scroll inside their own panel.
- KPI cards are deliberately big (Aly asked). Chart animation is off on purpose (charts must appear instantly).

## Pending
- Cover video: Aly is generating it on Kling (start frame is the master plan). When it arrives save it as `public/cover.mp4`; `Cover.tsx` already plays it, with `public/cover-still.jpg` as the fallback.
- Not committed, not pushed, not deployed. Hosting (new GitHub folder commit and a NEW Vercel project) only when Aly says so.

## Gotchas
- Zone polygons and the device-dot placement are traced by eye on the 1327x682 image (`ZONES` in `data.ts`); dots are illustrative.
- Recharts ignores axes wrapped in a React fragment; keep `XAxis`/`YAxis` as direct children.
- Windows is case-insensitive: do not name a data file like a component.
