/* The Esri street map, recoloured for dark mode: the land becomes the dashboard's own dark blue, text and outlines turn light,
   and coloured roads, parks and water melt into the land, so the map is a quiet blue backdrop. Done per tile on a canvas, so it needs no extra map service. */
import L from "leaflet";

type RGB = [number, number, number];
export type DarkLook = "quiet" | "rich" | "sky";
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** quiet: a navy backdrop with nothing but faint outlines and names (Home). rich: a lighter blue with the streets drawn in light blue (Network Map). */
const LOOK: Record<DarkLook, { stops: [number, RGB][]; roads: boolean }> = {
  /** light mode: a pale blue-grey background, white side streets, main roads in light blue, dark names */
  sky: { roads: true, stops: [[0, [30, 46, 72]], [0.45, [92, 118, 152]], [0.68, [150, 178, 212]], [0.78, [204, 222, 240]], [0.94, [222, 236, 250]], [0.965, [226, 239, 251]], [1, [255, 255, 255]]] },
  quiet: { roads: false, stops: [[0, [196, 210, 240]], [0.45, [112, 130, 178]], [0.68, [40, 48, 86]], [0.76, [22, 30, 58]], [1, [22, 30, 58]]] },
  rich: { roads: true, stops: [[0, [226, 238, 250]], [0.45, [160, 192, 226]], [0.68, [84, 124, 170]], [0.76, [42, 78, 116]], [0.965, [42, 78, 116]], [1, [74, 114, 156]]] },
};
const ramp = (stops: [number, RGB][], l: number): RGB => {
  for (let i = 1; i < stops.length; i++) if (l <= stops[i][0]) { const [l0, c0] = stops[i - 1], [l1, c1] = stops[i]; return mix(c0, c1, (l - l0) / (l1 - l0)); }
  return stops[stops.length - 1][1];
};

function recolour(d: Uint8ClampedArray, look: DarkLook) {
  const { stops, roads } = LOOK[look];
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const s = mx === 0 ? 0 : (mx - mn) / mx, l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const base = ramp(stops, l);
    let out = base;
    if (roads) {
      const k = smooth(0.12, 0.26, s) * (1 - smooth(0.8, 0.9, l)); // coloured roads (pale tan patches count as land)
      const warm = r >= g * 0.95 && r > b;
      if (warm) out = look === "sky" ? mix(base, [58, 150, 236], Math.min(1, k * 1.5)) : mix(base, [96 + l * 50, 146 + l * 50, 196 + l * 40], k);
      else if (look === "sky") out = mix(base, [r, g, b], k * 0.85); // parks and water keep their own colour
    }
    d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2];
  }
}

/** a tile layer that draws the Esri street map in the dashboard's dark blue */
export function darkStreetLayer(url: string, attribution: string, maxNativeZoom: number, look: DarkLook): L.GridLayer {
  const Layer = (L.GridLayer as unknown as { extend: (o: object) => new (o: object) => L.GridLayer }).extend({
    createTile(this: L.GridLayer & { _url: string }, coords: L.Coords, done: L.DoneCallback) {
      const tile = document.createElement("canvas");
      tile.width = tile.height = 256;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const ctx = tile.getContext("2d")!;
        ctx.drawImage(img, 0, 0, 256, 256);
        try { const im = ctx.getImageData(0, 0, 256, 256); recolour(im.data, look); ctx.putImageData(im, 0, 0); } catch { /* tile could not be read: it stays as drawn */ }
        done(undefined, tile);
      };
      img.onerror = () => done(undefined, tile);
      img.src = L.Util.template(this._url, { z: coords.z, x: coords.x, y: coords.y });
      return tile;
    },
  });
  const layer = new Layer({ attribution, maxNativeZoom, maxZoom: 18, tileSize: 256 });
  (layer as unknown as { _url: string })._url = url;
  return layer;
}
