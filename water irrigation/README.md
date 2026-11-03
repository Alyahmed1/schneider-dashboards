# Smart Agriculture dashboard

A demo dashboard for a desert farm at Wadi El Natrun: 1,200 feddan under 8 centre pivots fed by 3 pump stations, plus the landscape of the headquarters grounds and a grey water recycling plant. All numbers are sample data.

Three tabs (bottom dock), each with sub-tabs under the breadcrumb:

- **Agricultural**: Farm map, Pivots, Pump stations, Weather & ET, Water & energy
- **Landscape** (sensors and controllers): Zones, Sensors, Controllers
- **Grey Water**: Process, Reuse & savings

Alarms open from the bell. The top bar also has Light/Dark, an Export menu (CSV downloads and print), and an offline assistant button in the breadcrumb row that answers from the dashboard's own data. The start screen asks for Light or Dark before entering.

## Run it

```
npm install
npm run dev
```

Open http://localhost:4731 (build for hosting with `npm run build`, output in `dist/`).

## Notes

- Stack: Vite, React 19, TypeScript, Recharts, Framer Motion, lucide-react.
- Look: same flat control-room style as the water dashboards (Segoe UI, square corners, bottom tab dock, breadcrumb bar), with a green accent. Every colour is a variable at the top of `src/theme.css`.
- `src/farm.ts`, `src/landscape.ts` and `src/grey.ts` are the data models. Soil moisture, pump flows, valve runs and the grey water tanks are worked out hour by hour, so the maps, KPIs, charts and alarms agree.
- Every view fits one screen on a laptop (no sideways crop, nothing overlaying). Below 1100px wide, or with the assistant docked on a small screen, the page scrolls and the panels stack.
- `public/cover.mp4` is the looping cover video. Until it exists, the cover shows `public/cover.png` with a slow push-in.
