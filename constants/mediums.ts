/**
 * The two things a photo can have been shot on.
 *
 * `Photo.medium` is free of any tier or rating meaning — it says what the frame
 * came off, nothing about whether it is good. That is why it filters on its own
 * axis rather than joining the tier chips: the two questions are unrelated, and
 * a row of six mixed options would read as one filter.
 */
export const MEDIUMS = [
  { id: "film", label: "Film" },
  { id: "digital", label: "Digital" },
] as const;

export type MediumId = (typeof MEDIUMS)[number]["id"];

/** Whatever arrives in a query string, reduced to a medium or nothing. */
export function mediumFromParam(value: unknown): MediumId | null {
  return MEDIUMS.some((medium) => medium.id === value) ? (value as MediumId) : null;
}
