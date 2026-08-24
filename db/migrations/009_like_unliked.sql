-- Unliking stops deleting the row.
--
-- Deleting made a like the only signal the site collects that leaves no trace
-- when it is withdrawn: someone liked six photos, took three back, and the
-- record shows three likes with nothing to say the other three ever happened.
-- Taking a like back is itself a judgement worth seeing on /admin/likes.
--
-- Nullable, and NULL is the normal state: NULL means the like stands. Every
-- count of likes therefore has to filter on it, which is the whole cost of
-- this column -- util/db/photos.ts, util/db/albums.ts and util/db/likes.ts.
--
-- unique_like_per_user stays. Re-liking REUSES the row and clears this column
-- rather than inserting a second one, so a photo/visitor pair keeps exactly
-- one row and only its most recent cycle. Keeping every cycle would mean
-- dropping that constraint and turning this into an append-only event table,
-- which makes every like count a latest-state-per-pair query on the gallery's
-- hot path -- a real cost for a signal nobody would read.

ALTER TABLE "Like" ADD COLUMN IF NOT EXISTS "unlikedAt" TIMESTAMPTZ;

-- every public count filters on this, and almost every row matches it
CREATE INDEX IF NOT EXISTS "Like_standing_idx"
  ON "Like" ("photoId") WHERE "unlikedAt" IS NULL;
