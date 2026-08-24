"use client";

import styles from "../../app/page.module.scss";
import LikeButton from "../LikeButton";
import { formatRelativeTimestamp } from "../../util/date";
import { PHOTO_TIERS } from "../../constants/photoTiers";

export default function PhotoMetaRow({ photo, hint = null }) {
  return (
    <div className={styles.photoMetaRow}>
      <span className={styles.date}>{PHOTO_TIERS[photo.tier]}</span>
      <span className={styles.date}>#{photo.id}</span>
      <LikeButton initialLikes={photo.likes} photoId={photo.id} />
      {/*
        The server renders this at request time and the client re-renders it at
        hydration time, so a photo sitting on a minute boundary reads "32
        minutes ago" in the HTML and "33 minutes ago" on the client. The text
        is approximate by definition, so let the server's value stand.
      */}
      <span className={styles.date} suppressHydrationWarning>
        {formatRelativeTimestamp(photo.createdAt)}
      </span>
      {/* inline, because the lightbox has no room for another line */}
      {hint && <span className={styles.date}>{hint}</span>}
    </div>
  );
}
