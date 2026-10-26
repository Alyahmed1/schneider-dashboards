export type Tone = "ok" | "watch" | "alert";
export type RangeKey = "7" | "30" | "90";
export type ChartKind = "line" | "bar" | "donut";

export type Spot = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type Kpi = {
  label: string;
  note: string;
  suffix: string;
  lowerIsBetter?: boolean;
  values: Record<RangeKey, number>;
  deltas: Record<RangeKey, number>;
};

export type Point = { label: string; value: number };

export type Slice = { name: string; value: number };

export type Row = { name: string; detail: string; tone: Tone };

export type Zone = {
  id: string;
  title: string;
  blurb: string;
  status: Tone;
  statusLabel: string;
  chart: ChartKind;
  chartLabel: string;
  unit: string;
  spots: Spot[];
  kpis: Kpi[];
  series: Record<RangeKey, Point[]>;
  donut?: Record<RangeKey, Slice[]>;
  rows: Record<RangeKey, Row[]>;
};

const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function line(values: number[], labels = week): Point[] {
  return values.map((value, index) => ({
    label: labels[index] ?? `${index + 1}`,
    value,
  }));
}

const month = ["W1", "W2", "W3", "W4", "W5", "W6"];
const quarter = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

export const ranges: { id: RangeKey; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
];

export const FAST_ZONE_IDS = new Set([
  "surveillance",
  "datacenter",
  "buses",
  "smartgates",
  "power",
  "water",
]);

export const zones: Zone[] = [
  {
    id: "surveillance",
    title: "Surveillance",
    blurb: "Cameras and open incidents in the terminal.",
    status: "watch",
    statusLabel: "Needs a look",
    chart: "line",
    chartLabel: "Incidents each day",
    unit: "incidents",
    spots: [
      { left: 2.5, top: 17, width: 25, height: 20 },
    ],
    kpis: [
      {
        label: "Cameras online",
        note: "of 260 fitted",
        suffix: "",
        values: { "7": 248, "30": 251, "90": 246 },
        deltas: { "7": 1.2, "30": 0.8, "90": -0.4 },
      },
      {
        label: "Open incidents",
        note: "still waiting on a check",
        suffix: "",
        lowerIsBetter: true,
        values: { "7": 4, "30": 11, "90": 27 },
        deltas: { "7": -12, "30": 6, "90": 9 },
      },
      {
        label: "Avg. response",
        note: "from alert to someone on site",
        suffix: " min",
        lowerIsBetter: true,
        values: { "7": 6.5, "30": 7.1, "90": 7.8 },
        deltas: { "7": -8, "30": 3, "90": 5 },
      },
    ],
    series: {
      "7": line([2, 1, 3, 1, 4, 2, 1]),
      "30": line([8, 6, 11, 9, 7, 10], month),
      "90": line([22, 18, 25, 19, 21, 24], quarter),
    },
    rows: {
      "7": [
        { name: "Hall B", detail: "1 camera offline since this morning", tone: "watch" },
        { name: "Belt 2", detail: "Bag left unattended, staff sent", tone: "alert" },
        { name: "Door C3", detail: "Held open for 4 minutes, now shut", tone: "ok" },
      ],
      "30": [
        { name: "Hall B", detail: "3 offline events this month", tone: "watch" },
        { name: "Belt 2", detail: "6 unattended-bag checks", tone: "watch" },
        { name: "Door C3", detail: "2 door-held alerts, both closed", tone: "ok" },
      ],
      "90": [
        { name: "Hall B", detail: "9 offline events this quarter", tone: "watch" },
        { name: "Belt 2", detail: "14 unattended-bag checks", tone: "alert" },
        { name: "Door C3", detail: "5 door-held alerts", tone: "ok" },
      ],
    },
  },
  {
    id: "datacenter",
    title: "Data center",
    blurb: "How busy the airport computers are.",
    status: "ok",
    statusLabel: "Running",
    chart: "line",
    chartLabel: "Load through the day",
    unit: "% load",
    spots: [
      { left: 52, top: 15, width: 18, height: 13 },
    ],
    kpis: [
      {
        label: "Uptime",
        note: "time the center stayed up",
        suffix: "%",
        values: { "7": 99.98, "30": 99.95, "90": 99.91 },
        deltas: { "7": 0.01, "30": 0.02, "90": -0.03 },
      },
      {
        label: "Servers ok",
        note: "of 48 racks answering",
        suffix: "",
        values: { "7": 47, "30": 46, "90": 47 },
        deltas: { "7": 2.1, "30": 0, "90": 2.1 },
      },
      {
        label: "Peak load",
        note: "busiest hour",
        suffix: "%",
        lowerIsBetter: true,
        values: { "7": 71, "30": 78, "90": 84 },
        deltas: { "7": -4, "30": 6, "90": 8 },
      },
    ],
    series: {
      "7": line([54, 61, 58, 71, 66, 49, 44]),
      "30": line([62, 68, 74, 71, 77, 69], month),
      "90": line([66, 70, 73, 78, 81, 76], quarter),
    },
    rows: {
      "7": [
        { name: "Rack 12", detail: "One server restarted last night", tone: "watch" },
        { name: "Cooling", detail: "Room at 21°C, in range", tone: "ok" },
        { name: "Backup", detail: "Last copy finished at 02:10", tone: "ok" },
      ],
      "30": [
        { name: "Rack 12", detail: "2 restarts this month", tone: "watch" },
        { name: "Cooling", detail: "Stayed inside 19–23°C", tone: "ok" },
        { name: "Backup", detail: "30 nightly copies, 0 missed", tone: "ok" },
      ],
      "90": [
        { name: "Rack 12", detail: "4 restarts this quarter", tone: "watch" },
        { name: "Cooling", detail: "One warm afternoon in April", tone: "ok" },
        { name: "Backup", detail: "90 nightly copies, 1 rerun", tone: "ok" },
      ],
    },
  },
  {
    id: "fiveg",
    title: "Private 5G",
    blurb: "The airport’s own network, not the public one.",
    status: "ok",
    statusLabel: "Strong",
    chart: "line",
    chartLabel: "Delay in milliseconds",
    unit: "ms",
    spots: [
      { left: 73, top: 2, width: 25, height: 13 },
    ],
    kpis: [
      {
        label: "Devices connected",
        note: "radios, gates, and buses",
        suffix: "",
        values: { "7": 1840, "30": 1912, "90": 1766 },
        deltas: { "7": 4.4, "30": 6.1, "90": 2.2 },
      },
      {
        label: "Delay",
        note: "lower is smoother",
        suffix: " ms",
        lowerIsBetter: true,
        values: { "7": 12, "30": 14, "90": 15 },
        deltas: { "7": -8, "30": 5, "90": 7 },
      },
      {
        label: "Coverage",
        note: "terminal and airside",
        suffix: "%",
        values: { "7": 98, "30": 97, "90": 96 },
        deltas: { "7": 1, "30": 0, "90": -1 },
      },
    ],
    series: {
      "7": line([11, 13, 12, 14, 12, 10, 11]),
      "30": line([13, 12, 15, 14, 16, 13], month),
      "90": line([14, 13, 15, 16, 15, 14], quarter),
    },
    rows: {
      "7": [
        { name: "Terminal", detail: "Signal strong on all floors", tone: "ok" },
        { name: "Airside", detail: "Apron radios all answering", tone: "ok" },
        { name: "Tower link", detail: "One short drop on Tuesday", tone: "watch" },
      ],
      "30": [
        { name: "Terminal", detail: "98% of checks were strong", tone: "ok" },
        { name: "Airside", detail: "2 radios replaced", tone: "ok" },
        { name: "Tower link", detail: "3 short drops this month", tone: "watch" },
      ],
      "90": [
        { name: "Terminal", detail: "Coverage held above 96%", tone: "ok" },
        { name: "Airside", detail: "6 radios swapped", tone: "ok" },
        { name: "Tower link", detail: "8 short drops this quarter", tone: "watch" },
      ],
    },
  },
  {
    id: "gates",
    title: "Gates and baggage",
    blurb: "Gates B1–B16, the claim hall, and ground rides.",
    status: "watch",
    statusLabel: "Bags building",
    chart: "bar",
    chartLabel: "Bags waiting at claim",
    unit: "bags",
    spots: [{ left: 1, top: 36, width: 18, height: 16 }],
    kpis: [
      {
        label: "Gates open",
        note: "of 16 in this pier",
        suffix: "",
        values: { "7": 14, "30": 13, "90": 14 },
        deltas: { "7": 0, "30": -7, "90": 0 },
      },
      {
        label: "Bags waiting",
        note: "still on the belt",
        suffix: "",
        lowerIsBetter: true,
        values: { "7": 86, "30": 110, "90": 94 },
        deltas: { "7": 14, "30": 22, "90": 9 },
      },
      {
        label: "Claim wait",
        note: "typical wait after landing",
        suffix: " min",
        lowerIsBetter: true,
        values: { "7": 18, "30": 22, "90": 20 },
        deltas: { "7": 6, "30": 12, "90": 4 },
      },
    ],
    series: {
      "7": line([40, 55, 72, 86, 64, 48, 36]),
      "30": line([70, 88, 110, 96, 84, 76], month),
      "90": line([80, 92, 101, 88, 94, 86], quarter),
    },
    rows: {
      "7": [
        { name: "Gate B4", detail: "Closed for a jet bridge check", tone: "watch" },
        { name: "Belt 1", detail: "86 bags, longest wait 18 min", tone: "watch" },
        { name: "Ground rides", detail: "12 buses waiting at the curb", tone: "ok" },
      ],
      "30": [
        { name: "Gate B4", detail: "Closed 6 days this month", tone: "watch" },
        { name: "Belt 1", detail: "Busiest week peaked at 140 bags", tone: "alert" },
        { name: "Ground rides", detail: "Curb stays under 15 minutes", tone: "ok" },
      ],
      "90": [
        { name: "Gate B4", detail: "Closed 11 days this quarter", tone: "watch" },
        { name: "Belt 1", detail: "Two holiday peaks over 150 bags", tone: "alert" },
        { name: "Ground rides", detail: "No curb holds over 20 minutes", tone: "ok" },
      ],
    },
  },
  {
    id: "airside",
    title: "Airside",
    blurb: "Runway and apron. Planes on the ground.",
    status: "ok",
    statusLabel: "On time",
    chart: "bar",
    chartLabel: "Planes on the apron",
    unit: "planes",
    spots: [{ left: 44, top: 27, width: 20, height: 9 }],
    kpis: [
      {
        label: "Planes on apron",
        note: "parked right now, as a daily average",
        suffix: "",
        values: { "7": 18, "30": 21, "90": 19 },
        deltas: { "7": -5, "30": 8, "90": 2 },
      },
      {
        label: "On-time share",
        note: "left within 15 minutes",
        suffix: "%",
        values: { "7": 91, "30": 87, "90": 88 },
        deltas: { "7": 3, "30": -2, "90": -1 },
      },
      {
        label: "Turnaround",
        note: "arrival to next departure",
        suffix: " min",
        lowerIsBetter: true,
        values: { "7": 42, "30": 46, "90": 45 },
        deltas: { "7": -4, "30": 6, "90": 3 },
      },
    ],
    series: {
      "7": line([16, 19, 22, 18, 17, 14, 12]),
      "30": line([18, 20, 24, 22, 19, 17], month),
      "90": line([17, 19, 21, 23, 20, 18], quarter),
    },
    rows: {
      "7": [
        { name: "Stand A2", detail: "Occupied, departure in 25 min", tone: "ok" },
        { name: "Stand A6", detail: "Empty and cleared", tone: "ok" },
        { name: "Runway 09", detail: "One 12-minute hold on Friday", tone: "watch" },
      ],
      "30": [
        { name: "Stand A2", detail: "Used on 28 of 30 days", tone: "ok" },
        { name: "Stand A6", detail: "Maintenance pad, 4 days blocked", tone: "watch" },
        { name: "Runway 09", detail: "6 holds, none over 20 minutes", tone: "ok" },
      ],
      "90": [
        { name: "Stand A2", detail: "Busiest stand this quarter", tone: "ok" },
        { name: "Stand A6", detail: "Closed 9 days for paint", tone: "watch" },
        { name: "Runway 09", detail: "On-time share stayed near 88%", tone: "ok" },
      ],
    },
  },
  {
    id: "buses",
    title: "Buses",
    blurb: "Airport buses. On time, and open driver alerts.",
    status: "watch",
    statusLabel: "A few alerts",
    chart: "line",
    chartLabel: "On-time share",
    unit: "% on time",
    spots: [
      { left: 73, top: 34, width: 25, height: 20 },
    ],
    kpis: [
      {
        label: "Buses out",
        note: "on a shift, daily average",
        suffix: "",
        values: { "7": 26, "30": 24, "90": 25 },
        deltas: { "7": 4, "30": -2, "90": 0 },
      },
      {
        label: "On-time share",
        note: "reached the stop within 3 min",
        suffix: "%",
        values: { "7": 93, "30": 89, "90": 90 },
        deltas: { "7": 2, "30": -3, "90": -1 },
      },
      {
        label: "Open alerts",
        note: "late start or speed warning",
        suffix: "",
        lowerIsBetter: true,
        values: { "7": 3, "30": 9, "90": 21 },
        deltas: { "7": -25, "30": 12, "90": 8 },
      },
    ],
    series: {
      "7": line([94, 96, 91, 88, 93, 95, 97]),
      "30": line([92, 90, 86, 88, 89, 91], month),
      "90": line([91, 90, 88, 87, 90, 92], quarter),
    },
    rows: {
      "7": [
        { name: "Route T1", detail: "All 8 buses on time today", tone: "ok" },
        { name: "Route T3", detail: "2 late starts at the depot", tone: "watch" },
        { name: "Speed warning", detail: "1 warning, driver coached", tone: "alert" },
      ],
      "30": [
        { name: "Route T1", detail: "96% on time this month", tone: "ok" },
        { name: "Route T3", detail: "7 late starts", tone: "watch" },
        { name: "Speed warning", detail: "2 warnings, both closed", tone: "watch" },
      ],
      "90": [
        { name: "Route T1", detail: "Best route this quarter", tone: "ok" },
        { name: "Route T3", detail: "14 late starts, mostly Mondays", tone: "watch" },
        { name: "Speed warning", detail: "7 warnings, all closed", tone: "ok" },
      ],
    },
  },
  {
    id: "lighting",
    title: "Street lighting",
    blurb: "Lamps on the roads around the terminal.",
    status: "ok",
    statusLabel: "Mostly on",
    chart: "bar",
    chartLabel: "Power used by the lamps",
    unit: "kWh",
    spots: [
      { left: 1, top: 62, width: 16, height: 12 },
    ],
    kpis: [
      {
        label: "Lights on",
        note: "of 640 poles at night",
        suffix: "",
        values: { "7": 628, "30": 619, "90": 624 },
        deltas: { "7": 1.1, "30": -0.4, "90": 0.6 },
      },
      {
        label: "Power used",
        note: "lamp power for the period",
        suffix: " kWh",
        lowerIsBetter: true,
        values: { "7": 4200, "30": 16800, "90": 49200 },
        deltas: { "7": -6, "30": -4, "90": -3 },
      },
      {
        label: "Faults",
        note: "poles that stayed dark",
        suffix: "",
        lowerIsBetter: true,
        values: { "7": 12, "30": 21, "90": 16 },
        deltas: { "7": -18, "30": 9, "90": -5 },
      },
    ],
    series: {
      "7": line([640, 610, 590, 620, 600, 580, 560]),
      "30": line([2500, 2700, 2900, 2800, 3000, 2900], month),
      "90": line([7600, 8100, 8400, 8200, 8600, 8300], quarter),
    },
    rows: {
      "7": [
        { name: "Ring road", detail: "628 of 640 poles answered", tone: "ok" },
        { name: "Car park road", detail: "8 dark poles, crew booked", tone: "watch" },
        { name: "Arrivals curb", detail: "All lamps on", tone: "ok" },
      ],
      "30": [
        { name: "Ring road", detail: "Uptime 98%", tone: "ok" },
        { name: "Car park road", detail: "21 dark-pole nights", tone: "watch" },
        { name: "Arrivals curb", detail: "No dark nights", tone: "ok" },
      ],
      "90": [
        { name: "Ring road", detail: "LED swap cut power by 3%", tone: "ok" },
        { name: "Car park road", detail: "Faults fell after March", tone: "ok" },
        { name: "Arrivals curb", detail: "Steady all quarter", tone: "ok" },
      ],
    },
  },
  {
    id: "parking",
    title: "Parking",
    blurb: "How full the lots are, and how many spots are free.",
    status: "watch",
    statusLabel: "Filling up",
    chart: "donut",
    chartLabel: "Free spots against taken spots",
    unit: "spots",
    spots: [
      { left: 36, top: 48, width: 16, height: 11 },
    ],
    kpis: [
      {
        label: "Free spots",
        note: "across P1, P2, and P3",
        suffix: "",
        values: { "7": 186, "30": 142, "90": 164 },
        deltas: { "7": 8, "30": -11, "90": -4 },
      },
      {
        label: "How full",
        note: "share of spots taken",
        suffix: "%",
        lowerIsBetter: true,
        values: { "7": 72, "30": 81, "90": 76 },
        deltas: { "7": -3, "30": 7, "90": 2 },
      },
      {
        label: "Search time",
        note: "from gate entry to a spot",
        suffix: " min",
        lowerIsBetter: true,
        values: { "7": 4, "30": 6, "90": 5 },
        deltas: { "7": -10, "30": 18, "90": 6 },
      },
    ],
    series: {
      "7": line([70, 74, 78, 81, 76, 68, 64]),
      "30": line([74, 77, 82, 84, 80, 76], month),
      "90": line([73, 75, 79, 83, 78, 74], quarter),
    },
    donut: {
      "7": [
        { name: "Free", value: 186 },
        { name: "Taken", value: 474 },
      ],
      "30": [
        { name: "Free", value: 142 },
        { name: "Taken", value: 518 },
      ],
      "90": [
        { name: "Free", value: 164 },
        { name: "Taken", value: 496 },
      ],
    },
    rows: {
      "7": [
        { name: "P1 Short stay", detail: "42 free of 200", tone: "watch" },
        { name: "P2 Long stay", detail: "110 free of 320", tone: "ok" },
        { name: "P3 Staff", detail: "34 free of 140", tone: "ok" },
      ],
      "30": [
        { name: "P1 Short stay", detail: "Full on 9 afternoons", tone: "alert" },
        { name: "P2 Long stay", detail: "Averaged 78% full", tone: "watch" },
        { name: "P3 Staff", detail: "Averaged 70% full", tone: "ok" },
      ],
      "90": [
        { name: "P1 Short stay", detail: "Tightest lot all quarter", tone: "watch" },
        { name: "P2 Long stay", detail: "Never hit 100%", tone: "ok" },
        { name: "P3 Staff", detail: "Steady near 72%", tone: "ok" },
      ],
    },
  },
  {
    id: "smartgates",
    title: "Smart gates",
    blurb: "How many people passed, and how many gates are working.",
    status: "ok",
    statusLabel: "Flowing",
    chart: "bar",
    chartLabel: "People through the gates",
    unit: "people",
    spots: [
      { left: 52, top: 55, width: 20, height: 13 },
    ],
    kpis: [
      {
        label: "People through",
        note: "counted at the gates",
        suffix: "",
        values: { "7": 84200, "30": 351000, "90": 980000 },
        deltas: { "7": 5, "30": 3, "90": 6 },
      },
      {
        label: "Gates working",
        note: "of 24 e-gates",
        suffix: "",
        values: { "7": 22, "30": 21, "90": 22 },
        deltas: { "7": 0, "30": -4, "90": 0 },
      },
      {
        label: "Pass time",
        note: "typical time in the lane",
        suffix: " sec",
        lowerIsBetter: true,
        values: { "7": 14, "30": 16, "90": 15 },
        deltas: { "7": -6, "30": 8, "90": 2 },
      },
    ],
    series: {
      "7": line([10200, 11800, 13400, 14100, 12600, 11200, 10900]),
      "30": line([52000, 58000, 61000, 64000, 60000, 56000], month),
      "90": line([150000, 162000, 170000, 168000, 166000, 164000], quarter),
    },
    rows: {
      "7": [
        { name: "Lane 3", detail: "Out of service since Thursday", tone: "watch" },
        { name: "Lane 8", detail: "Fastest lane, 11 seconds", tone: "ok" },
        { name: "Arrivals bank", detail: "22 of 24 gates working", tone: "ok" },
      ],
      "30": [
        { name: "Lane 3", detail: "Down 5 days for a sensor", tone: "watch" },
        { name: "Lane 8", detail: "Stayed the fastest lane", tone: "ok" },
        { name: "Arrivals bank", detail: "21 working on the slowest day", tone: "ok" },
      ],
      "90": [
        { name: "Lane 3", detail: "Sensor replaced in March", tone: "ok" },
        { name: "Lane 8", detail: "Pass time stayed under 16 sec", tone: "ok" },
        { name: "Arrivals bank", detail: "No day under 20 working gates", tone: "ok" },
      ],
    },
  },
  {
    id: "power",
    title: "Power",
    blurb: "Power the terminal used, and what was saved.",
    status: "ok",
    statusLabel: "Under plan",
    chart: "line",
    chartLabel: "Power used",
    unit: "MWh",
    spots: [
      { left: 74, top: 56, width: 24, height: 16 },
    ],
    kpis: [
      {
        label: "Power used",
        note: "terminal and airside",
        suffix: " MWh",
        lowerIsBetter: true,
        values: { "7": 86, "30": 352, "90": 1010 },
        deltas: { "7": -3, "30": -2, "90": -4 },
      },
      {
        label: "Saved",
        note: "against the old baseline",
        suffix: " MWh",
        values: { "7": 6.4, "30": 24, "90": 71 },
        deltas: { "7": 8, "30": 5, "90": 11 },
      },
      {
        label: "Meters ok",
        note: "of 120 smart meters",
        suffix: "",
        values: { "7": 118, "30": 117, "90": 118 },
        deltas: { "7": 0.8, "30": 0, "90": 0.8 },
      },
    ],
    series: {
      "7": line([12.4, 13.1, 12.8, 14.2, 11.6, 11.1, 10.8]),
      "30": line([56, 58, 61, 60, 59, 58], month),
      "90": line([160, 168, 172, 170, 174, 166], quarter),
    },
    rows: {
      "7": [
        { name: "Terminal HVAC", detail: "62% of this week’s power", tone: "ok" },
        { name: "Airside lights", detail: "Cut 4% after the new schedule", tone: "ok" },
        { name: "Meter 14", detail: "Not reporting since Monday", tone: "watch" },
      ],
      "30": [
        { name: "Terminal HVAC", detail: "Still the largest share", tone: "ok" },
        { name: "Airside lights", detail: "Saved 9 MWh this month", tone: "ok" },
        { name: "Meter 14", detail: "Dark for 6 days", tone: "watch" },
      ],
      "90": [
        { name: "Terminal HVAC", detail: "3% under the old baseline", tone: "ok" },
        { name: "Airside lights", detail: "Saved 28 MWh this quarter", tone: "ok" },
        { name: "Meter 14", detail: "Replaced in May", tone: "ok" },
      ],
    },
  },
];

export const water: Zone = {
  id: "water",
  title: "Water",
  blurb: "Water the terminal used, and what was saved.",
  status: "ok",
  statusLabel: "Under plan",
  chart: "line",
  chartLabel: "Water used",
  unit: "m3",
  spots: [],
  kpis: [
    {
      label: "Water used",
      note: "terminal and airside",
      suffix: " m3",
      lowerIsBetter: true,
      values: { "7": 640, "30": 2680, "90": 7920 },
      deltas: { "7": -2, "30": -1, "90": -3 },
    },
    {
      label: "Saved",
      note: "against the old baseline",
      suffix: " m3",
      values: { "7": 48, "30": 190, "90": 540 },
      deltas: { "7": 6, "30": 4, "90": 9 },
    },
    {
      label: "Meters ok",
      note: "of 40 water meters",
      suffix: "",
      values: { "7": 39, "30": 38, "90": 39 },
      deltas: { "7": 0, "30": -2, "90": 0 },
    },
  ],
  series: {
    "7": line([88, 94, 91, 97, 86, 84, 80]),
    "30": line([420, 440, 455, 448, 430, 418], month),
    "90": line([1240, 1310, 1360, 1330, 1290, 1270], quarter),
  },
  rows: {
    "7": [
      { name: "Terminal washrooms", detail: "41% of this week’s water", tone: "ok" },
      { name: "Cooling towers", detail: "Cut 3% after the new schedule", tone: "ok" },
      { name: "Meter W7", detail: "Not reporting since Tuesday", tone: "watch" },
    ],
    "30": [
      { name: "Terminal washrooms", detail: "Still the largest share", tone: "ok" },
      { name: "Cooling towers", detail: "Saved 70 m3 this month", tone: "ok" },
      { name: "Meter W7", detail: "Dark for 4 days", tone: "watch" },
    ],
    "90": [
      { name: "Terminal washrooms", detail: "2% under the old baseline", tone: "ok" },
      { name: "Cooling towers", detail: "Saved 210 m3 this quarter", tone: "ok" },
      { name: "Meter W7", detail: "Replaced in June", tone: "ok" },
    ],
  },
};
