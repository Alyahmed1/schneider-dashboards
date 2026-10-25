# Smart Water Desalination dashboard

A demo dashboard for a sea-water reverse osmosis (SWRO) plant: 120,000 m³/day, three RO trains. All numbers are sample data.

Tabs: Overview (the whole plant on one screen), Operations (the full process drawn from sea to network), Production (one picture per stage with clickable tags and Start/Stop, On/Off), Electrical (single-line diagram with standard symbols), Insights (sustainability, benchmarks and the cost of water with what-if sliders), and Maintenance (work-order board and predictive maintenance). A full Alarms page opens from the bell. Every tab fits one screen.

## Run it

```
npm install
npm run dev
```

Open http://localhost:4725

Build for hosting: `npm run build` (output in `dist/`).

## Notes

- Stack: Vite, React, TypeScript, Recharts, Framer Motion.
- Light and dark mode, chosen on the cover screen or with the sun/moon button.
- `public/cover.mp4` is the looping cover video. If it is missing, the cover falls back to a still photo with light animation.
- The cover video was made with a free Kling plan and carries its watermark; replace it before any commercial use.

