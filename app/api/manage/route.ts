import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import getS3Client from "../../../util/s3/GetS3Client";
import { db } from "../../../util/db/db";
import { verifyToken } from "../../../util/auth";

// Get S3 bucket name from env
const BUCKET_NAME = process.env.AWS_S3_BUCKET!;
const s3Client = getS3Client();

/** 🗑 DELETE: Remove a photo */
export async function DELETE(req: Request) {
  const token = req.headers
    .get("cookie")
    ?.split("auth-token=")[1]
    ?.split(";")[0];

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
  const token = req.headers
    .get("cookie")
    ?.split("auth-token=")[1]
    ?.split(";")[0];

  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, tier } = await req.json();

    if (!id || tier === undefined) {
      return NextResponse.json(
        { error: "Missing photo ID or tier value" },
        { status: 400 }
      );
    }

    if (![1, 2, 3].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier value. Must be 1, 2, or 3." },
        { status: 400 }
      );
    }

    // Update the tier in the database
    await db(`UPDATE "Photo" SET "tier" = $1 WHERE id = $2`, [tier, id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tier Update Error:", error);
    return NextResponse.json(
      { error: "Failed to update photo tier" },
      { status: 500 }
    );
  }
}
