import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, EyeOff } from "react-feather";
import styles from "../../page.module.scss";
import albumStyles from "./album.module.scss";
import NavigationSidebar from "../../../components/NavigationSidebar";
import GalleryView from "../../../components/Gallery/GalleryView";
import PhotoColumn from "../../../components/Gallery/PhotoColumn";
import ViewControls from "../../../components/Gallery/ViewControls";
import ViewModeHandler from "../../../components/Gallery/ViewModeHandler";
import MediumControls from "../../../components/Gallery/MediumControls";
import { getAlbumBySlug } from "../../../util/db/albums";
import { mediumFromParam } from "../../../constants/mediums";

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

export default async function Album({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const sort = query?.sort === "chronological" ? "chronological" : "best";
  const view = query?.view === "column" ? "column" : "grid";
  const medium = mediumFromParam(query?.medium);

  let result = null;
  try {
    result = await getAlbumBySlug(slug, sort);
  } catch (error) {
    console.error("Failed to load album:", error);
    return <p className="error-message">Failed to load this album</p>;
  }

  if (!result) notFound();

  const { album, photos: allPhotos, more: allMore } = result;

  // Filtered here rather than in SQL: the album query already returns the whole
  // album so it can split the okays into "Want more?", and a second round trip
  // to re-fetch a subset of what is already in hand buys nothing.
  const byMedium = (list) => (medium ? list.filter((photo) => photo.medium === medium) : list);
  const photos = byMedium(allPhotos);
  const more = byMedium(allMore);

  // The chips appear only where they can do something. Four of five albums hold
  // one medium, and on those this is a control whose every state shows the same
  // photos -- so it hides itself rather than being a decision to maintain.
  const mediumCounts = [...allPhotos, ...allMore].reduce((counts, photo) => {
    counts[photo.medium] = (counts[photo.medium] || 0) + 1;
    return counts;
  }, {});
  const isMixed = mediumCounts.film > 0 && mediumCounts.digital > 0;

  const photosView = view === "column" ? PhotoColumn : GalleryView;

  return (
    <div className={`${styles.home} ${styles.body}`}>
      <ViewModeHandler view={view} />
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

          {/*
            Guarded on the unfiltered album, not the filtered view: filtering
            down to a single photo would otherwise remove the very chips you
            need to filter back out again.
          */}
          {allPhotos.length > 1 && (
            <div className={albumStyles.controls}>
            <div className={albumStyles.sort}>
              <Link
                href={`/albums/${slug}${medium ? `?medium=${medium}` : ""}`}
                className={`${albumStyles.sortLink} ${sort === "best" ? albumStyles.sortActive : ""}`}
              >
                Best first
              </Link>
              <Link
                href={`/albums/${slug}?sort=chronological${medium ? `&medium=${medium}` : ""}`}
                className={`${albumStyles.sortLink} ${sort === "chronological" ? albumStyles.sortActive : ""}`}
              >
                In order
              </Link>
            </div>
            {isMixed && (
              <MediumControls
                medium={medium}
                basePath={`/albums/${slug}`}
                params={[
                  ...(sort === "chronological" ? [["sort", "chronological"]] : []),
                  ...(view === "column" ? [["view", "column"]] : []),
                ]}
              />
            )}
            <ViewControls
              view={view}
              basePath={`/albums/${slug}`}
              params={[
                ...(sort === "chronological" ? [["sort", "chronological"]] : []),
                ...(medium ? [["medium", medium]] : []),
              ]}
            />
            </div>
          )}

          {photos.length === 0 && more.length === 0 ? (
            <p className={albumStyles.empty}>No photos in this album yet.</p>
          ) : (
            React.createElement(photosView, { images: photos })
          )}

          {/* the okay ones: published, but you have to ask for them */}
          {more.length > 0 && (
            <details className={albumStyles.more}>
              <summary className={albumStyles.moreSummary}>
                <span>Want more?</span>
                <span className={albumStyles.moreCount}>
                  {more.length} more from this album
                </span>
              </summary>
              <p className={albumStyles.moreNote}>
                The weaker ones &mdash; here if you want to see everything.
              </p>
              {React.createElement(photosView, { images: more })}
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
