import { db } from "./db";

/**
 * How long a visitor can go quiet before their next like counts as a separate
 * visit. Likes arrive in bursts — someone scrolls the wall and taps five in a
 * row — so a flat list of individual likes is mostly noise.
 */
const SESSION_GAP = "30 minutes";

/** How many characters of the visitor hash to show. */
const VISITOR_LABEL_LENGTH = 6;

export type LikeSessionPhoto = {
  id: number;
  s3Key: string;
  thumbKey: string | null;
  originalFilename: string | null;
  at: string;
};

export type LikeSession = {
  /** the first characters of the FingerprintJS visitor id, e.g. "a3f9c1" */
  visitor: string;
  action: "liked" | "unliked";
  startedAt: string;
  endedAt: string;
  /** events in this burst, including any whose photo has since been deleted */
  count: number;
  /** every like this visitor currently has standing, across all their visits */
  visitorTotal: number;
  photos: LikeSessionPhoto[];
};

/**
 * Recent likes and unlikes, grouped into per-visitor bursts, newest first.
 *
 * Since migration 009 an unlike stamps "unlikedAt" instead of deleting, so one
 * row carries up to two events and both show here. Only the most recent cycle
 * per photo/visitor pair survives: like, unlike, like again, and the first two
 * are gone. Anything before that migration was deleted outright and cannot be
 * recovered, so unlikes only exist from then on.
 *
 * The visitor label is a FingerprintJS id, which drifts — the same person on a
 * different browser, or after a browser update, is a different visitor here.
 * It identifies a browser, not a human, and is deliberately not a sequential
 * number: numbering the likers would read as numbering the visitors.
 */
export async function getLikeSessions(limit = 100): Promise<LikeSession[]> {
  return db<LikeSession>(
    `
    -- one row per thing that happened, rather than per like that stands
    WITH events AS (
      SELECT "photoId", "fingerprintId", "createdAt" AS "at", 'liked' AS "action"
      FROM "Like"
      UNION ALL
      SELECT "photoId", "fingerprintId", "unlikedAt" AS "at", 'unliked' AS "action"
      FROM "Like" WHERE "unlikedAt" IS NOT NULL
    ),
    -- partitioned by action too, so a stray unlike does not split a run of
    -- likes into two bursts around it
    marked AS (
      SELECT
        events.*,
        CASE
          WHEN "at" - LAG("at") OVER (
                 PARTITION BY "fingerprintId", "action" ORDER BY "at", "photoId"
               ) > $1::interval
          THEN 1 ELSE 0
        END AS "break"
      FROM events
    ),
    -- a running total of the breaks gives each burst its own number
    bursts AS (
      SELECT
        marked.*,
        SUM("break") OVER (
          PARTITION BY "fingerprintId", "action" ORDER BY "at", "photoId"
          ROWS UNBOUNDED PRECEDING
        ) AS "burst"
      FROM marked
    ),
    totals AS (
      SELECT "fingerprintId", COUNT(*)::INTEGER AS "total"
      FROM "Like" WHERE "unlikedAt" IS NULL GROUP BY "fingerprintId"
    )
    SELECT
      SUBSTRING(bursts."fingerprintId" FROM 1 FOR $2) AS "visitor",
      bursts."action",
      MIN(bursts."at") AS "startedAt",
      MAX(bursts."at") AS "endedAt",
      COUNT(*)::INTEGER AS "count",
      -- LEFT JOIN, because a visitor who took every like back has no total
      COALESCE(MIN(totals."total"), 0)::INTEGER AS "visitorTotal",
      -- a like whose photo was deleted has no Photo row, hence the LEFT JOIN
      -- and the strip below; it still counts toward "count", which is why the
      -- page can say some of a burst is gone
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', "Photo"."id",
            's3Key', "Photo"."s3Key",
            'thumbKey', "Photo"."thumbKey",
            'originalFilename', "Photo"."originalFilename",
            'at', bursts."at"
          )
          ORDER BY bursts."at"
        ) FILTER (WHERE "Photo"."id" IS NOT NULL),
        '[]'::json
      ) AS "photos"
    FROM bursts
    LEFT JOIN "Photo" ON "Photo"."id" = bursts."photoId"
    LEFT JOIN totals ON totals."fingerprintId" = bursts."fingerprintId"
    GROUP BY bursts."fingerprintId", bursts."action", bursts."burst"
    ORDER BY MAX(bursts."at") DESC
    LIMIT $3
    `,
    [SESSION_GAP, VISITOR_LABEL_LENGTH, limit]
  );
}
