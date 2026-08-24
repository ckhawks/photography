import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import getS3Client from "../../../../util/s3/GetS3Client";
import { PutFileIntoS3 } from "../../../../util/s3/PutFileIntoS3";
import { db } from "../../../../util/db/db";
import { getCookie, verifyToken } from "../../../../util/auth";

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

function unauthorized(req: Request) {
  const token = getCookie(req, "auth-token");
  return !token || !verifyToken(token);
}

// Same rule the upload route uses, so a before and its photo cannot end up
// with keys that disagree about what is a legal character.
function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Attach the unedited version of a photo.
 *
 * Its own endpoint rather than a field on upload, because the before is
 * attached to a photo that already exists: the 127 frames that need one were
 * uploaded long before this column did.
 */
export async function POST(req: Request) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const photoId = Number(formData.get("photoId"));

    if (!Number.isInteger(photoId) || photoId <= 0) {
      return NextResponse.json({ error: "Missing or invalid photoId" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const [photo] = await db<{ id: number; beforeS3Key: string | null }>(
      `SELECT "id", "beforeS3Key" FROM "Photo" WHERE "id" = $1`,
      [photoId]
    );
    if (!photo) {
      return NextResponse.json({ error: "No such photo" }, { status: 404 });
    }

    const fileKey = `before/${photoId}-${sanitizeFilename(file.name)}`;

    try {
      // @ts-ignore the helper predates the File type here
      await PutFileIntoS3(file, fileKey);
    } catch (s3Error) {
      console.error("Before upload failed:", s3Error);
      return NextResponse.json({ error: "Failed to store the before image" }, { status: 500 });
    }

    await db(`UPDATE "Photo" SET "beforeS3Key" = $1 WHERE "id" = $2`, [fileKey, photoId]);

    // Replacing a before leaves the old object orphaned in the bucket, and
    // nothing else ever points at it. Only bother when the key actually
    // changed -- re-running the backfill writes the same key.
    if (photo.beforeS3Key && photo.beforeS3Key !== fileKey) {
      try {
        await getS3Client().send(
          new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: photo.beforeS3Key })
        );
      } catch (cleanupError) {
        console.error(`Could not remove the replaced before ${photo.beforeS3Key}:`, cleanupError);
      }
    }

    return NextResponse.json({ success: true, beforeS3Key: fileKey });
  } catch (error) {
    console.error("Before Upload Error:", error);
    return NextResponse.json({ error: "Failed to attach the before image" }, { status: 500 });
  }
}

/** Detach a before, so the toggle stops appearing on that photo. */
export async function DELETE(req: Request) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { photoId } = await req.json();
    if (!Number.isInteger(photoId) || photoId <= 0) {
      return NextResponse.json({ error: "Missing or invalid photoId" }, { status: 400 });
    }

    const [photo] = await db<{ beforeS3Key: string | null }>(
      `SELECT "beforeS3Key" FROM "Photo" WHERE "id" = $1`,
      [photoId]
    );
    if (!photo) {
      return NextResponse.json({ error: "No such photo" }, { status: 404 });
    }

    await db(`UPDATE "Photo" SET "beforeS3Key" = NULL WHERE "id" = $1`, [photoId]);

    if (photo.beforeS3Key) {
      try {
        await getS3Client().send(
          new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: photo.beforeS3Key })
        );
      } catch (cleanupError) {
        console.error(`Could not remove ${photo.beforeS3Key}:`, cleanupError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Before Delete Error:", error);
    return NextResponse.json({ error: "Failed to detach the before image" }, { status: 500 });
  }
}
