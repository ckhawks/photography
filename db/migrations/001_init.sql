-- 001_init.sql
--
-- The schema as it exists in the live database, read off Neon on 2026-08-23
-- (columns, constraints, indexes and defaults all verified there).
--
-- The existing database predates this runner, so do NOT run this against it.
-- Record it as already applied instead:
--
--   node db/migrate.mjs --baseline
--
-- Running it is only for a fresh database, e.g. the self-hosted box the site
-- is moving to.

CREATE TABLE IF NOT EXISTS "Photo" (
  "id"               INTEGER PRIMARY KEY DEFAULT nextval('photo_id_seq'),
  "s3Key"            CHARACTER VARYING,
  -- no default: every insert passes NOW(). This is upload time, not capture
  -- time, which is why the site reads "over 1 year ago" everywhere.
  "createdAt"        TIMESTAMPTZ NOT NULL,
  "originalFilename" CHARACTER VARYING,
  -- constants/photoTiers.ts: 1 = Extras, 2 = Notable, 3 = Showcase.
  -- NOT NULL DEFAULT 3, so there is currently no way to represent an
  -- unedited frame. The planned cull layer wants NULL for that and will
  -- need its own migration to drop the NOT NULL.
  "tier"             INTEGER NOT NULL DEFAULT 3
);

CREATE SEQUENCE IF NOT EXISTS photo_id_seq OWNED BY "Photo"."id";

CREATE TABLE IF NOT EXISTS "Like" (
  "id"            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- no foreign key to "Photo" exists in the live database. api/manage deletes
  -- a photo without touching likes, so deletions leave orphans behind; there
  -- happen to be none right now.
  "photoId"       INTEGER NOT NULL,
  "fingerprintId" CHARACTER VARYING NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_like_per_user UNIQUE ("photoId", "fingerprintId")
);

-- Differences from the live database that are deliberately NOT applied here,
-- because changing them is a decision rather than a transcription:
--
--   ALTER TABLE "Like" ADD CONSTRAINT "Like_photoId_fkey"
--     FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE;
--
--   CREATE INDEX "Photo_tier_createdAt_idx" ON "Photo" ("tier", "createdAt" DESC);
--     -- the gallery's only query shape; pointless at 46 rows, worth it if the
--     -- 240-photo import happens
