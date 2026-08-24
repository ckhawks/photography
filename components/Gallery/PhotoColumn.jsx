import ImageDisplayFullWidth from "./ImageDisplayFullWidth";
import styles from "../../app/page.module.scss";

/**
 * One photo per row, full width. The counterpart to GalleryView, and the only
 * layout below 1280px — the wall needs more width than a phone has.
 */
export default function PhotoColumn({ images }) {
  return (
    <div
      className="photo-grid"
      style={{ display: "flex", alignItems: "center", flexDirection: "column" }}
    >
      {images.map((image) => (
        <div key={image.id} className={styles["photo-card"]}>
          <ImageDisplayFullWidth image={image} overlay />
        </div>
      ))}
    </div>
  );
}
