# Smart Irrigation dashboard: project notes

Own Vite app (port 4731; 4730 is used by the water network preview) in the schneider-dashboards repo. Look and layout copy the water dashboards (`../water network`), but the CSS is one clean set: `theme.css` (tokens, chrome, shared parts), `agri.css` (farm map), `pumps.css`, `pivots.css`, `views.css` (Weather, Energy, Landscape, Process, tables, rings, assistant), `map.css` (the two real maps), `cover.css`. Do not add layered override files.

## Structure (agreed with Aly, 2026-11-02; changed 2026-11-04)
Only 2 dock tabs, each with sub-tabs in a bar under the breadcrumb. No Home, Maintenance or Grey Water tab.

| Tab | Sub-tabs |
|---|---|
| Agricultural | Farm map, Pivots, Pump stations, Weather & ET, Water & energy |
| Landscape | Zones, Sensors, Controllers, Grey water (view id `process`) |

Farm map: the picture `public/farm-map.jpg` (3.21:1, stretched to fill its box, `FarmImage.tsx`) with click areas over the 8 pivots and 3 pump stations; clicking a pivot opens the Pivots tab on that pivot (`go("pivots", id)`), a station opens Pump stations. Pivots is the original page again. Landscape Zones is a night-style real map of the HQ grounds (OpenStreetMap tiles with a CSS colour filter; glowing amber zones, one callout card per controller, day timeline with play and Now; click a zone: floating card). Farm map page = picture + Summary only. Grey water (`Process.tsx`) = grey water diagram + 5 gauges + reuse tiles + monthly chart on one screen (old Reuse & savings merged in). Coordinates are in `geo.ts` (fictional farm placed at real Wadi El Natrun; the Zones map is the real Madinaty compound in New Cairo: zones are polygons traced in pixel coordinates of a zoom-17 picture, `poly` in landscape.ts + `px()` in geo.ts). In dark mode a veil in the page background colour sits over the tiles (`.lf-tint`).

Alarms open from the bell (`ViewId "alarms"`, no tab). Routing: `App.tsx` holds `ViewId`, `go(view, target)`; the dock remembers the last sub-tab per tab.

## Decisions
- Project renamed Smart Agriculture -> Smart Irrigation (2026-11-04; Vercel project is still `waterirrigation`).
- Green accent (#4cc97a dark / #1f9d55 light) on navy-teal panels. Light/Dark chosen on the cover.
- Fictional farm: Wadi El Natrun, wheat, maize, alfalfa, potatoes (2 pivots each, 150 feddan each). Landscape = HQ grounds, 12 zones, 3 controllers, 23 sensors. Grey water = 68 m³/day plant feeding the landscape and fodder alfalfa.
- Cover: `public/cover.png` (done) and `public/cover.mp4` (Aly generates; the cover uses it automatically).
- Offline assistant (side panel, `askengine.ts`) and CSV/print export (`ExportMenu.tsx`) are built.

## Data model (everything reads from these, so screens agree)
- `farm.ts`: pivots (moisture hour by hour), pump stations and pump curves, forecast and advice, tariff and load profile, alarms, work-order assets.
- `landscape.ts`: zones, controllers (one valve open per controller, run in order from the start time), sensors.
- `grey.ts`: 15-minute simulation of the collection and storage tanks, quality parameters, reuse and savings.

## Phase log
- [x] Phase 0: scaffold, theme, chrome, cover
- [x] Phase 1: data model, alarms, live tick
- [x] Phase 2: Agricultural · Farm map
- [x] Phase 3: Agricultural · Pump stations (pump-by-pump diagrams, curves, start/stop)
- [x] Phase 4: Agricultural · Pivots, Weather & ET, Water & energy
- [x] Phase 5: Landscape (Zones, Sensors, Controllers), Grey Water (Process, Reuse), assistant, export
- [x] Change 2026-11-03: removed "Water applied by crop" (Summary fills the column); Controllers rebuilt as schedule + station panel + flow sensor from Aly's design (Update/Apply are message-only, flow limits are sample values)
- [x] Controllers fit without scrolling at the 4 laptop sizes (dark; events table capped at 8 rows, compact rules at the end of `views.css`)
- [x] Change 2026-11-04: rename, Farm map = picture (Pivots tab kept, map click goes to it), real map on Zones, Grey Water merged into Landscape · Process. Local only, not committed/deployed yet.
- [ ] Final QA at 1280x720, 1366x768, 1536x864, 1920x1080 + phone width (see below), then deploy if Aly asks

## Rules for new screens
- Fit the screen: panels `min-width/min-height: 0`, `overflow: hidden`; use `var(--fit)` for the page height; long tables scroll inside their own box (`.tbl`).
- SVG drawings never crop and never leave empty bands at the sides: each one measures its box with `useAspect` and lays itself out on a viewBox of the same shape (equipment spreads apart, text keeps its size). Grey Water Process is drawn as equipment symbols with instrument tags, not boxes.
- Never put a CSS `transform` animation on an SVG element that has a `transform` attribute (it replaces it). Animate opacity or a child group.
- Narrow widths (and a docked assistant) use `@container pg (max-width: 1100px)`: the page scrolls and the panels stack. Do not use viewport media queries for page layout.
- Check each view for page overflow, clipped panels, truncated text and overlapping SVG text, in both themes and all four times of day.

## Testing tip
In the headless browser, `requestAnimationFrame` can stall when the window is hidden, so framer-motion page changes and Playwright stability checks hang. Emulate reduced motion, click with `force`, and force frames with tiny `page.screenshot({ clip })` calls between steps.
