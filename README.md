# Smart Water Desalination dashboard

A demo dashboard for a sea-water reverse osmosis (SWRO) plant: 120,000 m³/day, three RO trains. All numbers are sample data.

Tabs: Home (an Egypt and Red Sea map with four supply zones, a summary of the plant and its charts), Overview (two views: the whole process drawn in 3D-style from sea to network with live readings and the quality of the drinking water, and Operations, the detailed process with clickable tags), Production (one picture per stage with clickable tags and Start/Stop, On/Off), Electrical (single-line diagram with standard symbols), and Maintenance (work-order board and predictive maintenance). A full Alarms page opens from the bell or from the alarm button on Home. The tabs sit in a bar at the bottom of the screen, with a breadcrumb at the top. Every tab fits one screen on a laptop; on a phone the page scrolls.

## Run it

```
npm install
npm run dev
```

Open http://localhost:4726

Build for hosting: `npm run build` (output in `dist/`).

## Notes

- Stack: Vite, React, TypeScript, Recharts, Framer Motion.
- Dark is the main look (flat navy panels, cyan accent, Segoe UI with Open Sans as the fallback). A matching light mode is chosen on the cover screen or with the sun/moon button. All colours and fonts are set in `src/theme.css`.
- `public/cover.mp4` is the looping cover video. If it is missing, the cover falls back to a still photo with light animation.
- The cover video was made with a free Kling plan and carries its watermark; replace it before any commercial use.

