import { db } from "./db";
import { GALLERY_PAGE_SIZE } from "../../constants/pageSizes";
import { HIDDEN_TIER, TUCKED_AWAY_RATING } from "../../constants/ratings";

export type PhotoRow = {
  id: number;
  s3Key: string;
  originalFilename: string | null;
  thumbKey: string | null;
  width: number | null;
  height: number | null;
  medium: string | null;
  camera: string | null;
  lens: string | null;
  filmStock: string | null;
  rating: string | null;
  exif: { aperture?: number; shutter?: string; iso?: number; focalLength?: number } | null;
  albumId?: number | null;
  albumSlug?: string | null;
  albumTitle?: string | null;
  createdAt: string;
  likes: number;
  tier: number | null;
};

export type GalleryQuery = {
  page?: number;
  tiers?: number[];
  sort?: string;
  /** carried in the URL so a shuffle holds still across pages */
  seed?: string;
};

export type GalleryResult = {
  photos: PhotoRow[];
  totalPages: number;
  currentPage: number;
};

/**
 * `seedParam` is the placeholder holding the shuffle seed, e.g. "$4".
 *
 * RANDOM() cannot be used with pagination: it re-rolls per page, so photos
 * appear twice and others never appear at all. Hashing the id with a seed
 * that rides in the URL gives an order that is arbitrary but fixed for a
 * visit.
 */
function orderBy(sort: string, seedParam: string) {
  switch (sort) {
    case "newest":
      return `"Photo"."createdAt" DESC`;
    case "oldest":
      return `"Photo"."createdAt" ASC`;
    case "most_liked":
      return `COALESCE(like_counts."like_count", 0)::INTEGER DESC, "Photo"."createdAt" DESC`;
    default:
      // shuffled, because upload order is not an argument about quality: a
      // batch of 300 would otherwise bury everything that came before it
      // the cast matters: Postgres cannot infer a parameter's type inside md5()
      return `md5("Photo"."id"::text || ${seedParam}::text)`;
  }
}

/**
 * The gallery query, in one place so the page can call it directly instead of
 * having the server component fetch its own API route over HTTP.
 *
 * Each statement builds its own parameter list rather than sharing a numbering
 * scheme across two separately assembled WHERE clauses.
 */
export async function getGalleryPhotos({
  page = 1,
  tiers = [],
  sort = "shuffle",
  seed = "",
}: GalleryQuery): Promise<GalleryResult> {
  const currentPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const offset = (currentPage - 1) * GALLERY_PAGE_SIZE;
  // the hidden tier is never servable, whatever the query string asks for
  const cleanTiers = tiers.filter((tier) => Number.isInteger(tier) && tier !== HIDDEN_TIER);

  // Extras on the wall means great and good, never okay: okay lives behind its
  // album's "Want more?" and nowhere else.
  const notTucked = `"Photo"."rating" IS DISTINCT FROM '${TUCKED_AWAY_RATING}'`;

  const photoParams: unknown[] = [GALLERY_PAGE_SIZE, offset];
  let where = `WHERE ${notTucked}`;
  if (cleanTiers.length) {
    where += ` AND "Photo"."tier" IN (${cleanTiers
      .map((_, index) => `$${index + 3}`)
      .join(", ")})`;
    photoParams.push(...cleanTiers);
  }

  // the seed is bound only when the order actually uses it: an unused
  // parameter is a bind error, not something Postgres ignores
  const shuffling = !["newest", "oldest", "most_liked"].includes(sort);
  if (shuffling) photoParams.push(seed);
  const seedParam = `$${photoParams.length}`;

  const photos = await db<PhotoRow>(
    `SELECT "Photo"."id", "Photo"."s3Key", "Photo"."thumbKey", "Photo"."originalFilename", "Photo"."createdAt",
        "Photo"."width", "Photo"."height", "Photo"."medium", "Photo"."camera", "Photo"."lens",
        "Photo"."filmStock", "Photo"."exif", "Photo"."rating",
        "Photo"."albumId", "Album"."slug" AS "albumSlug", "Album"."title" AS "albumTitle",
        COALESCE(like_counts."like_count", 0)::INTEGER AS "likes", "Photo"."tier"
       FROM "Photo"
       LEFT JOIN (
           SELECT "photoId", COUNT(*)::INTEGER AS "like_count"
           FROM "Like"
           GROUP BY "photoId"
       ) AS like_counts
       ON "Photo"."id" = like_counts."photoId"
       LEFT JOIN "Album" ON "Album"."id" = "Photo"."albumId"
           AND "Album"."visibility" <> 'draft'
       ${where}
       ORDER BY ${orderBy(sort, seedParam)}
       LIMIT $1 OFFSET $2`,
    photoParams
  );

  const countWhere = cleanTiers.length
    ? `WHERE ${notTucked} AND "Photo"."tier" IN (${cleanTiers
        .map((_, index) => `$${index + 1}`)
        .join(", ")})`
    : `WHERE ${notTucked}`;
  const countRows = await db<{ count: string }>(
    `SELECT COUNT(*) FROM "Photo" ${countWhere}`,
    cleanTiers
  );

  const totalCount = parseInt(countRows[0]?.count ?? "0", 10);

  return {
    photos,
    totalPages: Math.ceil(totalCount / GALLERY_PAGE_SIZE),
    currentPage,
  };
}
