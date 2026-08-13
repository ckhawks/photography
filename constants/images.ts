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
