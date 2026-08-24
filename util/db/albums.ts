import { db } from "./db";
import type { PhotoRow } from "./photos";
import { HIDDEN_TIER, isTuckedAway, RATINGS } from "../../constants/ratings";

export type AlbumRow = {
  id: number;
  slug: string;
  title: string;
  shootDate: string | Date;
  visibility: string;
  showCull: boolean;
  photoCount: number;
};

export type AlbumWithPreview = AlbumRow & { preview: PhotoRow[] };

// how many prints the pile on the Albums page shows
export const PREVIEW_COUNT = 5;

const PUBLIC_VISIBILITY = ["public", "unlisted"];

/**
 * Albums for the Albums page, newest first, each with a handful of photos for
 * its pile. Draft albums never appear; unlisted ones are reachable by link but
 * are not listed here either.
 */
export async function getAlbumsWithPreviews(): Promise<AlbumWithPreview[]> {
  const albums = await db<AlbumRow>(
    `SELECT a."id", a."slug", a."title", a."shootDate", a."visibility", a."showCull",
        COUNT(p."id")::INTEGER AS "photoCount"
       FROM "Album" a
       LEFT JOIN "Photo" p ON p."albumId" = a."id" AND p."tier" <> ${HIDDEN_TIER}
      WHERE a."visibility" = 'public'
      GROUP BY a."id"
      ORDER BY a."shootDate" DESC, a."id" DESC`
  );

  if (!albums.length) return [];

  // one query for every pile rather than one per album
  const preview = await db<PhotoRow & { albumId: number }>(
    `SELECT "id", "albumId", "s3Key", "thumbKey", "originalFilename", "createdAt", "tier", "width", "height"
       FROM (
         SELECT p.*,
             ROW_NUMBER() OVER (
               PARTITION BY p."albumId"
               ORDER BY p."tier" DESC NULLS LAST, p."id" ASC
             ) AS rank
           FROM "Photo" p
          WHERE p."albumId" = ANY($1) AND p."tier" <> ${HIDDEN_TIER}
       ) ranked
      WHERE rank <= $2`,
    [albums.map((album) => album.id), PREVIEW_COUNT]
  );

  const byAlbum = new Map<number, PhotoRow[]>();
  for (const photo of preview) {
    const list = byAlbum.get(photo.albumId) ?? [];
    list.push(photo);
    byAlbum.set(photo.albumId, list);
  }

  return albums.map((album) => ({ ...album, preview: byAlbum.get(album.id) ?? [] }));
}

/**
 * One album and its photos. Draft albums return null so the page 404s; unlisted
 * ones resolve, which is what makes a link shareable without listing it.
 */
export type AlbumSort = "best" | "chronological";

export async function getAlbumBySlug(slug: string, sort: AlbumSort = "best") {
  const [album] = await db<AlbumRow>(
    `SELECT a."id", a."slug", a."title", a."shootDate", a."visibility", a."showCull",
        COUNT(p."id")::INTEGER AS "photoCount"
       FROM "Album" a
       LEFT JOIN "Photo" p ON p."albumId" = a."id" AND p."tier" <> ${HIDDEN_TIER}
      WHERE a."slug" = $1 AND a."visibility" = ANY($2)
      GROUP BY a."id"`,
    [slug, PUBLIC_VISIBILITY]
  );

  if (!album) return null;

  // best first: amazing, excellent, great, good, then okay.
  //
  // Tier leads and the rating breaks ties inside it, rather than the other way
  // round. Tier is derived from the rating, so for anything the film reviewer
  // has been through the two orders agree — but the older digital photos carry
  // a tier and no rating at all, and ranking by rating first buried every one of
  // them below the rated frames. New York City is the case that showed it: two
  // showcase photos, unrated, landing under a `good`.
  const rankCases = RATINGS.map((rating) => `WHEN '${rating.id}' THEN ${rating.rank}`).join(" ");

  // The ORDER BY and its parameters are built together on purpose: the two
  // sorts do not take the same number of placeholders, and passing a param the
  // clause does not mention makes pg reject the bind outright.
  const [orderBy, params] =
    sort === "chronological"
      ? // when it was taken where that is known, otherwise when it arrived:
        // film carries no capture time, and its upload order follows the roll
        [`COALESCE(p."takenAt", p."createdAt") ASC, p."id" ASC`, [album.id]]
      : // best first, and shuffled inside each band, because frame order is
        // the order the film came out of the camera rather than an argument
        // about which is better. Seeded on the album so the album looks the
        // same on every visit instead of rearranging under the viewer.
        [
          `p."tier" DESC NULLS LAST,
             (CASE p."rating" ${rankCases} ELSE NULL END) DESC NULLS LAST,
             md5(p."id"::text || $2::text)`,
          [album.id, album.slug],
        ];

  const photos = await db<PhotoRow>(
    `SELECT p."id", p."s3Key", p."thumbKey", p."originalFilename", p."createdAt", p."tier",
        p."width", p."height", p."medium", p."camera", p."lens", p."filmStock", p."exif",
        p."rating", p."beforeS3Key",
        COALESCE(like_counts."like_count", 0)::INTEGER AS "likes"
       FROM "Photo" p
       LEFT JOIN (
           SELECT "photoId", COUNT(*)::INTEGER AS "like_count"
             FROM "Like"
            WHERE "unlikedAt" IS NULL
            GROUP BY "photoId"
       ) AS like_counts ON p."id" = like_counts."photoId"
      WHERE p."albumId" = $1 AND p."tier" <> ${HIDDEN_TIER}
      ORDER BY ${orderBy}`,
    params
  );

  // okay is published but not shown outright: it sits behind "Want more?"
  return {
    album,
    photos: photos.filter((photo) => !isTuckedAway(photo.rating)),
    more: photos.filter((photo) => isTuckedAway(photo.rating)),
  };
}
