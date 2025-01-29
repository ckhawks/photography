import { db } from "../../../../util/db/db";
import { NextResponse } from "next/server";
import { MANAGEMENT_PAGE_SIZE } from "../../../../constants/pageSizes";
export const revalidate = 1;

export async function GET(request: Request, { params }: { params: any }) {
  try {
    // Parse URL query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const offset = (page - 1) * MANAGEMENT_PAGE_SIZE;

    // Query photos with like count
    const photos = await db(
      `SELECT "Photo"."id", "Photo"."s3Key", "hallOfFame", "Photo"."originalFilename", "Photo"."createdAt",
              COALESCE(like_counts."like_count", 0)::INTEGER AS "likes"
       FROM "Photo"
       LEFT JOIN (
           SELECT "photoId", COUNT(*) AS "like_count"
           FROM "Like"
           GROUP BY "photoId"
       ) AS like_counts
       ON "Photo"."id" = like_counts."photoId"
       WHERE "hallOfFame" IS TRUE
       ORDER BY RANDOM()
       LIMIT $1 OFFSET $2`,
      [
        // MANAGEMENT_PAGE_SIZE.toString(),
        "999",
        offset.toString(),
      ]
    );

    // Get total photo count for pagination
    const totalCountResult = await db(
      `SELECT COUNT(*) FROM "Photo" WHERE "hallOfFame" IS TRUE`,
      []
    );
    const totalCount = parseInt(totalCountResult[0].count, 10);
    const totalPages = Math.ceil(totalCount / MANAGEMENT_PAGE_SIZE);

    return NextResponse.json({ photos, totalPages, currentPage: page });
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
