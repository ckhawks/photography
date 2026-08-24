import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import getS3Client from "../../../../util/s3/GetS3Client";
import { PutBufferIntoS3, PutFileIntoS3 } from "../../../../util/s3/PutFileIntoS3";
import {
  makeThumbnail,
  readDimensions,
  thumbnailKeyFor,
} from "../../../../util/images/makeThumbnail";
import { ratingById, tierForRating } from "../../../../constants/ratings";
import { db } from "../../../../util/db/db";
import { getCookie, verifyToken } from "../../../../util/auth";

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

function unauthorized(req: Request) {
  const token = getCookie(req, "auth-token");
  return !token || !verifyToken(token);
}

// Same shape the upload route produces, hex prefix included. The prefix is
// what makes this safe: writing new bytes under the SAME key leaves Cloudflare
// serving the old object at an unchanged URL, so the swap looks applied in the
// database and is invisible on the site. A new key cannot have that problem.
function versionedKey(filename: string) {
  const extension = filename.includes(".") ? filename.split(".").pop() : "";
  const base = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
  return `uploads/${randomBytes(4).toString("hex")}-${base}${
    extension ? `.${extension}` : ""
  }`;
}

async function removeObject(key: string | null) {
  if (!key) return;
  try {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key })
    );
  } catch (error) {
    // an orphaned object costs storage, a failed request costs the swap
    console.error(`Could not remove the replaced object ${key}:`, error);
  }
}

type PhotoRow = {
  id: number;
  s3Key: string;
  thumbKey: string | null;
  beforeS3Key: string | null;
};

/**
 * Replace the image behind a photo, keeping the row.
 *
 * The case this exists for: a frame is published from the cull, unedited, and
 * an edit of it arrives weeks later. Uploading that edit as a new photo would
 * strand the original row — its likes, its album, its wall position and its
 * id — and leave two rows for one frame. This swaps the bytes underneath and
 * leaves everything else alone.
 *
 * Deliberately kept: id, likes, albumId, wallRank, medium, filmStock, camera,
 * lens, takenAt and exif. The new file is a different rendering of the same
 * frame, so what the camera recorded has not changed.
 *
 * Replaced: s3Key, thumbKey, width, height, originalFilename, and the rating
 * when one is passed — swapping a cull for an edit almost always means the
 * judgement moves too, and doing both in one request keeps them from drifting.
 *
 * keepAsBefore turns the outgoing image into the before/after pair rather than
 * deleting it, which is exactly what a cull-to-edit swap wants.
 */
export async function POST(req: Request) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const photoId = Number(formData.get("photoId"));
    const rating = (formData.get("rating") as string) || null;
    const keepAsBefore = formData.get("keepAsBefore") === "true";

    if (!Number.isInteger(photoId) || photoId <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid photoId" },
        { status: 400 }
      );
    }
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (rating && !ratingById(rating)) {
      return NextResponse.json({ error: "Unknown rating" }, { status: 400 });
    }
    if (rating === "dontshow") {
      return NextResponse.json(
        { error: "Hide the photo instead of publishing a version of it" },
        { status: 400 }
      );
    }

    const [photo] = await db<PhotoRow>(
      `SELECT "id", "s3Key", "thumbKey", "beforeS3Key" FROM "Photo" WHERE "id" = $1`,
      [photoId]
    );
    if (!photo) {
      return NextResponse.json({ error: "No such photo" }, { status: 404 });
    }

    const fileKey = versionedKey(file.name);

    try {
      // @ts-ignore the helper predates the File type here
      await PutFileIntoS3(file, fileKey);
    } catch (s3Error) {
      console.error("Version upload failed:", s3Error);
      return NextResponse.json(
        { error: "Failed to store the new version" },
        { status: 500 }
      );
    }

    // A thumbnail failure is not fatal here either: thumbKey goes NULL and the
    // wall falls back to the original, same as it does on upload.
    let thumbKey: string | null = null;
    let width: number | null = null;
    let height: number | null = null;
    try {
      const original = Buffer.from(await file.arrayBuffer());
      ({ width, height } = await readDimensions(original));
      const thumbnail = await makeThumbnail(original);
      const candidate = thumbnailKeyFor(fileKey);
      if (await PutBufferIntoS3(thumbnail, candidate, "image/webp")) {
        thumbKey = candidate;
      }
    } catch (thumbError) {
      console.error(`Thumbnail failed for ${fileKey}:`, thumbError);
    }

    const columns = [
      { column: "s3Key", value: fileKey },
      { column: "thumbKey", value: thumbKey },
      { column: "width", value: width },
      { column: "height", value: height },
      { column: "originalFilename", value: file.name },
    ];
    if (rating) {
      columns.push({ column: "rating", value: rating });
      const derived = tierForRating(rating);
      if (derived !== null) {
        columns.push({ column: "tier", value: derived as any });
      }
    }
    // the outgoing image becomes the before, so the pair costs no second upload
    const replacedBefore = keepAsBefore ? photo.beforeS3Key : null;
    if (keepAsBefore) {
      columns.push({ column: "beforeS3Key", value: photo.s3Key });
    }

    const assignments = columns
      .map((entry, index) => `"${entry.column}" = $${index + 1}`)
      .join(", ");
    await db(
      `UPDATE "Photo" SET ${assignments} WHERE "id" = $${columns.length + 1}`,
      [...columns.map((entry) => entry.value), photoId]
    );

    // Only now, with the row pointing at the new key. The outgoing original is
    // kept when it has become the before, and the old thumbnail always goes.
    await removeObject(photo.thumbKey);
    if (!keepAsBefore) {
      await removeObject(photo.s3Key);
    }
    if (replacedBefore && replacedBefore !== photo.s3Key) {
      await removeObject(replacedBefore);
    }

    return NextResponse.json({
      success: true,
      photo: {
        id: photoId,
        s3Key: fileKey,
        thumbKey,
        width,
        height,
        originalFilename: file.name,
        ...(rating ? { rating, tier: tierForRating(rating) } : {}),
        ...(keepAsBefore ? { beforeS3Key: photo.s3Key } : {}),
      },
    });
  } catch (error) {
    console.error("Version Error:", error);
    return NextResponse.json(
      { error: "Failed to replace the image" },
      { status: 500 }
    );
  }
}
