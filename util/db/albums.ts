import { db } from "./db";
import type { PhotoRow } from "./photos";

export type AlbumRow = {
  id: number;
  slug: string;
  title: string;
  shootDate: string | Date;
  visibility: string;
  showCull: boolean;
  photoCount: number;
  editedCount: number;
};

export type AlbumWithPreview = AlbumRow & { preview: PhotoRow[] };

// how many prints the pile on the Albums page shows
export const PREVIEW_COUNT = 5;

const PUBLIC_VISIBILITY = ["public", "unlisted"];

/**
 * Shoots for the Albums page, newest first, each with a handful of photos for
 * its pile. Draft shoots never appear; unlisted ones are reachable by link but
 * are not listed here either.
 */
export async function getAlbumsWithPreviews(): Promise<AlbumWithPreview[]> {
  const albums = await db<AlbumRow>(
    `SELECT a."id", a."slug", a."title", a."shootDate", a."visibility", a."showCull",
        COUNT(p."id")::INTEGER AS "photoCount",
        COUNT(p."id") FILTER (WHERE p."tier" IS NOT NULL)::INTEGER AS "editedCount"
       FROM "Album" a
       LEFT JOIN "Photo" p ON p."albumId" = a."id"
      WHERE a."visibility" = 'public'
      GROUP BY a."id"
      ORDER BY a."shootDate" DESC, a."id" DESC`
  );

  if (!albums.length) return [];

  // one query for every pile rather than one per shoot
  const preview = await db<PhotoRow & { albumId: number }>(
    `SELECT "id", "albumId", "s3Key", "thumbKey", "originalFilename", "createdAt", "tier", "width", "height"
       FROM (
         SELECT p.*,
             ROW_NUMBER() OVER (
               PARTITION BY p."albumId"
               ORDER BY p."tier" DESC NULLS LAST, p."id" ASC
             ) AS rank
           FROM "Photo" p
          WHERE p."albumId" = ANY($1)
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
 * One shoot and its photos. Draft shoots return null so the page 404s; unlisted
 * ones resolve, which is what makes a link shareable without listing it.
 */
export async function getAlbumBySlug(slug: string) {
  const [album] = await db<AlbumRow>(
    `SELECT a."id", a."slug", a."title", a."shootDate", a."visibility", a."showCull",
        COUNT(p."id")::INTEGER AS "photoCount",
        COUNT(p."id") FILTER (WHERE p."tier" IS NOT NULL)::INTEGER AS "editedCount"
       FROM "Album" a
       LEFT JOIN "Photo" p ON p."albumId" = a."id"
      WHERE a."slug" = $1 AND a."visibility" = ANY($2)
      GROUP BY a."id"`,
    [slug, PUBLIC_VISIBILITY]
  );

  if (!album) return null;

  const photos = await db<PhotoRow>(
    `SELECT p."id", p."s3Key", p."thumbKey", p."originalFilename", p."createdAt", p."tier",
        p."width", p."height", p."medium", p."camera", p."lens", p."filmStock", p."exif",
        COALESCE(like_counts."like_count", 0)::INTEGER AS "likes"
       FROM "Photo" p
       LEFT JOIN (
           SELECT "photoId", COUNT(*)::INTEGER AS "like_count"
             FROM "Like"
            GROUP BY "photoId"
       ) AS like_counts ON p."id" = like_counts."photoId"
      WHERE p."albumId" = $1
      ORDER BY p."tier" DESC NULLS LAST, p."id" ASC`,
    [album.id]
  );

  return { album, photos };
}
