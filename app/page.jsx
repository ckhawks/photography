import Head from "next/head";
import styles from "./page.module.scss";
import NavigationSidebar from "../components/NavigationSidebar";
import GalleryView from "../components/Gallery/GalleryView";
import LikeButton from "../components/LikeButton";
import FilterControls from "../components/Gallery/FilterControls";
import ImageDisplayFullWidth from "../components/Gallery/ImageDisplayFullWidth";
import { formatRelativeTimestamp } from "../util/date";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAlignJustify,
  faCircle,
  faTableCells,
} from "@fortawesome/free-solid-svg-icons";
import { ArrowLeft, ArrowRight } from "react-feather";

export default async function PhotographyGallery({ searchParams }) {
  const params = await searchParams; // ✅ Await searchParams since it's now async
  const currentPage = params.page ? parseInt(params.page, 10) : 1;
  const currentView = params.view || "grid";

  // ✅ Fix: Ensure `photos` is always an array
  let selectedTiers = [];

  if (params.photos) {
    selectedTiers = Array.isArray(params.photos)
      ? params.photos.map(Number) // Case where it's already an array (like `?photos=1&photos=2`)
      : params.photos.split(",").map(Number); // Case where it's a string (`?photos=1,2,3`)
  }

  // ✅ Ensure valid numbers and apply default `[3]` if empty
  selectedTiers = selectedTiers.filter((num) => !isNaN(num));
  if (selectedTiers.length === 0) {
    selectedTiers = [3];
  }

  // Fetch photos **on the server**
  const tierQuery = selectedTiers.map((tier) => `photos=${tier}`).join("&");
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/photos?page=${currentPage}&${tierQuery}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return <p className="error-message">Failed to load photos</p>;
  }

  const { photos, totalPages } = await res.json();

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
          <h1 className={styles.title}>Gallery</h1>
          <p className={styles.description}>
            Here's my best work. You can toggle tiers of photos using the
            controls below.
          </p>

          <div className={styles["controls-section"]}>
            <FilterControls selectedTiers={selectedTiers} />
            <div
              className={`${styles["controls-group"]} ${styles["controls-view"]}`}
            >
              <div className={styles["controls-label"]}>View</div>
              <div className={styles["controls-buttons"]}>
                {["grid", "column"].map((viewMode) => {
                  // Preserve selected photo tiers in the URL
                  const newSearchParams = new URLSearchParams();
                  selectedTiers.forEach((tier) =>
                    newSearchParams.append("photos", tier)
                  );
                  newSearchParams.set("view", viewMode);

                  return (
                    <Link
                      key={viewMode}
                      href={`/?${newSearchParams.toString()}`}
                      className={`${styles["control-button"]} ${
                        currentView === viewMode ? styles.active : ""
                      }`}
                      replace
                    >
                      <FontAwesomeIcon
                        icon={
                          viewMode === "grid" ? faTableCells : faAlignJustify
                        }
                      />{" "}
                      {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
                      {currentView === viewMode && (
                        <FontAwesomeIcon
                          icon={faCircle}
                          className={styles["circle"]}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {currentView === "grid" ? (
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
                  <ImageDisplayFullWidth
                    image={photo}
                    key={photo.s3Key}
                    overlay
                  />
                  {/* <img
                    className={styles.photo}
                    src={`/api/resource/${photo.s3Key}`}
                    alt={photo.originalFilename}
                  />
                  <div className={styles.photoMetaRow}>
                    <span className={styles.date}>#{photo.id}</span>
                    <LikeButton initialLikes={photo.likes} photoId={photo.id} />
                    <span className={styles.date}>
                      {formatRelativeTimestamp(photo.createdAt)}
                    </span>
                  </div> */}
                </div>
              ))}
            </div>
          )}
          {/* Pagination Controls */}
          {/* Pagination Controls */}
          {totalPages != 1 && totalPages != 0 && (
            <div
              className={`${"pagination"} ${styles.row}`}
              style={{ gap: "1rem", justifyContent: "center" }}
            >
              {currentPage > 1 && (
                <Link
                  href={`/?${tierQuery}&view=${currentView}&page=${
                    currentPage - 1
                  }`}
                  className={styles["button"]}
                >
                  <ArrowLeft size={14} /> Previous
                </Link>
              )}
              <span>
                Page {currentPage} of {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/?${tierQuery}&view=${currentView}&page=${
                    currentPage + 1
                  }`}
                  className={styles["button"]}
                >
                  Next <ArrowRight size={14} />
                </Link>
              )}
            </div>
          )}
          {photos.length === 0 && <p>No photos to display.</p>}
        </div>
      </div>
    </div>
  );
}
