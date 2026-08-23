/**
 * Where the prints sit in a shoot's pile on the Albums page.
 *
 * Fixed arrangements picked by album id, never randomised at load: random
 * placement rearranges the page on every visit, which reads as instability
 * rather than charm. Several arrangements exist so no two neighbouring shoots
 * look stamped from the same template.
 *
 * Coordinates are px inside the pile box: `left` from its left edge,
 * `offsetY` from its vertical centre. `drift` names the direction the
 * print loosens in on hover; the CSS module owns the actual movement.
 */
export type PilePosition = {
  /** how big this print is, as the side of an equivalent square. Prints are
   *  sized by AREA, not width: a landscape frame is wider and shorter than a
   *  portrait of the same size, instead of shrinking to fit one width. */
  size: number;
  left: number;
  /** nudge from the pile's centre line, so every print reads as vertically
   *  centred while the pile still looks dropped rather than aligned */
  offsetY: number;
  rotate: number;
  z: number;
  drift: "a" | "b" | "c" | "d" | "e";
};

export const PILE_LAYOUTS: PilePosition[][] = [
  [
    { size: 104, left: 18, offsetY: 12, rotate: -11, z: 1, drift: "a" },
    { size: 86, left: 96, offsetY: -12, rotate: 7, z: 2, drift: "b" },
    { size: 130, left: 150, offsetY: 2, rotate: -2, z: 4, drift: "c" },
    { size: 98, left: 258, offsetY: -14, rotate: 13, z: 3, drift: "d" },
    { size: 90, left: 352, offsetY: 16, rotate: 3, z: 2, drift: "e" },
  ],
  [
    { size: 92, left: 4, offsetY: -6, rotate: 6, z: 2, drift: "b" },
    { size: 108, left: 74, offsetY: 14, rotate: -9, z: 1, drift: "a" },
    { size: 120, left: 168, offsetY: -14, rotate: 2, z: 4, drift: "c" },
    { size: 88, left: 276, offsetY: 12, rotate: -5, z: 3, drift: "e" },
    { size: 100, left: 348, offsetY: -8, rotate: 11, z: 2, drift: "d" },
  ],
  [
    { size: 88, left: 10, offsetY: 10, rotate: 4, z: 1, drift: "e" },
    { size: 102, left: 78, offsetY: -10, rotate: 12, z: 3, drift: "d" },
    { size: 116, left: 166, offsetY: 8, rotate: -3, z: 4, drift: "c" },
    { size: 94, left: 268, offsetY: -16, rotate: -10, z: 2, drift: "a" },
    { size: 90, left: 356, offsetY: 6, rotate: 8, z: 2, drift: "b" },
  ],
  [
    { size: 98, left: 6, offsetY: 0, rotate: 9, z: 2, drift: "d" },
    { size: 124, left: 84, offsetY: 12, rotate: -4, z: 4, drift: "c" },
    { size: 86, left: 200, offsetY: -12, rotate: 14, z: 3, drift: "b" },
    { size: 104, left: 268, offsetY: 6, rotate: -8, z: 1, drift: "a" },
    { size: 92, left: 366, offsetY: -10, rotate: 5, z: 2, drift: "e" },
  ],
];

export function pileLayoutFor(albumId: number) {
  return PILE_LAYOUTS[albumId % PILE_LAYOUTS.length];
}

/** Longest edge a print may reach, whatever its aspect: a panorama should not
 *  run across the whole pile. */
export const MAX_PRINT_EDGE = 190;

/**
 * Print box for a photo in a slot: equal visual area regardless of shape.
 * Without stored dimensions the aspect is unknown, so it falls back to a
 * square-ish box the CSS then fits the photo inside.
 */
export function printBox(spot: PilePosition, photo: { width?: number | null; height?: number | null }) {
  const area = spot.size * spot.size;
  const aspect = photo.width && photo.height ? photo.width / photo.height : 1;
  const scale = Math.min(1, MAX_PRINT_EDGE / Math.sqrt(area * Math.max(aspect, 1 / aspect)));

  return {
    width: Math.round(Math.sqrt(area * aspect) * scale),
    height: Math.round(Math.sqrt(area / aspect) * scale),
  };
}
