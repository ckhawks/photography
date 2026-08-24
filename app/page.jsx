import Head from "next/head";
import styles from "./page.module.scss";
import NavigationSidebar from "../components/NavigationSidebar";
import GalleryView from "../components/Gallery/GalleryView";
import FilterControls from "../components/Gallery/FilterControls";
import ImageDisplayFullWidth from "../components/Gallery/ImageDisplayFullWidth";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAlignJustify,
  faCircle,
  faTableCells,
} from "@fortawesome/free-solid-svg-icons";
import { ArrowLeft, ArrowRight } from "react-feather";
import ViewModeHandler from "../components/Gallery/ViewModeHandler";
import { getGalleryPhotos } from "../util/db/photos";

// short and URL-safe: it only has to differ between visits
const makeSeed = () => Math.random().toString(36).slice(2, 10);

export default async function PhotographyGallery({ searchParams }) {
  const params = await searchParams;
  const currentPage = params.page ? parseInt(params.page, 10) : 1;
  const currentView = params.view || "grid";

  let selectedTiers = [];

  if (params.photos) {
    selectedTiers = Array.isArray(params.photos)
      ? params.photos.map(Number)
      : params.photos.split(",").map(Number);
  }

  selectedTiers = selectedTiers.filter((num) => !isNaN(num));
  if (selectedTiers.length === 0) {
    // showcase + notable: both are presentable work, and the Timeline is where
    // extras will live. Interleaved by date on purpose, not ranked by tier.
    selectedTiers = [3, 2];
  }

  // A shuffle needs the same seed on every page, or page 2 is drawn from a
  // different order and photos repeat or vanish. It is made once per visit and
  // carried in the links.
  const seed = typeof params.seed === "string" && params.seed ? params.seed : makeSeed();
  const sort = typeof params.sort === "string" ? params.sort : "shuffle";

  // carried in the pagination links below
  const tierQuery = [
    ...selectedTiers.map((tier) => `photos=${tier}`),
    `seed=${encodeURIComponent(seed)}`,
    ...(sort !== "shuffle" ? [`sort=${encodeURIComponent(sort)}`] : []),
  ].join("&");

  // Query the database directly. This used to fetch its own /api/photos route
  // over HTTP from a server component, which is a round trip to itself on every
  // render and breaks outright if NEXT_PUBLIC_BASE_URL is wrong.
  let photos = [];
  let totalPages = 1;
  try {
    ({ photos, totalPages } = await getGalleryPhotos({
      page: currentPage,
      tiers: selectedTiers,
      sort,
      seed,
    }));
  } catch (error) {
    console.error("Failed to load photos:", error);
    return <p className="error-message">Failed to load photos</p>;
  }

  return (
    <>
      <ViewModeHandler view={currentView} />
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

            {/* Controls Section */}
            <div className={styles["controls-section"]}>
              <FilterControls selectedTiers={selectedTiers} />
              <div
                className={`${styles["view-controls"]} ${styles["controls-group"]}`}
              >
                <div className={styles["controls-label"]}>View</div>
                <div className={styles["controls-buttons"]}>
                  {["grid", "column"].map((viewMode) => {
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

            {/* Gallery Section */}
            {currentView === "column" ? (
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
                  </div>
                ))}
              </div>
            ) : (
              <GalleryView images={photos} />
            )}

            {/* Pagination Controls */}
            <br />
            {totalPages > 1 && (
              <div
                className={`${styles["pagination-group"]} ${styles.row}`}
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
    </>
  );
}
