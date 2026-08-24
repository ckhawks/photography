import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import getS3Client from "../../../../util/s3/GetS3Client";
import { db } from "../../../../util/db/db";
import { getAdminPhotos } from "../../../../util/db/photos";
import { getCookie, verifyToken } from "../../../../util/auth";
import { ratingById, tierForRating } from "../../../../constants/ratings";

// Get S3 bucket name from env
const BUCKET_NAME = process.env.AWS_S3_BUCKET!;
const s3Client = getS3Client();

/** Every photo, hidden ones included: the admin list. */
export async function GET(req: Request) {
  const token = getCookie(req, "auth-token");
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const albumId = searchParams.get("albumId");

    const result = await getAdminPhotos({
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") || "60", 10),
      albumId: albumId === "none" ? "none" : albumId ? Number(albumId) : null,
      rating: searchParams.get("rating"),
      search: searchParams.get("search") ?? "",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error listing photos:", error);
    return NextResponse.json({ error: "Failed to load photos" }, { status: 500 });
  }
}

/** 🗑 DELETE: Remove a photo */
export async function DELETE(req: Request) {
  const token = getCookie(req, "auth-token");

  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, fileKey } = await req.json();

    if (!id || !fileKey) {
      return NextResponse.json(
        { error: "Missing id or fileKey" },
        { status: 400 }
      );
    }

    // Delete from S3
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
        })
      );
    } catch (s3Error) {
      console.error("S3 Delete Error:", s3Error);
      return NextResponse.json(
        { error: "Failed to delete from S3" },
        { status: 500 }
      );
    }

    // Delete from database
    await db(`DELETE FROM "Photo" WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}

/** 🛠️ PATCH: Update photo tier */
export async function PATCH(req: Request) {
  const token = getCookie(req, "auth-token");

  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, tier, rating, medium, camera, lens, filmStock, albumId } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing photo ID" }, { status: 400 });
    }

    if (tier !== undefined && ![1, 2, 3].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier value. Must be 1, 2, or 3." },
        { status: 400 }
      );
    }

    if (rating !== undefined && rating !== null && !ratingById(rating)) {
      return NextResponse.json({ error: "Unknown rating" }, { status: 400 });
    }

    if (medium !== undefined && medium !== null && !["film", "digital"].includes(medium)) {
      return NextResponse.json(
        { error: "Invalid medium. Must be film or digital." },
        { status: 400 }
      );
    }

    // Only the fields actually sent are written, so editing the camera cannot
    // wipe the film stock. Empty strings clear a field.
    const text = (value: unknown) =>
      typeof value === "string" && value.trim() ? value.trim() : null;

    const updates: { column: string; value: unknown }[] = [];
    if (tier !== undefined) updates.push({ column: "tier", value: tier });

    // setting a rating sets the tier with it, so the two cannot drift apart.
    // dontshow has no tier: nothing published should carry it.
    if (rating !== undefined) {
      updates.push({ column: "rating", value: rating || null });
      const derived = tierForRating(rating);
      // 0 is a real tier (hidden), so this cannot be a truthiness check
      if (derived !== null) updates.push({ column: "tier", value: derived });
    }
    if (medium !== undefined) updates.push({ column: "medium", value: medium || null });
    if (camera !== undefined) updates.push({ column: "camera", value: text(camera) });
    if (lens !== undefined) updates.push({ column: "lens", value: text(lens) });
    if (filmStock !== undefined) updates.push({ column: "filmStock", value: text(filmStock) });
    // null clears the album, which is how a photo goes back to being unfiled
    if (albumId !== undefined) {
      updates.push({ column: "albumId", value: albumId === null || albumId === "" ? null : Number(albumId) });
    }

    if (!updates.length) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await db(
      `UPDATE "Photo" SET ${updates
        .map((update, index) => `"${update.column}" = $${index + 1}`)
        .join(", ")} WHERE id = $${updates.length + 1}`,
      [...updates.map((update) => update.value), id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Photo Update Error:", error);
    return NextResponse.json(
      { error: "Failed to update photo" },
      { status: 500 }
    );
  }
}
