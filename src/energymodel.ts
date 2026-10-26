// Energy model for the community: demand from the zones, solar, a battery and a flexible share of the load. Sample data only.
import { ZONES } from "./data";
import { zoneMw } from "./zonemodel";

/** price per kWh by hour (EGP, sample): cheap at night, dear in the evening peak */
export const tariff = (h: number) => (h < 6 ? 1.2 : h >= 17 && h < 22 ? 2.9 : 1.8);
export const isPeak = (h: number) => h >= 17 && h < 22;
export const GRID_CO2 = 0.45; // tonnes per MWh
/** the share of demand that can move in time: lagoon and irrigation pumps, EV charging, water heating */
export const FLEX = 0.12;

export interface EnergyIn { solarMwp: number; batteryMwh: number; shiftPct: number }
export interface Hour { h: number; label: string; base: number; demand: number; solar: number; discharge: number; charge: number; grid: number; soc: number }
export interface EnergyOut {
  hours: Hour[];
  baseCost: number; optCost: number; saving: number; savingPct: number;
  basePeak: number; optPeak: number; solarShare: number; mwhDay: number; co2: number; peakShifted: number; eveningCover: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const solarAt = (mwp: number, h: number) => (h > 5.5 && h < 18.5 ? mwp * Math.pow(Math.sin((Math.PI * (h - 5.5)) / 13), 1.4) * 0.82 : 0);

/** one day of the community's power, for a chosen solar field, battery and share of flexible load moved out of the peak */
export function simulate({ solarMwp, batteryMwh, shiftPct }: EnergyIn): EnergyOut {
  const base = Array.from({ length: 24 }, (_, h) => ZONES.reduce((s, z) => s + zoneMw(z.id, z.mw, h), 0));
  // move a share of the flexible load from the evening peak to the cheap night hours (the daily energy stays the same)
  const s = shiftPct / 100;
  const moved = base.reduce((sum, b, h) => sum + (isPeak(h) ? b * FLEX * s : 0), 0);
  const demand = base.map((b, h) => (isPeak(h) ? b * (1 - FLEX * s) : h < 6 ? b + moved / 6 : b));

  const P = batteryMwh / 3, eff = 0.92;
  let soc = batteryMwh * 0.3;
  let hours: Hour[] = [];
  for (let pass = 0; pass < 2; pass++) {
    hours = [];
    for (let h = 0; h < 24; h++) {
      const sol = solarAt(solarMwp, h), net = demand[h] - sol;
      let charge = 0, discharge = 0;
      if (batteryMwh > 0) {
        if (net < 0) charge = Math.min(-net, P, (batteryMwh - soc) / eff);
        else if (isPeak(h)) discharge = Math.min(net, P, soc * eff);
        else if (h < 6 && soc < batteryMwh * 0.85) charge = Math.min(P, (batteryMwh * 0.85 - soc) / eff);
        soc = clamp(soc + charge * eff - discharge / eff, 0, batteryMwh);
      }
      const grid = Math.max(0, demand[h] - sol - discharge + charge);
      hours.push({ h, label: `${String(h).padStart(2, "0")}:00`, base: base[h], demand: demand[h], solar: Math.min(sol, demand[h] + charge), discharge, charge, grid, soc });
    }
  }
  const cost = (f: (x: Hour) => number) => hours.reduce((sum, x) => sum + f(x) * 1000 * tariff(x.h), 0);
  const baseCost = cost((x) => x.base), optCost = cost((x) => x.grid);
  const mwhDay = hours.reduce((sum, x) => sum + x.demand, 0);
  const gridMwh = hours.reduce((sum, x) => sum + x.grid, 0), baseMwh = hours.reduce((sum, x) => sum + x.base, 0);
  const eveDemand = hours.filter((x) => isPeak(x.h)).reduce((sum, x) => sum + x.demand, 0);
  const eveGrid = hours.filter((x) => isPeak(x.h)).reduce((sum, x) => sum + x.grid, 0);
  return {
    hours, baseCost, optCost, saving: baseCost - optCost, savingPct: baseCost ? ((baseCost - optCost) / baseCost) * 100 : 0,
    basePeak: Math.max(...base), optPeak: Math.max(...hours.map((x) => x.grid)),
    solarShare: (hours.reduce((sum, x) => sum + x.solar, 0) / mwhDay) * 100,
    mwhDay, co2: (baseMwh - gridMwh) * GRID_CO2, peakShifted: moved,
    eveningCover: eveDemand ? (1 - eveGrid / eveDemand) * 100 : 0,
  };
}

export const DEFAULTS: EnergyIn = { solarMwp: 4, batteryMwh: 6, shiftPct: 25 };
