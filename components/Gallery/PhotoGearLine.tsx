"use client";

import Link from "next/link";
import styles from "../../app/page.module.scss";
import { normalizeCamera, normalizeLens } from "../../util/images/normalizeGear";

/**
 * What the photo was shot on, when anything is known. Film leads with the
 * stock, digital with the body — that is the part that means something in
 * each case. Both then name the body and lens. Renders nothing at all rather
 * than an empty row.
 */
export default function PhotoGearLine({ photo }) {
  const parts = [];

  // model codes become real names for display only; what is stored is
  // untouched, and a name typed by hand passes through as written
  const camera = normalizeCamera(null, photo.camera);
  const lens = normalizeLens(photo.lens);

  if (photo.medium === "film") {
    if (photo.filmStock) parts.push(photo.filmStock);
    if (camera) parts.push(camera);
    if (lens) parts.push(lens);
    if (!parts.length) parts.push("Film");
  } else {
    if (camera) parts.push(camera);
    if (lens) parts.push(lens);
  }

  const exif = photo.exif ?? {};
  const settings = [
    exif.focalLength && `${Math.round(exif.focalLength)}mm`,
    exif.aperture && `f/${exif.aperture}`,
    exif.shutter,
    exif.iso && `ISO ${exif.iso}`,
  ].filter(Boolean);

  const album = photo.albumSlug && photo.albumTitle;

  if (!parts.length && !settings.length && !album) return null;

  return (
    <div className={styles.photoGearLine}>
      {parts.length > 0 && <span>{parts.join(" · ")}</span>}
      {settings.length > 0 && (
        <span className={styles.photoGearSettings}>{settings.join(" · ")}</span>
      )}
      {album && (
        <Link
          href={`/albums/${photo.albumSlug}`}
          className={styles.photoAlbumLink}
          onClick={(event) => event.stopPropagation()}
        >
          from {photo.albumTitle}
        </Link>
      )}
    </div>
  );
}
