// Where photo bytes are served from.
//
// Unset: images go through /api/resource, which streams them out of the private
// bucket via a Vercel function. Every byte counts against Vercel bandwidth.
//
// Set to https://taste-images.stlr.cx: images come straight off the bucket
// through Cloudflare and never touch the app server. Requires the objects to be
// publicly readable.
const configuredBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL;

export const IMAGE_BASE_URL = configuredBase
  ? configuredBase.replace(/\/+$/, "")
  : "/api/resource";

export function imageUrl(s3Key: string) {
  return `${IMAGE_BASE_URL}/${s3Key.replace(/^\/+/, "")}`;
}

/**
 * The wall and the admin grid want the resized copy; the lightbox wants the
 * original. Photos uploaded before thumbnails existed have no thumbKey, so
 * this falls back to the original rather than showing nothing.
 */
export function thumbnailUrl(photo: { s3Key: string; thumbKey?: string | null }) {
  return imageUrl(photo.thumbKey || photo.s3Key);
}
