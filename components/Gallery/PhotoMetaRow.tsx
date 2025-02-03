"use client";

import styles from "../../app/page.module.scss";
import LikeButton from "../LikeButton";
import { formatRelativeTimestamp } from "../../util/date";
import { PHOTO_TIERS } from "../../constants/photoTiers";

export default function PhotoMetaRow({ photo }) {
  return (
    <div className={styles.photoMetaRow}>
      <span className={styles.date}>{PHOTO_TIERS[photo.tier]}</span>
      <span className={styles.date}>#{photo.id}</span>
      <LikeButton initialLikes={photo.likes} photoId={photo.id} />
      <span className={styles.date}>
        {formatRelativeTimestamp(photo.createdAt)}
      </span>
    </div>
  );
}
