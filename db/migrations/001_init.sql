-- 001_init.sql
--
-- RECONSTRUCTED, NOT DUMPED. Written 2026-08-23 by reading every query in the
-- app; the live database is the authority and has never been inspected from
-- here. Before trusting this file, run against the real database:
--
--   \d "Photo"
--   \d "Like"
--
-- and correct the types, defaults, constraints and indexes below to match.
-- Then mark it applied (see db/migrate.mjs --baseline) rather than running it.
--
-- Evidence used:
--   app/api/upload/route.ts   INSERT INTO "Photo" ("s3Key","originalFilename","tier","createdAt")
--   app/api/photos/route.ts   SELECT id, s3Key, originalFilename, createdAt, tier; LEFT JOIN Like
--   app/api/manage/route.ts   DELETE FROM "Photo" WHERE id; UPDATE "Photo" SET tier
--   app/api/like/route.ts     SELECT/INSERT/DELETE on "Like" by (photoId, fingerprintId)
--   app/api/about/route.ts    COUNT(*) per tier, including tier = 0

CREATE TABLE IF NOT EXISTS "Photo" (
  "id"               SERIAL PRIMARY KEY,
  "s3Key"            TEXT NOT NULL,
  "originalFilename" TEXT,
  -- constants/photoTiers.ts: 1 = Extras, 2 = Notable, 3 = Showcase.
  -- api/about also counts tier = 0, so 0 exists in the data even though
  -- upload and manage validate against [1,2,3]. No CHECK constraint is
  -- asserted here for that reason.
  "tier"             INTEGER,
  -- upload passes NOW(), so this is upload time, not capture time
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Like" (
  "id"            SERIAL PRIMARY KEY,
  "photoId"       INTEGER NOT NULL,
  "fingerprintId" TEXT NOT NULL
);

-- Candidates, deliberately NOT applied here because they may not exist live and
-- adding them silently would change behaviour:
--
--   ALTER TABLE "Like" ADD CONSTRAINT "Like_photoId_fkey"
--     FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE;
--     -- api/manage deletes a Photo without touching Like, so without this
--     -- every deleted photo leaves orphaned likes behind.
--
--   CREATE UNIQUE INDEX "Like_photo_fingerprint_key"
--     ON "Like" ("photoId", "fingerprintId");
--     -- api/like enforces one-like-per-fingerprint in application code only,
--     -- which races under concurrent requests.
--
--   CREATE INDEX "Photo_tier_createdAt_idx" ON "Photo" ("tier", "createdAt" DESC);
--     -- the gallery's only query shape
