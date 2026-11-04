import L from "leaflet";

/** where the fictional farm and the headquarters sit, in real Wadi El Natrun coordinates, so the satellite picture is real */
export const FARM_C = { lat: 30.42, lng: 30.35 };
/** Madinaty, New Cairo: the Landscape map is a real gated compound (Central Park, the club, the mosque, villa blocks).
 *  Zones are traced on a picture of the map at zoom 17 that is 1100 x 800 px with its centre at MAD_C, so each corner is a pixel position. */
export const MAD_C = { lat: 30.0954, lng: 31.635 };
const MPP = 1.0334; // metres per pixel at zoom 17 at this latitude
export const px = (x: number, y: number): L.LatLngTuple => at(MAD_C, (x - 550) * MPP, (400 - y) * MPP);

/** metres east (x) and north (y) of a centre point, as a map position */
export const at = (c: { lat: number; lng: number }, x: number, y: number): L.LatLngTuple => [
  c.lat + y / 111_320,
  c.lng + x / (111_320 * Math.cos((c.lat * Math.PI) / 180)),
];
export const bounds = (pts: L.LatLngTuple[]) => L.latLngBounds(pts);

/** a pivot's circle: 150 feddan is 630,000 m², so the radius is about 448 m */
export const radiusOf = (feddan: number) => Math.sqrt((feddan * 4200) / Math.PI);
