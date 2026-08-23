import { db } from "./db";
import { GALLERY_PAGE_SIZE } from "../../constants/pageSizes";

export type PhotoRow = {
  id: number;
  s3Key: string;
  originalFilename: string | null;
  thumbKey: string | null;
  createdAt: string;
  likes: number;
  tier: number | null;
};

export type GalleryQuery = {
  page?: number;
  tiers?: number[];
  sort?: string;
};

export type GalleryResult = {
  photos: PhotoRow[];
  totalPages: number;
  currentPage: number;
};

function orderBy(sort: string) {
  switch (sort) {
    case "oldest":
      return `"Photo"."createdAt" ASC`;
    case "random":
      return "RANDOM()";
    case "most_liked":
      return `COALESCE(like_counts."like_count", 0)::INTEGER DESC, "Photo"."createdAt" DESC`;
    default:
      return `"Photo"."createdAt" DESC`;
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
  sort = "newest",
}: GalleryQuery): Promise<GalleryResult> {
  const currentPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const offset = (currentPage - 1) * GALLERY_PAGE_SIZE;
  const cleanTiers = tiers.filter((tier) => Number.isInteger(tier));

  const photoParams: unknown[] = [GALLERY_PAGE_SIZE, offset];
  let where = "";
  if (cleanTiers.length) {
    where = `WHERE "Photo"."tier" IN (${cleanTiers
      .map((_, index) => `$${index + 3}`)
      .join(", ")})`;
    photoParams.push(...cleanTiers);
  }

  const photos = await db<PhotoRow>(
    `SELECT "Photo"."id", "Photo"."s3Key", "Photo"."thumbKey", "Photo"."originalFilename", "Photo"."createdAt",
        COALESCE(like_counts."like_count", 0)::INTEGER AS "likes", "Photo"."tier"
       FROM "Photo"
       LEFT JOIN (
           SELECT "photoId", COUNT(*)::INTEGER AS "like_count"
           FROM "Like"
           GROUP BY "photoId"
       ) AS like_counts
       ON "Photo"."id" = like_counts."photoId"
       ${where}
       ORDER BY ${orderBy(sort)}
       LIMIT $1 OFFSET $2`,
    photoParams
  );

  const countWhere = cleanTiers.length
    ? `WHERE "Photo"."tier" IN (${cleanTiers.map((_, index) => `$${index + 1}`).join(", ")})`
    : "";
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
