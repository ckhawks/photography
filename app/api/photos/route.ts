import { NextResponse } from "next/server";
import { db } from "../../../util/db/db";
import { MANAGEMENT_PAGE_SIZE } from "../../../constants/pageSizes";

/** 📸 GET: Fetch paginated photos */
export async function GET(req: Request) {
  try {
    // Parse URL query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const sort = searchParams.get("sort") || "random"; // Default to newest
    const offset = (page - 1) * MANAGEMENT_PAGE_SIZE;

    // Determine sorting order
    let orderByClause;
    if (sort === "oldest") {
      orderByClause = `"Photo"."createdAt" ASC`;
    } else if (sort === "random") {
      orderByClause = "RANDOM()";
    } else if (sort === "most_liked") {
      orderByClause = `COALESCE(like_counts."like_count", 0)::INTEGER DESC, "Photo"."createdAt" DESC`;
    } else {
      orderByClause = `"Photo"."createdAt" DESC`; // Default: Newest first
    }

    // Query photos with like count
    const photos = await db(
      `SELECT "Photo"."id", "Photo"."s3Key", "Photo"."originalFilename", "hallOfFame", "Photo"."createdAt",
        COALESCE(like_counts."like_count", 0)::INTEGER AS "likes"
       FROM "Photo"
       LEFT JOIN (
           SELECT "photoId", COUNT(*)::INTEGER AS "like_count"
           FROM "Like"
           GROUP BY "photoId"
       ) AS like_counts
       ON "Photo"."id" = like_counts."photoId"
       ORDER BY ${orderByClause}
       LIMIT $1 OFFSET $2`,
      [MANAGEMENT_PAGE_SIZE.toString(), offset.toString()]
    );

    // Get total photo count for pagination
    const totalCountResult = await db(`SELECT COUNT(*) FROM "Photo"`, []);
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
