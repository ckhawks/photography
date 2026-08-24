import { NextResponse } from "next/server";
import { getLikeSessions } from "../../../../util/db/likes";
import { getCookie, verifyToken } from "../../../../util/auth";

function unauthorized(req: Request) {
  const token = getCookie(req, "auth-token");
  return !token || !verifyToken(token);
}

/** Recent likes, grouped into per-visitor bursts. */
export async function GET(req: Request) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ sessions: await getLikeSessions() });
  } catch (error) {
    console.error("Error loading like sessions:", error);
    return NextResponse.json({ error: "Failed to load likes" }, { status: 500 });
  }
}
