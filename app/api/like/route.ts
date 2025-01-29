import { NextResponse } from "next/server";
import { db } from "../../../util/db/db";

/** ❤️ POST: Toggle Like */
export async function POST(req: Request) {
  try {
    const { photoId, fingerprintId } = await req.json();

    if (!photoId || !fingerprintId) {
      return NextResponse.json(
        { error: "Missing image ID or fingerprint ID" },
        { status: 400 }
      );
    }

    // Check if the user already liked the image
    const existingLike = await db(
      `SELECT "id" FROM "Like" WHERE "photoId" = $1 AND "fingerprintId" = $2`,
      [photoId, fingerprintId]
    );

    if (existingLike.length > 0) {
      // Unlike: Remove the like
      await db(
        `DELETE FROM "Like" WHERE "photoId" = $1 AND "fingerprintId" = $2`,
        [photoId, fingerprintId]
      );
      return NextResponse.json({ liked: false });
    } else {
      // Like: Insert new like
      await db(
        `INSERT INTO "Like" ("photoId", "fingerprintId") VALUES ($1, $2)`,
        [photoId, fingerprintId]
      );
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("Like Error:", error);
    return NextResponse.json(
      { error: "Failed to process like" },
      { status: 500 }
    );
  }
}
