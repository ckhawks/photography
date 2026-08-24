import { NextResponse } from "next/server";
import { db } from "../../../util/db/db";

/**
 * Toggle a like.
 *
 * Unliking does not delete the row, it stamps "unlikedAt" — see migration 009.
 * unique_like_per_user means a photo/visitor pair has at most one row ever, so
 * liking is an upsert that clears the stamp rather than an insert, and the
 * toggle reads the current state off that one row.
 */
export async function POST(req: Request) {
  try {
    const { photoId, fingerprintId } = await req.json();

    if (!photoId || !fingerprintId) {
      return NextResponse.json(
        { error: "Missing image ID or fingerprint ID" },
        { status: 400 }
      );
    }

    const existing = await db<{ standing: boolean }>(
      `SELECT ("unlikedAt" IS NULL) AS "standing" FROM "Like"
        WHERE "photoId" = $1 AND "fingerprintId" = $2`,
      [photoId, fingerprintId]
    );

    if (existing.length > 0 && existing[0].standing) {
      await db(
        `UPDATE "Like" SET "unlikedAt" = NOW()
          WHERE "photoId" = $1 AND "fingerprintId" = $2 AND "unlikedAt" IS NULL`,
        [photoId, fingerprintId]
      );
      return NextResponse.json({ liked: false });
    }

    // Either no row yet, or one carrying a tombstone from an earlier unlike.
    // "createdAt" is reset so the like reads as happening now rather than
    // whenever the withdrawn one did.
    await db(
      `INSERT INTO "Like" ("photoId", "fingerprintId") VALUES ($1, $2)
       ON CONFLICT ON CONSTRAINT unique_like_per_user
       DO UPDATE SET "unlikedAt" = NULL, "createdAt" = NOW()`,
      [photoId, fingerprintId]
    );
    return NextResponse.json({ liked: true });
  } catch (error) {
    console.error("Like Error:", error);
    return NextResponse.json(
      { error: "Failed to process like" },
      { status: 500 }
    );
  }
}
