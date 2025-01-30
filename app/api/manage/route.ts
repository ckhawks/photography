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

/** ⭐ PATCH: Mark as "Hall of Fame" */
export async function PATCH(req: Request) {
  const token = req.headers
    .get("cookie")
    ?.split("auth-token=")[1]
    ?.split(";")[0];

  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, hallOfFame } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing photo ID" }, { status: 400 });
    }

    await db(`UPDATE "Photo" SET "hallOfFame" = $1 WHERE id = $2`, [
      hallOfFame,
      id,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Hall of Fame Error:", error);
    return NextResponse.json(
      { error: "Failed to update Hall of Fame status" },
      { status: 500 }
    );
  }
}
