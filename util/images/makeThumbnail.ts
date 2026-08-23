import sharp from "sharp";

// One size serves both layouts: grid tiles are 350px CSS and the column view
// is 1190px, so 1600px covers the wide layout on 1x and the grid well beyond
// 2x, while still cutting a 3.67 MB original to a couple of hundred KB.
export const THUMBNAIL_LONG_EDGE = 1600;
export const THUMBNAIL_QUALITY = 78;

export function thumbnailKeyFor(s3Key: string) {
  return s3Key.replace(/^uploads\//, "thumbs/").replace(/\.[^.]+$/, "") + ".webp";
}

/**
 * Resized copy of a photo for the gallery wall. webp because every browser that
 * can run this site supports it and it is roughly a third of the jpeg.
 *
 * Metadata is dropped in the process, which also strips any GPS the camera
 * wrote — worth knowing, since the originals still carry theirs.
 */
export async function makeThumbnail(original: Buffer) {
  return sharp(original)
    .rotate() // honour EXIF orientation before the metadata goes
    .resize({
      width: THUMBNAIL_LONG_EDGE,
      height: THUMBNAIL_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: THUMBNAIL_QUALITY })
    .toBuffer();
}
