-- The unedited version of a photo, for the lightbox before/after toggle.
--
-- For film this is the raw scan behind a fix -- a straighten, a spot removal.
-- Straightening is the case that justifies an in-place swap rather than a
-- side-by-side: two frames a few degrees apart in separate boxes just look
-- like two photos, but swapped in place the edges jump and the change is the
-- most obvious thing on screen.
--
-- Nullable, and NULL is the normal state: only a frame whose edit genuinely
-- differs from its scan ever gets one, which is 127 of 763 today. The toggle
-- appears only where this is set.

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "beforeS3Key" VARCHAR;
