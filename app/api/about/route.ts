import { NextResponse } from "next/server";
import { db } from "../../../util/db/db";

/** 📸 GET: Fetch paginated photos */
export async function GET(req: Request) {
  try {
    const extrasTierCount = await db(
      `SELECT COUNT(*) as "tier1Count" FROM "Photo" WHERE "tier" = 1`,
      []
    );
    const notableTierCount = await db(
      `SELECT COUNT(*) as "tier2Count" FROM "Photo" WHERE "tier" = 2`,
      []
    );
    const showcaseTierCount = await db(
      `SELECT COUNT(*) as "tier3Count" FROM "Photo" WHERE "tier" = 3`,
      []
    );
    const hiddenTierCount = await db(
      `SELECT COUNT(*) as "tier0Count" FROM "Photo" WHERE "tier" = 0`,
      []
    );

    return NextResponse.json({
      tier0Count: hiddenTierCount[0].tier0Count,
      tier1Count: extrasTierCount[0].tier1Count,
      tier2Count: notableTierCount[0].tier2Count,
      tier3Count: showcaseTierCount[0].tier3Count,
    });
  } catch (error) {
    console.error("Error fetching photo counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch photo counts" },
      { status: 500 }
    );
  }
}
