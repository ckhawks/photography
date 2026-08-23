"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "inter-ui/inter.css";
import { ArrowLeft, ArrowRight, Search, Trash2, Upload, X } from "react-feather";
import styles from "../page.module.scss";
import manageStyles from "./manage.module.scss";
import NavigationSidebar from "../../components/NavigationSidebar";
import Unauthorized from "../../components/Unauthorized";
import { formatRelativeTimestamp } from "../../util/date";
import { thumbnailUrl } from "../../constants/images";
import PhotoGearEditor from "../../components/PhotoGearEditor";
import ShootPicker from "../../components/ShootPicker";
import { normalizeCamera } from "../../util/images/normalizeGear";

const TIERS = [
  { value: 3, label: "Showcase" },
  { value: 2, label: "Notable" },
  { value: 1, label: "Extras" },
];

const PhotoManagement = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set<number>());

  useEffect(() => {
    setIsAuthenticated(
      Boolean(document.cookie.split("; ").find((row) => row.startsWith("client-auth=")))
    );
  }, []);

  useEffect(() => {
    async function fetchPhotos() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/photos?page=${currentPage}&sort=newest`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load photos");

        setPhotos(data.photos);
        setTotalPages(data.totalPages);
        setSelected(new Set()); // a selection cannot span pages
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPhotos();
  }, [currentPage]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/albums")
      .then((res) => (res.ok ? res.json() : { albums: [] }))
      .then((data) => setAlbums(data.albums ?? []))
      .catch((err) => console.error("Failed to load shoots:", err));
  }, [isAuthenticated]);

  const createShoot = async (shoot) => {
    const res = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shoot),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create shoot");

    setAlbums((prev) =>
      [...prev, data.album].sort((a, b) => String(b.shootDate).localeCompare(String(a.shootDate)))
    );
    return data.album;
  };

  const updatePhoto = async (id, changes) => {
    const res = await fetch("/api/manage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...changes }),
    });
    if (!res.ok) throw new Error("Failed to update photo");

    setPhotos((prev) => prev.map((photo) => (photo.id === id ? { ...photo, ...changes } : photo)));
  };

  /** The same change across every selected photo. */
  const updateSelected = async (changes) => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([...selected].map((id) => updatePhoto(id, changes)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deletePhoto = async (id, fileKey) => {
    if (!confirm("Delete this photo?")) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, fileKey }),
      });
      if (!res.ok) throw new Error("Failed to delete photo");

      setPhotos((prev) => prev.filter((photo) => photo.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selected.size} photos? This cannot be undone.`)) return;

    setLoading(true);
    setError(null);
    try {
      const targets = photos.filter((photo) => selected.has(photo.id));
      await Promise.all(
        targets.map((photo) =>
          fetch("/api/manage", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: photo.id, fileKey: photo.s3Key }),
          })
        )
      );
      setPhotos((prev) => prev.filter((photo) => !selected.has(photo.id)));
      setSelected(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return photos;
    return photos.filter((photo) =>
      [photo.originalFilename, photo.camera, photo.filmStock, `#${photo.id}`]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term))
    );
  }, [photos, search]);

  const tally = useMemo(() => {
    const counts = { 3: 0, 2: 0, 1: 0 };
    for (const photo of photos) counts[photo.tier] = (counts[photo.tier] ?? 0) + 1;
    return counts;
  }, [photos]);

  if (!isAuthenticated) return <Unauthorized />;

  return (
    <div className={`${styles.home} ${styles.body}`}>
      <NavigationSidebar />
      <div className={styles.all}>
        <div className={styles.container}>
          <div className={manageStyles.header}>
            <div>
              <h1 className={styles.title}>Manage</h1>
              <p className={manageStyles.subtitle}>
                {tally[3]} showcase · {tally[2]} notable · {tally[1]} extras on this page
              </p>
            </div>
            <div className={manageStyles.headerActions}>
              <div className={manageStyles.searchBox}>
                <Search size={15} />
                <input
                  placeholder="Filter this page"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} aria-label="Clear filter">
                    <X size={14} />
                  </button>
                )}
              </div>
              <Link href="/upload" className={manageStyles.uploadButton}>
                <Upload size={15} />
                Upload
              </Link>
            </div>
          </div>

          {error && <p className={manageStyles.error}>{error}</p>}

          {selected.size > 0 && (
            <div className={manageStyles.selectionBar}>
              <div className={manageStyles.selectionGroup}>
                <span className={manageStyles.selectionCount}>{selected.size} selected</span>
                <span className={manageStyles.selectionLabel}>Set tier</span>
                {TIERS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={manageStyles.selectionButton}
                    onClick={() => updateSelected({ tier: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
                <span className={manageStyles.selectionLabel}>Shoot</span>
                <select
                  className={manageStyles.selectionSelect}
                  value=""
                  onChange={(event) =>
                    updateSelected({
                      albumId: event.target.value === "none" ? null : Number(event.target.value),
                    })
                  }
                >
                  <option value="" disabled>
                    File into...
                  </option>
                  <option value="none">No shoot</option>
                  {albums.map((album) => (
                    <option value={album.id} key={album.id}>
                      {album.title} · {String(album.shootDate).slice(0, 10)}
                    </option>
                  ))}
                </select>
              </div>
              <div className={manageStyles.selectionGroup}>
                <button
                  type="button"
                  className={manageStyles.clearSelection}
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </button>
                <button type="button" className={manageStyles.deleteButton} onClick={deleteSelected}>
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          )}

          <div className={manageStyles.selectAllRow}>
            <button
              type="button"
              className={manageStyles.textButton}
              onClick={() =>
                setSelected(
                  selected.size === visible.length
                    ? new Set()
                    : new Set(visible.map((photo) => photo.id))
                )
              }
            >
              {selected.size === visible.length && visible.length > 0
                ? "Deselect all"
                : `Select all ${visible.length}`}
            </button>
            {loading && <span className={manageStyles.working}>Working...</span>}
          </div>

          <div className={manageStyles.grid}>
            {visible.map((photo) => (
              <div
                key={photo.id}
                className={`${manageStyles.card} ${selected.has(photo.id) ? manageStyles.selected : ""}`}
              >
                <div className={manageStyles.frame} onClick={() => toggle(photo.id)}>
                  <img src={thumbnailUrl(photo)} alt={photo.originalFilename || "Photograph"} />
                  <span
                    className={`${manageStyles.check} ${selected.has(photo.id) ? manageStyles.checked : ""}`}
                    aria-hidden="true"
                  />
                </div>

                <div className={manageStyles.cardBody}>
                  <div className={manageStyles.identity}>
                    <span className={manageStyles.filename} title={photo.originalFilename}>
                      #{photo.id} · {photo.originalFilename}
                    </span>
                    <button
                      type="button"
                      className={manageStyles.iconButton}
                      onClick={() => deletePhoto(photo.id, photo.s3Key)}
                      aria-label="Delete photo"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className={manageStyles.segmented}>
                    {TIERS.map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        className={`${manageStyles.segment} ${photo.tier === option.value ? manageStyles.active : ""}`}
                        onClick={() => updatePhoto(photo.id, { tier: option.value })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <ShootPicker
                    albums={albums}
                    value={photo.albumId}
                    onAssign={(albumId) => updatePhoto(photo.id, { albumId })}
                    onCreate={createShoot}
                  />

                  <PhotoGearEditor photo={photo} onSave={updatePhoto} />

                  <div className={manageStyles.footnote}>
                    {normalizeCamera(null, photo.camera) || "No camera"} ·{" "}
                    {formatRelativeTimestamp(photo.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {visible.length === 0 && !loading && (
            <p className={manageStyles.empty}>
              {search ? "Nothing on this page matches." : "No photos yet."}
            </p>
          )}

          <div className={manageStyles.pagination}>
            <button
              type="button"
              className={manageStyles.pageButton}
              onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <span className={manageStyles.pageLabel}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className={manageStyles.pageButton}
              onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoManagement;
