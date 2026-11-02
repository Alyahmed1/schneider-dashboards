# Smart Water Network dashboard

A demo dashboard for a city drinking-water network (New Cairo): about 150,000 m³/day, six supply zones, one elevated reservoir, 40 pipes and 24 instruments. All numbers are sample data.

Forked from the Smart Wastewater dashboard: same tabs, same font and flat style, blue palette, and a dark start screen where the viewer must choose Light or Dark.

## Tabs

- **Home**: the network map coloured by consumption, pressure or loss (night, morning peak, midday, evening), KPIs and charts.
- **Network Map**: every pipe and instrument, coloured by consumption, pressure, leakage or water age, with a 24-hour time slider.
- **Overview**: the supply chain from river to customer as a flow diagram.
- **Production**: one picture per stage with clickable tags.
- **Electrical**, **Maintenance**, **Alarms**: still being converted from the wastewater version (Phase 4).

## How the numbers hang together

`src/network.ts` is the model: zones, nodes, pipes, instruments, leaks and a small hydraulic solver (24-hour demand, flows, Hazen-Williams head loss, pressure, water age, chlorine). Every screen reads from it, so the map, the tables and the alarms agree.

## Run it

```
npm install
npm run dev
```

Open http://localhost:4729

## Cover media

`public/cover.mp4` is the looping cover video; `public/cover.png` is the still used until it loads or if it is missing.
