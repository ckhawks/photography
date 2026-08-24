"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "inter-ui/inter.css";
import { ArrowLeft, ArrowRight, Heart, Layout, Search, Trash2, Upload, X } from "react-feather";
import styles from "../../page.module.scss";
import adminStyles from "./photos.module.scss";
import NavigationSidebar from "../../../components/NavigationSidebar";
import Unauthorized from "../../../components/Unauthorized";
import { formatRelativeTimestamp } from "../../../util/date";
import { thumbnailUrl } from "../../../constants/images";
import PhotoGearEditor from "../../../components/PhotoGearEditor";
import AlbumPicker from "../../../components/AlbumPicker";
import { normalizeCamera, normalizeLens } from "../../../util/images/normalizeGear";
import { RATINGS, ratingById } from "../../../constants/ratings";

const RATING_CHOICES = [...RATINGS].reverse();
const PAGE_SIZES = [60, 120, 240];

const PhotoManagement = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(120);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // filters, which is how you find the ones you need rather than paging
  const [search, setSearch] = useState("");
  const [albumFilter, setAlbumFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");

  const [selected, setSelected] = useState(() => new Set<number>());
  const [replacing, setReplacing] = useState(false);
  const [keepAsBefore, setKeepAsBefore] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);

  useEffect(() => {
    setIsAuthenticated(
      Boolean(document.cookie.split("; ").find((row) => row.startsWith("client-auth=")))
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ page: String(currentPage), pageSize: String(pageSize) });
      if (albumFilter) query.set("albumId", albumFilter);
      if (ratingFilter) query.set("rating", ratingFilter);
      if (search.trim()) query.set("search", search.trim());

      const res = await fetch(`/api/admin/photos?${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load photos");

      setPhotos(data.photos);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, albumFilter, ratingFilter, search]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  // a filter change makes page 3 meaningless, and a selection cannot span pages
  useEffect(() => {
    setCurrentPage(1);
    setSelected(new Set());
  }, [albumFilter, ratingFilter, search, pageSize]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/admin/albums")
      .then((res) => (res.ok ? res.json() : { albums: [] }))
      .then((data) => setAlbums(data.albums ?? []))
      .catch((err) => console.error("Failed to load albums:", err));
  }, [isAuthenticated]);

  const createAlbum = async (album) => {
    const res = await fetch("/api/admin/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(album),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create album");
    setAlbums((prev) =>
      [...prev, data.album].sort((a, b) => String(b.shootDate).localeCompare(String(a.shootDate)))
    );
    return data.album;
  };

  const updatePhoto = async (id, changes) => {
    const res = await fetch("/api/admin/photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...changes }),
    });
    if (!res.ok) throw new Error("Failed to update photo");

    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === id
          ? {
              ...photo,
              ...changes,
              ...(changes.rating !== undefined
                ? { tier: ratingById(changes.rating)?.tier ?? photo.tier }
                : {}),
            }
          : photo
      )
    );
  };

  /**
   * Swap the image behind a photo without losing the row. The outgoing image
   * becomes the before by default: this exists for publishing an edit of a
   * frame that went up unedited, which is exactly a before/after pair.
   */
  const replaceImage = async (id, file, keepAsBefore) => {
    setReplacing(true);
    try {
      const body = new FormData();
      body.append("photoId", String(id));
      body.append("file", file);
      body.append("keepAsBefore", keepAsBefore ? "true" : "false");

      const res = await fetch("/api/admin/version", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to replace the image");

      setPhotos((prev) =>
        prev.map((photo) => (photo.id === id ? { ...photo, ...data.photo } : photo))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setReplacing(false);
    }
  };

  const updateSelected = async (changes) => {
    setLoading(true);
    try {
      await Promise.all([...selected].map((id) => updatePhoto(id, changes)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removePhotos = async (ids) => {
    if (!confirm(ids.length === 1 ? "Delete this photo?" : `Delete ${ids.length} photos?`)) return;
    setLoading(true);
    try {
      const targets = photos.filter((photo) => ids.includes(photo.id));
      await Promise.all(
        targets.map((photo) =>
          fetch("/api/admin/photos", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: photo.id, fileKey: photo.s3Key }),
          })
        )
      );
      setPhotos((prev) => prev.filter((photo) => !ids.includes(photo.id)));
      setSelected(new Set());
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id, event) => {
    // shift-click extends, the way a file browser does
    if (event?.shiftKey && selected.size) {
      const ids = photos.map((photo) => photo.id);
      const last = [...selected][selected.size - 1];
      const from = ids.indexOf(last);
      const to = ids.indexOf(id);
      if (from !== -1 && to !== -1) {
        const span = ids.slice(Math.min(from, to), Math.max(from, to) + 1);
        setSelected((prev) => new Set([...prev, ...span]));
        return;
      }
    }

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const editingPhoto = useMemo(
    () => photos.find((photo) => photo.id === editing) ?? null,
    [photos, editing]
  );

  if (!isAuthenticated) return <Unauthorized />;

  return (
    <div className={`${styles.home} ${styles.body}`}>
      <NavigationSidebar />
      <div className={styles.all}>
        <div className={styles.container}>
          <div className={adminStyles.header}>
            <div>
              <h1 className={styles.title}>Manage</h1>
              <p className={adminStyles.subtitle}>
                {total} photo{total === 1 ? "" : "s"}
                {(albumFilter || ratingFilter || search) && " matching"}
              </p>
            </div>
            <div className={adminStyles.headerActions}>
              <Link href="/admin/likes" className={adminStyles.secondaryButton}>
                <Heart size={15} />
                Likes
              </Link>
              <Link href="/admin/wall" className={adminStyles.secondaryButton}>
                <Layout size={15} />
                Wall order
              </Link>
              <Link href="/admin/upload" className={adminStyles.uploadButton}>
                <Upload size={15} />
                Upload
              </Link>
            </div>
          </div>

          <div className={adminStyles.filters}>
            <div className={adminStyles.searchBox}>
              <Search size={15} />
              <input
                placeholder="#id, filename, camera, film"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              className={adminStyles.filterSelect}
              value={albumFilter}
              onChange={(event) => setAlbumFilter(event.target.value)}
              aria-label="Album"
            >
              <option value="">Any album</option>
              <option value="none">No album</option>
              {albums.map((album) => (
                <option value={album.id} key={album.id}>
                  {album.title} ({album.photoCount})
                </option>
              ))}
            </select>

            <select
              className={adminStyles.filterSelect}
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value)}
              aria-label="Rating"
            >
              <option value="">Any rating</option>
              <option value="none">No rating</option>
              {RATING_CHOICES.map((rating) => (
                <option value={rating.id} key={rating.id}>
                  {rating.label}
                </option>
              ))}
            </select>

            <select
              className={adminStyles.filterSelect}
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              aria-label="Photos per page"
            >
              {PAGE_SIZES.map((size) => (
                <option value={size} key={size}>
                  {size} per page
                </option>
              ))}
            </select>

            <button
              type="button"
              className={adminStyles.textButton}
              onClick={() =>
                setSelected(
                  selected.size === photos.length
                    ? new Set()
                    : new Set(photos.map((photo) => photo.id))
                )
              }
            >
              {selected.size === photos.length && photos.length > 0
                ? "Deselect all"
                : `Select all ${photos.length}`}
            </button>

            {loading && <span className={adminStyles.working}>Working...</span>}
          </div>

          {error && <p className={adminStyles.error}>{error}</p>}

          {selected.size > 0 && (
            <div className={adminStyles.selectionBar}>
              <div className={adminStyles.selectionGroup}>
                <span className={adminStyles.selectionCount}>{selected.size} selected</span>
                <select
                  className={adminStyles.selectionSelect}
                  value=""
                  onChange={(event) =>
                    event.target.value && updateSelected({ rating: event.target.value })
                  }
                >
                  <option value="" disabled>
                    Rate...
                  </option>
                  {RATING_CHOICES.map((option) => (
                    <option value={option.id} key={option.id}>
                      {option.label} · {option.where}
                    </option>
                  ))}
                </select>
                <select
                  className={adminStyles.selectionSelect}
                  value=""
                  onChange={(event) =>
                    event.target.value &&
                    updateSelected({
                      albumId: event.target.value === "none" ? null : Number(event.target.value),
                    })
                  }
                >
                  <option value="" disabled>
                    File into...
                  </option>
                  <option value="none">No album</option>
                  {albums.map((album) => (
                    <option value={album.id} key={album.id}>
                      {album.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className={adminStyles.selectionGroup}>
                <button
                  type="button"
                  className={adminStyles.clearSelection}
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className={adminStyles.deleteButton}
                  onClick={() => removePhotos([...selected])}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Tiles carry no controls: the rating shows as a dot, everything else
              appears on hover or in the panel for one photo. */}
          <div className={adminStyles.grid}>
            {photos.map((photo) => {
              const rating = ratingById(photo.rating);
              return (
                <div
                  key={photo.id}
                  className={`${adminStyles.tile} ${selected.has(photo.id) ? adminStyles.selected : ""} ${
                    editing === photo.id ? adminStyles.editing : ""
                  }`}
                  onClick={(event) => toggle(photo.id, event)}
                >
                  <img
                    src={thumbnailUrl(photo)}
                    alt={photo.originalFilename || "Photograph"}
                    loading="lazy"
                    decoding="async"
                  />

                  <span
                    className={adminStyles.dot}
                    data-rating={photo.rating ?? "unrated"}
                    title={rating ? `${rating.label} — ${rating.where}` : "No rating"}
                  />

                  <div className={adminStyles.tileBar}>
                    <span className={adminStyles.tileName}>
                      {rating?.label ?? "unrated"}
                      {photo.albumTitle ? ` · ${photo.albumTitle}` : " · no album"}
                    </span>
                    <button
                      type="button"
                      className={adminStyles.tileEdit}
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditing(editing === photo.id ? null : photo.id);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {photos.length === 0 && !loading && (
            <p className={adminStyles.empty}>Nothing matches those filters.</p>
          )}

          <div className={adminStyles.pagination}>
            <button
              type="button"
              className={adminStyles.pageButton}
              onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <span className={adminStyles.pageLabel}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className={adminStyles.pageButton}
              onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* one photo at a time, where the fiddly fields live */}
      {editingPhoto && (
        <aside className={adminStyles.panel}>
          <div className={adminStyles.panelHeader}>
            <span>#{editingPhoto.id}</span>
            <button type="button" onClick={() => setEditing(null)} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <img
            className={adminStyles.panelImage}
            src={thumbnailUrl(editingPhoto)}
            alt={editingPhoto.originalFilename || "Photograph"}
          />

          <div className={adminStyles.panelBody}>
            <div className={adminStyles.panelFilename}>{editingPhoto.originalFilename}</div>

            <select
              className={adminStyles.panelSelect}
              value={editingPhoto.rating ?? ""}
              onChange={(event) => updatePhoto(editingPhoto.id, { rating: event.target.value || null })}
              aria-label="Rating"
            >
              <option value="">No rating</option>
              {RATING_CHOICES.map((option) => (
                <option value={option.id} key={option.id}>
                  {option.label} · {option.where}
                </option>
              ))}
            </select>

            <AlbumPicker
              albums={albums}
              value={editingPhoto.albumId}
              onAssign={(albumId) => updatePhoto(editingPhoto.id, { albumId })}
              onCreate={createAlbum}
            />

            <PhotoGearEditor photo={editingPhoto} onSave={updatePhoto} />

            <div className={adminStyles.panelFacts}>
              {[
                normalizeCamera(null, editingPhoto.camera),
                normalizeLens(editingPhoto.lens),
                editingPhoto.filmStock,
                editingPhoto.width && `${editingPhoto.width} × ${editingPhoto.height}`,
                `${editingPhoto.likes} like${editingPhoto.likes === 1 ? "" : "s"}`,
                formatRelativeTimestamp(editingPhoto.createdAt),
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>

            <div className={adminStyles.panelReplace}>
              <label className={adminStyles.panelReplaceButton}>
                <Upload size={14} />
                {replacing ? "Replacing..." : "Upload a new version"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={replacing}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    // the input keeps its value, so re-picking the same file
                    // after a failure would not fire change again
                    event.target.value = "";
                    if (file) replaceImage(editingPhoto.id, file, keepAsBefore);
                  }}
                />
              </label>
              <label className={adminStyles.panelReplaceOption}>
                <input
                  type="checkbox"
                  checked={keepAsBefore}
                  onChange={(event) => setKeepAsBefore(event.target.checked)}
                />
                Keep the current image as the before
              </label>
            </div>

            <button
              type="button"
              className={adminStyles.panelDelete}
              onClick={() => removePhotos([editingPhoto.id])}
            >
              <Trash2 size={14} />
              Delete this photo
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};

export default PhotoManagement;
