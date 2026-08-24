import { NextResponse } from "next/server";
import { getGalleryPhotos } from "../../../util/db/photos";

/** 📸 GET: Fetch paginated photos */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const sort = searchParams.get("sort") || "shuffle";
    const seed = searchParams.get("seed") || "";
    const tiers = searchParams
      .getAll("photos")
      .map((tier) => parseInt(tier, 10))
      .filter((tier) => !isNaN(tier));

    const result = await getGalleryPhotos({ page, tiers, sort, seed });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
