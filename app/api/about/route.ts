import { NextResponse } from "next/server";
import { getTierCounts } from "../../../util/db/counts";

/** GET: photo counts per tier */
export async function GET() {
  try {
    return NextResponse.json(await getTierCounts());
  } catch (error) {
    console.error("Error fetching tier counts:", error);
    return NextResponse.json(
      { error: "Failed to load photo counts" },
      { status: 500 }
    );
  }
}
