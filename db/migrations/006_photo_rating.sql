-- 006_photo_rating.sql
--
-- The judgement, as made in the film reviewer: dontshow, okay, good, great,
-- excellent, amazing. Six levels against three tiers, so the rating is what a
-- person decides and "tier" is what the site does with it:
--
--   amazing    -> tier 3, Showcase, on the gallery wall
--   excellent  -> tier 2, Notable, on the gallery wall
--   great      -> tier 1, top of its album
--   good       -> tier 1, in its album
--   okay       -> tier 1, behind the album's "Want more?" disclosure
--   dontshow   -> never uploaded, so it should never appear here at all
--
-- Tier stays a column rather than being computed on the fly: the gallery, its
-- filter chips and every existing query are built on it. It is derived from
-- the rating on write, so the two cannot drift apart.
--
-- Nullable: photos uploaded before the reviewer existed have no rating and
-- keep the tier they were given by hand.

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "rating" CHARACTER VARYING;

CREATE INDEX IF NOT EXISTS "Photo_album_rating_idx" ON "Photo" ("albumId", "rating");
