/* The real photos used as camera views. Each one carries a little geometry so moving traffic and people can be placed on it in perspective.
   All numbers are image pixels, traced by eye (add ?cambug to the page address to draw the lanes and clip shapes on top of the photos). */
export interface Lane {
  /** carriageway group (traffic in one group shares a clip shape) */
  g: number; dir: 1 | -1;
  /** where the lane meets the front of the picture, and the width of a car there in pixels */
  near: [number, number]; w: number;
  /** a curved lane: points from far to near. Without it the lane is a straight line from the vanishing point */
  pts?: [number, number][];
}
export interface PhotoCfg {
  src: string; w: number; h: number;
  /** which part of a tall picture is shown in a wide screen: 0 = top, 1 = bottom */
  fy: number; fx: number;
  kind: "road" | "plaza";
  vp?: [number, number]; z0?: number; lanes?: Lane[]; clip?: [number, number][][];
  walkers?: [number, number][][]; walkY0?: number; walkK?: number; far?: [number, number][];
  beacons?: [number, number][];
  rain?: boolean;
}

/** three equal lanes from an inner and an outer edge on the bottom row of the picture */
const ways = (g: number, dir: 1 | -1, yb: number, ib: number, ob: number): Lane[] =>
  [0, 1, 2].map((l) => ({ g, dir, near: [ib + ((ob - ib) * (l + 0.5)) / 3, yb] as [number, number], w: (Math.abs(ob - ib) / 3) * (1.8 / 3.65) }));

export const PHOTOS: Record<string, PhotoCfg> = {
  // towers boulevard: median with flowers, traffic on both sides
  p1: {
    src: "/cam-p1.png", w: 346, h: 437, fy: 0.7, fx: 0.5, kind: "road", vp: [176, 234], z0: 9,
    lanes: [...ways(0, -1, 437, 50, -400), ...ways(1, 1, 437, 312, 762)],
    clip: [[[0, 244], [170, 236], [50, 437], [0, 437]], [[182, 236], [346, 244], [346, 437], [312, 437]]],
  },
  // rainy lagoon promenade with towers
  p2: {
    src: "/cam-p2.png", w: 352, h: 447, fy: 0.8, fx: 0.5, kind: "plaza", rain: true, walkY0: 170, walkK: 0.21,
    walkers: [[[334, 438], [312, 365], [288, 318], [256, 282], [226, 258], [198, 246]], [[14, 410], [58, 352], [108, 302], [136, 266], [150, 248]]],
    far: [[172, 187], [214, 190], [262, 194], [326, 199]],
  },
  // palm avenue between apartment blocks
  p3: {
    src: "/cam-p3.png", w: 345, h: 202, fy: 0.5, fx: 0.5, kind: "road", vp: [178, 141], z0: 9,
    lanes: [...ways(0, -1, 202, 33, -222), ...ways(1, 1, 202, 290, 545)],
    clip: [[[0, 150], [168, 143], [33, 202], [0, 202]], [[190, 143], [345, 150], [345, 202], [290, 202]]],
  },
  // roadworks on a curving road: cones, workers, a barrier sign
  p4: {
    src: "/cam-p4.png", w: 350, h: 512, fy: 0.9, fx: 0.5, kind: "road", vp: [322, 298], z0: 9,
    lanes: [
      { g: 0, dir: -1, near: [20, 455], w: 46, pts: [[322, 298], [270, 318], [215, 342], [150, 380], [85, 418], [20, 455]] },
      { g: 1, dir: 1, near: [40, 490], w: 54, pts: [[346, 336], [290, 352], [230, 376], [165, 410], [100, 450], [40, 490]] },
    ],
    clip: [[[0, 384], [90, 368], [222, 322], [300, 300], [350, 296], [350, 512], [0, 512]], [[0, 384], [90, 368], [222, 322], [300, 300], [350, 296], [350, 512], [0, 512]]],
    walkers: [[[30, 340], [80, 334], [130, 327], [180, 319]]], walkY0: 250, walkK: 0.3,
    beacons: [[163, 337], [213, 308], [218, 296], [238, 306]],
  },
  // wide dual carriageway seen from a rooftop
  p5: {
    src: "/cam-p5.png", w: 346, h: 470, fy: 0.75, fx: 0.5, kind: "road", vp: [95, 306], z0: 9,
    lanes: [
      { g: 0, dir: -1, near: [346, 397], w: 34 }, { g: 0, dir: -1, near: [346, 414], w: 34 }, { g: 0, dir: -1, near: [346, 431], w: 34 },
      { g: 1, dir: 1, near: [346, 349], w: 22 }, { g: 1, dir: 1, near: [346, 361], w: 22 }, { g: 1, dir: 1, near: [346, 373], w: 22 },
    ],
    clip: [[[120, 312], [346, 388], [346, 446], [260, 420]], [[100, 302], [346, 336], [346, 380], [210, 326]]],
  },
  // aerial view of a boulevard
  p6: {
    src: "/cam-p6.png", w: 337, h: 232, fy: 0.5, fx: 0.5, kind: "road", vp: [176, 68], z0: 9,
    lanes: [
      { g: 0, dir: -1, near: [165, 232], w: 19 }, { g: 0, dir: -1, near: [135, 232], w: 19 }, { g: 0, dir: -1, near: [105, 232], w: 19 },
      { g: 1, dir: 1, near: [215, 232], w: 19 }, { g: 1, dir: 1, near: [245, 232], w: 19 }, { g: 1, dir: 1, near: [275, 232], w: 19 },
    ],
    clip: [[[160, 76], [172, 72], [186, 232], [88, 232], [128, 150]], [[180, 72], [194, 76], [304, 232], [204, 232]]],
  },
};
