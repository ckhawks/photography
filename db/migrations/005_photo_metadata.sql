-- 005_photo_metadata.sql
--
-- What a photo was taken with. Two sources, because neither covers the library:
--
--   EXIF, read at upload where it survives. Spot-checked 2026-08-23: the Sony
--   files carry make, model, lens, aperture, ISO, shutter and capture date;
--   the Fuji exports carry none at all, stripped somewhere in the export.
--
--   Typed in by hand, which is the only source for film: a scan's EXIF belongs
--   to the scanner, not the camera, and the film stock is not in any file.
--
-- "medium" is a hard partition (film or digital), per the tag axes: one value
-- per photo, never both.

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "medium"    CHARACTER VARYING;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "camera"    CHARACTER VARYING;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "lens"      CHARACTER VARYING;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "filmStock" CHARACTER VARYING;

-- capture time from EXIF where it exists. Kept separate from "createdAt",
-- which is upload time, and deliberately NOT used for ordering: photos within
-- a shoot do not need it, and most of the library has no EXIF to order by.
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "takenAt" TIMESTAMPTZ;

-- the settings, as read. JSONB rather than columns because it is display-only
-- and the shape varies by camera.
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "exif" JSONB;
