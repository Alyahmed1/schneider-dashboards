/* The Esri street map, recoloured for dark mode: the land becomes the dashboard's own dark blue, text and outlines turn light,
   and the saturated roads (yellow and orange) keep their colour. Done per tile on a canvas, so it needs no extra map service. */
import L from "leaflet";

type RGB = [number, number, number];
/** luminance stops: text and outlines are light, land is the dashboard blue, white roads sit a step lighter than the land */
const STOPS: [number, RGB][] = [
  [0, [196, 218, 240]], [0.45, [112, 146, 182]], [0.68, [44, 72, 102]], [0.76, [15, 30, 46]], [0.965, [15, 30, 46]], [1, [58, 92, 126]],
];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ramp = (l: number): RGB => {
  for (let i = 1; i < STOPS.length; i++) if (l <= STOPS[i][0]) { const [l0, c0] = STOPS[i - 1], [l1, c1] = STOPS[i]; return mix(c0, c1, (l - l0) / (l1 - l0)); }
  return STOPS[STOPS.length - 1][1];
};
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function recolour(d: Uint8ClampedArray) {
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const s = mx === 0 ? 0 : (mx - mn) / mx, l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const k = smooth(0.12, 0.26, s) * (1 - smooth(0.8, 0.9, l)); // 0 = land, text and white roads, 1 = coloured road (pale tan patches count as land)
    const base = ramp(l);
    // coloured pixels: yellow and orange roads stay bright, green parks and blue water go dark
    const warm = r >= g * 0.95 && r > b;
    const keep = warm ? 1 : 0.5;
    d[i] = base[0] * (1 - k) + r * keep * k;
    d[i + 1] = base[1] * (1 - k) + g * keep * k;
    d[i + 2] = base[2] * (1 - k) + b * keep * k;
  }
}

/** a tile layer that draws the Esri street map in the dashboard's dark blue */
export function darkStreetLayer(url: string, attribution: string, maxNativeZoom: number): L.GridLayer {
  const Layer = (L.GridLayer as unknown as { extend: (o: object) => new (o: object) => L.GridLayer }).extend({
    createTile(this: L.GridLayer & { _url: string }, coords: L.Coords, done: L.DoneCallback) {
      const tile = document.createElement("canvas");
      tile.width = tile.height = 256;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const ctx = tile.getContext("2d")!;
        ctx.drawImage(img, 0, 0, 256, 256);
        try { const im = ctx.getImageData(0, 0, 256, 256); recolour(im.data); ctx.putImageData(im, 0, 0); } catch { /* tile could not be read: it stays as drawn */ }
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
