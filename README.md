# Smart Wastewater Treatment dashboard

A demo dashboard for a municipal activated-sludge wastewater plant: 150,000 m³/day, three aeration lanes, anaerobic digestion and a biogas CHP unit. All numbers are sample data.

Forked from the Smart Water Desalination dashboard v2: same tabs (Home, Overview with Operations, Production, Electrical, Maintenance, Alarms), same font and flat style, new green-teal palette and a light start screen where the viewer must choose Light or Dark before entering.

Build status: Phases 0 to 5 done (fork, theme, cover; data model and wording; Home; Production pictures; Overview and Operations; Electrical single-line diagram). Phase 6 (water-specific animation pass, final QA) done.

## Run it

```
npm install
npm run dev
```

Open http://localhost:4727 (the desalination dashboard uses 4726).

## Cover media

Put the generated video at `public/cover.mp4`, or the still at `public/cover.jpg` (used when there is no video).
