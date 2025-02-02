import { NextResponse } from "next/server";
import { db } from "../../../util/db/db";
import { MANAGEMENT_PAGE_SIZE } from "../../../constants/pageSizes";

/** 📸 GET: Fetch paginated photos */
export async function GET(req: Request) {
  try {
    // Parse URL query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const sort = searchParams.get("sort") || "newest"; // Default to newest
    const photoTiers = searchParams.getAll("photos"); // Array of selected tiers
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

    // Construct WHERE clause for filtering selected tiers
    let whereClause = "";
    let whereClauseCount = "";
    let photoQueryParams = [MANAGEMENT_PAGE_SIZE, offset];
    let countQueryParams = [];

    if (photoTiers.length > 0) {
      const tierPlaceholders = photoTiers.map((_, i) => `$${i + 3}`).join(", ");
      whereClause = `WHERE "Photo"."tier" IN (${tierPlaceholders})`;
      whereClauseCount = `WHERE "Photo"."tier" IN (${photoTiers
        .map((_, i) => `$${i + 1}`)
        .join(", ")})`;

      // @ts-ignore
      photoQueryParams = photoQueryParams.concat(photoTiers);
      countQueryParams = photoTiers;
    }

    // Query paginated photos
    const photos = await db(
      `SELECT "Photo"."id", "Photo"."s3Key", "Photo"."originalFilename", "Photo"."createdAt",
        COALESCE(like_counts."like_count", 0)::INTEGER AS "likes", "Photo"."tier"
       FROM "Photo"
       LEFT JOIN (
           SELECT "photoId", COUNT(*)::INTEGER AS "like_count"
           FROM "Like"
           GROUP BY "photoId"
       ) AS like_counts
       ON "Photo"."id" = like_counts."photoId"
       ${whereClause}
       ORDER BY ${orderByClause}
       LIMIT $1 OFFSET $2`,
      // @ts-ignore
      photoQueryParams
    );

    // Get total count with the same WHERE clause
    const totalCountResult = await db(
      `SELECT COUNT(*) FROM "Photo" ${whereClauseCount}`,
      countQueryParams
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
