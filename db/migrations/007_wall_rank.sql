-- Manual ordering for the gallery wall.
--
-- The wall is otherwise a seeded shuffle, which is right for the bulk of it:
-- upload order is not an argument about quality. But the lead of the wall is
-- the first thing anyone sees, and it should be a choice. A photo with a
-- wallRank is pinned at that position; everything else shuffles behind it, so
-- ordering the first dozen costs nothing on the other few hundred.
--
-- Nullable on purpose: NULL means unpinned, which is the default and the state
-- every photo starts in.

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "wallRank" INTEGER;

-- the wall query orders on this before the shuffle
CREATE INDEX IF NOT EXISTS "Photo_wallRank_idx" ON "Photo" ("wallRank") WHERE "wallRank" IS NOT NULL;
