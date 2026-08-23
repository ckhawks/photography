-- 003_albums.sql
--
-- Albums are shoots: one photo belongs to exactly one shoot, and the shoot is
-- the unit the Albums page lists. A shoot has a date and a title and nothing
-- else to write.
--
-- Additive and reversible: "albumId" is nullable, so existing photos keep
-- working with no backfill and orphans still render on the gallery, just
-- without a shoot line.

CREATE TABLE IF NOT EXISTS "Album" (
  "id"         SERIAL PRIMARY KEY,
  -- YYYY-MM-DD-title, mirroring the NAS folder convention
  "slug"       CHARACTER VARYING NOT NULL UNIQUE,
  "title"      CHARACTER VARYING NOT NULL,
  -- the authoritative date. Photo."createdAt" is upload time and stays internal
  "shootDate"  DATE NOT NULL,
  -- public: listed and linkable | unlisted: linkable, not listed | draft: 404
  "visibility" CHARACTER VARYING NOT NULL DEFAULT 'public',
  -- per-album switch for the unedited photos section, off until deliberately set
  "showCull"   BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "albumId" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Photo_albumId_fkey') THEN
    ALTER TABLE "Photo"
      ADD CONSTRAINT "Photo_albumId_fkey"
      FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Photo_albumId_idx" ON "Photo" ("albumId");
CREATE INDEX IF NOT EXISTS "Album_shootDate_idx" ON "Album" ("shootDate" DESC);
