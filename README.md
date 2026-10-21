# Smart Water Desalination dashboard

A demo dashboard for a sea-water reverse osmosis (SWRO) plant: 120,000 m³/day, three RO trains. All numbers are sample data.

Tabs: Command Center, Overview (whole process on one screen), Production (one picture per stage with clickable tags and Start/Stop, On/Off), Electrical (single-line diagram), Sustainability, Benchmarks, Financials (what-if sliders), Maintenance (work-order board), and a full Alarms page opened from the bell.

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
- The AVEVA wordmark is a vector traced from a screenshot, not the official artwork.
