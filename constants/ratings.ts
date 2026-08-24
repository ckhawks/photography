/**
 * The six ratings the film reviewer produces, and what each means here.
 *
 * The rating is the judgement; the tier is what the site does with it. Tier
 * stays a column because the gallery, its filter chips and every existing
 * query are built on it — but it is DERIVED, so the two can never disagree.
 *
 * Order runs worst to best. `rank` sorts photos inside an album: great above
 * good above okay, rather than by upload order.
 */
export type RatingId = "dontshow" | "okay" | "good" | "great" | "excellent" | "amazing";

export type Rating = {
  id: RatingId;
  label: string;
  rank: number;
  /** 0 is the hidden tier: on the site, but shown nowhere public */
  tier: 0 | 1 | 2 | 3;
  where: string;
};

export const RATINGS: Rating[] = [
  { id: "dontshow", label: "Don't show", rank: 0, tier: 0, where: "hidden from the site" },
  { id: "okay", label: "Okay", rank: 1, tier: 1, where: "album only, behind Want more?" },
  { id: "good", label: "Good", rank: 2, tier: 1, where: "album, and Extras on the wall" },
  { id: "great", label: "Great", rank: 3, tier: 1, where: "top of the album, and Extras" },
  { id: "excellent", label: "Excellent", rank: 4, tier: 2, where: "Notable, on the wall" },
  { id: "amazing", label: "Amazing", rank: 5, tier: 3, where: "Showcase, on the wall" },
];

const BY_ID = new Map(RATINGS.map((rating) => [rating.id, rating]));

export const ratingById = (id?: string | null) => (id ? BY_ID.get(id as RatingId) : undefined);

/** Photos with no rating keep whatever tier they were given by hand. */
export function tierForRating(id?: string | null) {
  const rating = ratingById(id);
  return rating ? rating.tier : null;
}

/** Tier 0 is the hidden one; every public query filters it out. */
export const HIDDEN_TIER = 0;

export function rankForRating(id?: string | null) {
  return ratingById(id)?.rank ?? -1;
}

/**
 * Okay is published but never shown outright: it appears behind its album's
 * "Want more?" and is kept off the gallery wall even when Extras is on, where
 * great and good do appear.
 */
export const TUCKED_AWAY_RATING = "okay";
export const isTuckedAway = (id?: string | null) => id === TUCKED_AWAY_RATING;
