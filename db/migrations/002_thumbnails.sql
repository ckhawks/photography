-- 002_thumbnails.sql
--
-- Gallery tiles render at 350px CSS but ship the original: 3.67 MB average,
-- 42.4 MB for one 20-tile page view (measured 2026-08-23). Store a resized
-- copy alongside each original and serve that on the wall.
--
-- Nullable on purpose: existing rows have no thumbnail until the backfill
-- runs, and the app falls back to the original when this is NULL, so the
-- column can be added while the site is up.

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "thumbKey" CHARACTER VARYING;
