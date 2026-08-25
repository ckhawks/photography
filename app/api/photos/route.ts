import { NextResponse } from "next/server";
import { mediumFromParam } from "../../../constants/mediums";
import { getGalleryPhotos } from "../../../util/db/photos";

/** GET: one page of the gallery */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const sort = searchParams.get("sort") || "shuffle";
    const seed = searchParams.get("seed") || "";
    const medium = mediumFromParam(searchParams.get("medium"));
    const tiers = searchParams
      .getAll("photos")
      .map((tier) => parseInt(tier, 10))
      .filter((tier) => !isNaN(tier));

    const result = await getGalleryPhotos({ page, tiers, sort, seed, medium });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
