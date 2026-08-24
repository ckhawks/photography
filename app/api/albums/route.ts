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

/**
 * Rename a shoot, move its date, or change how visible it is.
 *
 * The slug is left alone unless asked: it is the link, and a shared link that
 * stops working is worse than a link whose words are out of date. Pass
 * updateSlug to rebuild it from the new title and date.
 */
export async function PATCH(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, title, shootDate, visibility, showCull, updateSlug } = await req.json();

    if (!id) return NextResponse.json({ error: "Missing shoot id" }, { status: 400 });

    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
      return NextResponse.json({ error: "A title is required" }, { status: 400 });
    }
    if (shootDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(shootDate)) {
      return NextResponse.json({ error: "A date as YYYY-MM-DD" }, { status: 400 });
    }
    if (visibility !== undefined && !["public", "unlisted", "draft"].includes(visibility)) {
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    }

    const [existing] = await db<{ title: string; shootDate: string; slug: string }>(
      `SELECT "title", "shootDate"::text, "slug" FROM "Album" WHERE "id" = $1`,
      [id]
    );
    if (!existing) return NextResponse.json({ error: "No such shoot" }, { status: 404 });

    const updates: { column: string; value: unknown }[] = [];
    if (title !== undefined) updates.push({ column: "title", value: title.trim() });
    if (shootDate !== undefined) updates.push({ column: "shootDate", value: shootDate });
    if (visibility !== undefined) updates.push({ column: "visibility", value: visibility });
    if (showCull !== undefined) updates.push({ column: "showCull", value: Boolean(showCull) });

    if (updateSlug) {
      const slug = slugFor(shootDate ?? existing.shootDate, (title ?? existing.title).trim());
      const clash = await db(`SELECT "id" FROM "Album" WHERE "slug" = $1 AND "id" <> $2`, [slug, id]);
      if (clash.length) {
        return NextResponse.json(
          { error: "Another shoot already has that link" },
          { status: 409 }
        );
      }
      updates.push({ column: "slug", value: slug });
    }

    if (!updates.length) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const [album] = await db(
      `UPDATE "Album" SET ${updates
        .map((update, index) => `"${update.column}" = $${index + 1}`)
        .join(", ")}
        WHERE "id" = $${updates.length + 1}
        RETURNING "id", "slug", "title", "shootDate", "visibility", "showCull"`,
      [...updates.map((update) => update.value), id]
    );

    return NextResponse.json({ album });
  } catch (error) {
    console.error("Error updating shoot:", error);
    return NextResponse.json({ error: "Failed to update shoot" }, { status: 500 });
  }
}

/** Delete a shoot. Only an empty one: photos are never removed by this. */
export async function DELETE(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing shoot id" }, { status: 400 });

    const [{ count }] = await db<{ count: string }>(
      `SELECT COUNT(*) FROM "Photo" WHERE "albumId" = $1`,
      [id]
    );
    if (Number(count) > 0) {
      return NextResponse.json(
        { error: `That shoot still holds ${count} photos. Move them out first.` },
        { status: 409 }
      );
    }

    await db(`DELETE FROM "Album" WHERE "id" = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting shoot:", error);
    return NextResponse.json({ error: "Failed to delete shoot" }, { status: 500 });
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
