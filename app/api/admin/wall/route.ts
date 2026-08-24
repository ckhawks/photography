import { NextResponse } from "next/server";
import { getWallPhotos, setWallOrder } from "../../../../util/db/photos";
import { getCookie, verifyToken } from "../../../../util/auth";

function unauthorized(req: Request) {
  const token = getCookie(req, "auth-token");
  return !token || !verifyToken(token);
}

/** Everything that can appear on the wall, pinned first. */
export async function GET(req: Request) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ photos: await getWallPhotos() });
  } catch (error) {
    console.error("Error loading wall photos:", error);
    return NextResponse.json({ error: "Failed to load wall photos" }, { status: 500 });
  }
}

/**
 * Replace the pinned order. The body carries the pinned ids in order; anything
 * absent goes back to shuffling.
 */
export async function PUT(req: Request) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { order } = await req.json();

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order must be an array of photo ids" }, { status: 400 });
    }

    const ids = order.map(Number);
    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
      return NextResponse.json({ error: "order holds something that is not a photo id" }, { status: 400 });
    }

    // A repeated id would give one photo two ranks and silently drop the other
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json({ error: "order repeats a photo" }, { status: 400 });
    }

    const pinned = await setWallOrder(ids);
    return NextResponse.json({ success: true, pinned });
  } catch (error) {
    console.error("Error saving wall order:", error);
    return NextResponse.json({ error: "Failed to save the order" }, { status: 500 });
  }
}
