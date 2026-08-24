import { db, getPool } from "./db";
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
  wallRank?: number | null;
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
      // Pinned photos lead, in the order they were pinned; everything else is
      // shuffled behind them, because upload order is not an argument about
      // quality -- a batch of 300 would otherwise bury everything before it.
      // Ordering the first dozen therefore costs nothing on the other hundreds.
      // The cast matters: Postgres cannot infer a parameter's type inside md5()
      return `"Photo"."wallRank" ASC NULLS LAST, md5("Photo"."id"::text || ${seedParam}::text)`;
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
        COALESCE(like_counts."like_count", 0)::INTEGER AS "likes", "Photo"."tier", "Photo"."wallRank"
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

/**
 * The photos that can appear on the gallery wall, for the ordering screen.
 *
 * Same population the wall itself draws from -- showcase and notable, never an
 * okay -- but in a stable order rather than a seeded shuffle, because an
 * ordering screen that rearranges itself between visits is unusable. Pinned
 * photos come first in their pinned order, then the rest newest first.
 */
export async function getWallPhotos(): Promise<PhotoRow[]> {
  return db<PhotoRow>(
    `SELECT "Photo"."id", "Photo"."s3Key", "Photo"."thumbKey", "Photo"."originalFilename",
        "Photo"."createdAt", "Photo"."tier", "Photo"."rating", "Photo"."width", "Photo"."height",
        "Photo"."medium", "Photo"."filmStock", "Photo"."wallRank",
        "Album"."title" AS "albumTitle", "Album"."slug" AS "albumSlug",
        0 AS "likes"
       FROM "Photo"
       LEFT JOIN "Album" ON "Album"."id" = "Photo"."albumId"
      WHERE "Photo"."tier" IN (2, 3)
        AND "Photo"."rating" IS DISTINCT FROM '${TUCKED_AWAY_RATING}'
      ORDER BY "Photo"."wallRank" ASC NULLS LAST, "Photo"."id" DESC`
  );
}

/**
 * Replace the pinned order wholesale: the ids given become ranks 1..n and
 * every other photo goes back to unpinned. Wholesale rather than incremental
 * because "move this one to third" is a statement about the whole list, and
 * two half-applied edits would leave duplicate ranks behind.
 */
export async function setWallOrder(ids: number[]) {
  // One transaction, because the clear and the re-rank are one edit: a failure
  // between them would leave the wall unpinned with no way to tell that was an
  // accident.
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE "Photo" SET "wallRank" = NULL WHERE "wallRank" IS NOT NULL`);
    if (ids.length) {
      await client.query(
        `UPDATE "Photo" SET "wallRank" = pinned.ord
           FROM unnest($1::int[]) WITH ORDINALITY AS pinned(id, ord)
          WHERE "Photo"."id" = pinned.id`,
        [ids]
      );
    }
    await client.query("COMMIT");
    return ids.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type AdminQuery = {
  page?: number;
  pageSize?: number;
  albumId?: number | "none" | null;
  rating?: string | "none" | null;
  search?: string;
};

/**
 * Every photo, for the admin screens.
 *
 * Deliberately not the gallery query: this one must show what the public one
 * hides — the okays, and anything rated don't show — or they become
 * unreachable once rated.
 */
export async function getAdminPhotos({
  page = 1,
  pageSize = 60,
  albumId = null,
  rating = null,
  search = "",
}: AdminQuery) {
  const size = Math.min(Math.max(pageSize, 1), 240);
  const currentPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  const conditions: string[] = [];
  const params: unknown[] = [];

  // set when the search term is a photo id, so the exact photo can be sorted
  // above the filenames that merely contain the same digits
  let idParam: number | null = null;

  if (albumId === "none") conditions.push(`"Photo"."albumId" IS NULL`);
  else if (albumId) {
    params.push(albumId);
    conditions.push(`"Photo"."albumId" = $${params.length}`);
  }

  if (rating === "none") conditions.push(`"Photo"."rating" IS NULL`);
  else if (rating) {
    params.push(rating);
    conditions.push(`"Photo"."rating" = $${params.length}`);
  }

  if (search.trim()) {
    const term = search.trim();

    params.push(`%${term}%`);
    const like = params.length;
    const matches = [
      `"Photo"."originalFilename" ILIKE $${like}`,
      `"Photo"."camera" ILIKE $${like}`,
      `"Photo"."filmStock" ILIKE $${like}`,
    ];

    // The number under every tile is the photo id, so "179" or "#179" should
    // land on that photo. Bounded to int4 because anything larger is not an id
    // and Postgres would reject the comparison outright.
    const id = Number(term.replace(/^#/, ""));
    if (Number.isInteger(id) && id > 0 && id <= 2147483647) {
      params.push(id);
      idParam = params.length;
      matches.push(`"Photo"."id" = $${idParam}`);
    }

    conditions.push(`(${matches.join(" OR ")})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [{ count }] = await db<{ count: string }>(
    `SELECT COUNT(*) FROM "Photo" ${where}`,
    params
  );

  const photos = await db<PhotoRow>(
    `SELECT "Photo"."id", "Photo"."s3Key", "Photo"."thumbKey", "Photo"."originalFilename",
        "Photo"."createdAt", "Photo"."tier", "Photo"."rating", "Photo"."width", "Photo"."height",
        "Photo"."medium", "Photo"."camera", "Photo"."lens", "Photo"."filmStock", "Photo"."exif",
        "Photo"."albumId", "Photo"."wallRank", "Album"."title" AS "albumTitle", "Album"."slug" AS "albumSlug",
        COALESCE(like_counts."like_count", 0)::INTEGER AS "likes"
       FROM "Photo"
       LEFT JOIN "Album" ON "Album"."id" = "Photo"."albumId"
       LEFT JOIN (
           SELECT "photoId", COUNT(*)::INTEGER AS "like_count" FROM "Like" GROUP BY "photoId"
       ) AS like_counts ON "Photo"."id" = like_counts."photoId"
       ${where}
       ORDER BY ${idParam ? `("Photo"."id" = $${idParam}) DESC, ` : ""}"Photo"."id" DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, size, (currentPage - 1) * size]
  );

  return {
    photos,
    total: Number(count),
    totalPages: Math.max(1, Math.ceil(Number(count) / size)),
    currentPage,
  };
}
