import Head from "next/head";
import styles from "./page.module.scss";
import NavigationSidebar from "../components/NavigationSidebar";
import LikeButton from "../components/LikeButton";
import GalleryView from "../components/Gallery/GalleryView";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAlignJustify,
  faCircle,
  faTableCells,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { formatRelativeTimestamp } from "../util/date";

export default async function HallOfFame({ searchParams }) {
  // const params = await searchParams;
  const currentPage = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const view = searchParams.view || "grid";

  let photos = [];
  let totalPages = 1;
  let error = null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/photos/halloffame?page=${currentPage}`,
      {
        cache: "no-store", // Ensures fresh data
      }
    );

    if (!res.ok) throw new Error("Failed to load photos");

    const data = await res.json();
    photos = data.photos;
    totalPages = data.totalPages;
  } catch (err) {
    error = err.message;
  }

  return (
    <div className={`${styles.home} ${styles.body}`}>
      <NavigationSidebar />
      <div className={styles.all}>
        <Head>
          <link
            href="https://fonts.googleapis.com/css?family=Inter"
            rel="stylesheet"
          />
        </Head>
        <div className={styles.container}>
          <h1 className={styles.title}>Hall of Fame</h1>
          <p className={styles.description}>Here's my personal best work.</p>

          {error && <p className="error-message">{error}</p>}

          <div className={styles["controls-section"]}>
            {/* <div className={styles["controls-group"]}>
              <div className={styles["controls-label"]}>Order</div>
              <div className={styles["controls-buttons"]}>
                <Link
                  href={"/" + props.category.key + "/" + "random" + "/" + view}
                  className={`${styles["control-button"]} ${
                    ordering === "random" ? styles.active : ""
                  }`}
                  replace
                >
                  <FontAwesomeIcon icon={faShuffle} /> Random
                  {ordering === "random" && (
                    <FontAwesomeIcon
                      icon={faCircle}
                      className={styles["circle"]}
                    />
                  )}
                </Link>
                <Link
                  href={"/" + props.category.key + "/" + "inorder" + "/" + view}
                  className={`${styles["control-button"]} ${
                    ordering === "inorder" ? styles.active : ""
                  }`}
                  replace
                >
                  <FontAwesomeIcon icon={faArrowDownShortWide} /> In Order
                  {ordering === "inorder" && (
                    <FontAwesomeIcon
                      icon={faCircle}
                      className={styles["circle"]}
                    />
                  )}
                </Link>
              </div>
            </div> */}
            <div
              className={`${styles["controls-group"]} ${styles["controls-view"]}`}
            >
              <div className={styles["controls-label"]}>View</div>
              <div className={styles["controls-buttons"]}>
                <Link
                  href={"/?view=grid"}
                  className={`${styles["control-button"]} ${
                    view === "grid" ? styles.active : ""
                  }`}
                  replace
                >
                  <FontAwesomeIcon icon={faTableCells} /> Grid
                  {view === "grid" && (
                    <FontAwesomeIcon
                      icon={faCircle}
                      className={styles["circle"]}
                    />
                  )}
                </Link>
                <Link
                  href={"/?view=column"}
                  className={`${styles["control-button"]} ${
                    view === "column" ? styles.active : ""
                  }`}
                  replace
                >
                  <FontAwesomeIcon icon={faAlignJustify} /> Column
                  {view === "column" && (
                    <FontAwesomeIcon
                      icon={faCircle}
                      className={styles["circle"]}
                    />
                  )}
                </Link>
              </div>
            </div>
          </div>

          {view === "grid" ? (
            <GalleryView images={photos} />
          ) : (
            <div
              className="photo-grid"
              style={{
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
              }}
            >
              {photos.map((photo) => (
                <div key={photo.id} className={styles["photo-card"]}>
                  <img
                    className={styles.photo}
                    src={`/api/resource/${photo.s3Key}`}
                    alt={photo.originalFilename}
                  />
                  <div className={styles.photoMetaRow}>
                    <LikeButton initialLikes={photo.likes} photoId={photo.id} />
                    <span className={styles.date}>
                      {formatRelativeTimestamp(photo.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
