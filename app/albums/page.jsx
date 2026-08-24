import Link from "next/link";
import { ChevronRight } from "react-feather";
import styles from "../page.module.scss";
import albumStyles from "./albums.module.scss";
import NavigationSidebar from "../../components/NavigationSidebar";
import { getAlbumsWithPreviews } from "../../util/db/albums";
import { pileLayoutFor, printBox } from "../../constants/pileLayouts";
import { thumbnailUrl } from "../../constants/images";

export const metadata = {
  title: "Albums — stlr.cx",
};

const DRIFT_CLASS = {
  a: albumStyles.driftA,
  b: albumStyles.driftB,
  c: albumStyles.driftC,
  d: albumStyles.driftD,
  e: albumStyles.driftE,
};

// The shoot date is a DATE column, so it has no time zone. Formatting it with
// the local one would show the previous day for anyone west of UTC.
function shootDateParts(shootDate) {
  const value = shootDate instanceof Date ? shootDate : new Date(shootDate);
  return {
    month: value.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" }),
    year: value.toLocaleDateString("en-GB", { year: "numeric", timeZone: "UTC" }),
  };
}

export default async function Albums() {
  let albums = [];
  try {
    albums = await getAlbumsWithPreviews();
  } catch (error) {
    console.error("Failed to load albums:", error);
    return <p className="error-message">Failed to load albums</p>;
  }

  return (
    <div className={`${styles.home} ${styles.body}`}>
      <NavigationSidebar />
      <div className={styles.all}>
        <div className={styles.container}>
          <h1 className={styles.title}>Albums</h1>
          <p className={styles.description}>Every shoot, newest first.</p>

          {albums.length === 0 && (
            <div className={albumStyles.empty}>
              No shoots yet. Photos get grouped into one once they have a shoot.
            </div>
          )}

          <div className={albumStyles.rows}>
            {albums.map((album) => {
              const date = shootDateParts(album.shootDate);
              const layout = pileLayoutFor(album.id);

              return (
                <div className={albumStyles.row} key={album.id}>
                  <div className={albumStyles.rail}>
                    <div className={albumStyles.railMonth}>{date.month}</div>
                    <div className={albumStyles.railYear}>{date.year}</div>
                    <span className={albumStyles.dot} aria-hidden="true" />
                  </div>

                  <div className={albumStyles.rowBody}>
                    <Link href={`/albums/${album.slug}`} className={albumStyles.card}>
                      <div className={albumStyles.cardText}>
                        <div className={albumStyles.cardTitle}>{album.title}</div>
                        <div className={albumStyles.cardMeta}>
                          {/* "12 edited · 36 photos" is worth saying;
                              "14 edited · 14 photos" is just noise */}
                          {album.editedCount > 0 &&
                            album.editedCount < album.photoCount &&
                            `${album.editedCount} edited · `}
                          {album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}
                        </div>
                      </div>

                      <div className={albumStyles.pile}>
                        <div className={albumStyles.pileInner}>
                        {album.preview.map((photo, index) => {
                          const spot = layout[index];
                          if (!spot) return null;
                          const box = printBox(spot, photo);

                          return (
                            <div
                              key={photo.id}
                              className={`${albumStyles.print} ${DRIFT_CLASS[spot.drift]}`}
                              style={{
                                left: spot.left,
                                marginTop: spot.offsetY,
                                zIndex: spot.z,
                                transform: `translateY(-50%) rotate(${spot.rotate}deg)`,
                              }}
                            >
                              <img
                                src={thumbnailUrl(photo)}
                                alt={photo.originalFilename || "Photograph"}
                                loading="lazy"
                                decoding="async"
                                style={{ width: box.width, height: box.height }}
                              />
                            </div>
                          );
                        })}
                        </div>
                      </div>

                      <ChevronRight size={20} className={albumStyles.go} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
