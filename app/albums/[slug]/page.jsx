import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, EyeOff } from "react-feather";
import styles from "../../page.module.scss";
import albumStyles from "./album.module.scss";
import NavigationSidebar from "../../../components/NavigationSidebar";
import GalleryView from "../../../components/Gallery/GalleryView";
import { getAlbumBySlug } from "../../../util/db/albums";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await getAlbumBySlug(slug);
  return { title: result ? `${result.album.title} — stlr.cx` : "Not found — stlr.cx" };
}

function formatShootDate(shootDate) {
  const value = shootDate instanceof Date ? shootDate : new Date(shootDate);
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC", // a DATE column has no zone; local time would shift the day
  });
}

export default async function Album({ params }) {
  const { slug } = await params;

  let result = null;
  try {
    result = await getAlbumBySlug(slug);
  } catch (error) {
    console.error("Failed to load album:", error);
    return <p className="error-message">Failed to load this shoot</p>;
  }

  if (!result) notFound();

  const { album, photos } = result;

  return (
    <div className={`${styles.home} ${styles.body}`}>
      <NavigationSidebar />
      <div className={styles.all}>
        <div className={styles.container}>
          <Link href="/albums" className={albumStyles.back}>
            <ArrowLeft size={14} />
            Albums
          </Link>

          <div className={albumStyles.header}>
            <div>
              <div className={albumStyles.date}>{formatShootDate(album.shootDate)}</div>
              <h1 className={albumStyles.title}>{album.title}</h1>
            </div>
            <div className={albumStyles.counts}>
              {album.editedCount > 0 && (
                <div>
                  <div className={albumStyles.countValue}>{album.editedCount}</div>
                  <div className={albumStyles.countLabel}>edited</div>
                </div>
              )}
              <div>
                <div className={albumStyles.countValue}>{album.photoCount}</div>
                <div className={albumStyles.countLabel}>
                  {album.photoCount === 1 ? "photo" : "photos"}
                </div>
              </div>
            </div>
          </div>

          {album.visibility === "unlisted" && (
            <div className={albumStyles.unlisted}>
              <EyeOff size={13} />
              Unlisted — reachable by link, not shown on the Albums page
            </div>
          )}

          {photos.length === 0 ? (
            <p className={albumStyles.empty}>No photos in this shoot yet.</p>
          ) : (
            <GalleryView images={photos} />
          )}
        </div>
      </div>
    </div>
  );
}
