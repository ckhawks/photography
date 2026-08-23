import { NextResponse } from "next/server";
import { db } from "../../../util/db/db";
import { getCookie, verifyToken } from "../../../util/auth";

function authorized(req: Request) {
  const token = getCookie(req, "auth-token");
  return Boolean(token && verifyToken(token));
}

/** "Drive to Ouray" on 2025-03-01 -> "2025-03-01-drive-to-ouray" */
function slugFor(shootDate: string, title: string) {
  const name = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${shootDate}-${name}` || shootDate;
}

/** Every shoot, for the picker in Manage. Drafts included: this is admin-only. */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const albums = await db(
      `SELECT a."id", a."slug", a."title", a."shootDate", a."visibility", a."showCull",
          COUNT(p."id")::INTEGER AS "photoCount"
         FROM "Album" a
         LEFT JOIN "Photo" p ON p."albumId" = a."id"
        GROUP BY a."id"
        ORDER BY a."shootDate" DESC, a."id" DESC`
    );
    return NextResponse.json({ albums });
  } catch (error) {
    console.error("Error loading albums:", error);
    return NextResponse.json({ error: "Failed to load shoots" }, { status: 500 });
  }
}

/** Create a shoot. A date and a title is all there is to fill in. */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, shootDate, visibility = "public" } = await req.json();

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "A title is required" }, { status: 400 });
    }
    if (typeof shootDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(shootDate)) {
      return NextResponse.json(
        { error: "A shoot date is required, as YYYY-MM-DD" },
        { status: 400 }
      );
    }
    if (!["public", "unlisted", "draft"].includes(visibility)) {
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    }

    const slug = slugFor(shootDate, title.trim());

    const existing = await db(`SELECT "id" FROM "Album" WHERE "slug" = $1`, [slug]);
    if (existing.length) {
      return NextResponse.json(
        { error: "A shoot with that date and title already exists" },
        { status: 409 }
      );
    }

    const [album] = await db(
      `INSERT INTO "Album" ("slug", "title", "shootDate", "visibility")
       VALUES ($1, $2, $3, $4)
       RETURNING "id", "slug", "title", "shootDate", "visibility", "showCull"`,
      [slug, title.trim(), shootDate, visibility]
    );

    return NextResponse.json({ album: { ...album, photoCount: 0 } });
  } catch (error) {
    console.error("Error creating shoot:", error);
    return NextResponse.json({ error: "Failed to create shoot" }, { status: 500 });
  }
}
