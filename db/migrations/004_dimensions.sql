-- 004_dimensions.sql
--
-- Pixel dimensions of the original, captured at upload.
--
-- Two things need them: the Albums page sizes each print by area rather than
-- by width, so a landscape frame is wider than a portrait one instead of
-- smaller; and a page can reserve the right box while a photo loads instead
-- of jumping when it arrives.
--
-- Nullable: photos uploaded before this have none until the backfill runs, and
-- both callers fall back sensibly.

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "height" INTEGER;
