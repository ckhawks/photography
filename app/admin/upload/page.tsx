"use client";

import React, { useEffect, useRef, useState } from "react";
import "inter-ui/inter.css";
import { Check, Image as ImageIcon, RotateCw, Upload, X } from "react-feather";
import styles from "../../page.module.scss";
import uploadStyles from "./upload.module.scss";
import NavigationSidebar from "../../../components/NavigationSidebar";
import Unauthorized from "../../../components/Unauthorized";
import ShootPicker from "../../../components/ShootPicker";
import { RATINGS, ratingById } from "../../../constants/ratings";

// Files go up one request each rather than in a single form post: a 250-frame
// roll in one request is a timeout, and one failure loses the whole batch.
// Three at a time keeps the pipe busy without swamping the box.
const CONCURRENCY = 3;

// best first, and never don't-show: that rating means the photo does not go up
const UPLOAD_RATINGS = RATINGS.filter((rating) => rating.tier).reverse();

const FILM_STOCKS = [
  "Portra 400",
  "Portra 800",
  "Ektar 100",
  "Gold 200",
  "UltraMax 400",
  "HP5 Plus",
  "Tri-X 400",
  "Cinestill 800T",
  "Lomo 800",
];

const formatSize = (bytes) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

export default function UploadPhotos() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [items, setItems] = useState([]);
  const [running, setRunning] = useState(false);
  const [albums, setAlbums] = useState([]);

  const [albumId, setAlbumId] = useState(null);
  // everything comes in as okay: hide what should not be there, then rate up
  const [rating, setRating] = useState("okay");
  const [medium, setMedium] = useState("");
  const [filmStock, setFilmStock] = useState("");

  const fileInput = useRef(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setIsAuthenticated(
      Boolean(document.cookie.split("; ").find((row) => row.startsWith("client-auth=")))
    );
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/admin/albums")
      .then((res) => (res.ok ? res.json() : { albums: [] }))
      .then((data) => setAlbums(data.albums ?? []))
      .catch((error) => console.error("Failed to load shoots:", error));
  }, [isAuthenticated]);

  // object URLs are cheap but not free; let them go when the queue is emptied
  useEffect(
    () => () => items.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl)),
    [items]
  );

  if (!isAuthenticated) return <Unauthorized />;

  const addFiles = (fileList: FileList) => {
    const additions = Array.from(fileList)
      .filter((file) => file.type.startsWith("image/"))
      .map((file, index) => ({
        key: `${file.name}-${file.size}-${Date.now()}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "waiting",
        error: null,
      }));

    setItems((prev) => {
      // dropping the same folder twice should not upload it twice
      const seen = new Set(prev.map((item) => `${item.file.name}:${item.file.size}`));
      return [...prev, ...additions.filter((item) => !seen.has(`${item.file.name}:${item.file.size}`))];
    });
  };

  const setStatus = (key, status, error = null) =>
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, status, error } : item)));

  const uploadOne = async (item) => {
    setStatus(item.key, "uploading");

    const body = new FormData();
    body.append("files", item.file);
    body.append("rating", rating);
    if (albumId) body.append("albumId", String(albumId));
    if (medium) body.append("medium", medium);
    if (medium === "film" && filmStock.trim()) body.append("filmStock", filmStock.trim());

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      setStatus(item.key, "done");
    } catch (error) {
      setStatus(item.key, "failed", error.message);
    }
  };

  const run = async (queue) => {
    if (!queue.length) return;
    setRunning(true);

    const pending = [...queue];
    const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
      while (pending.length) await uploadOne(pending.shift());
    });
    await Promise.all(workers);

    setRunning(false);
    // shoots gain photos as the run goes, so the counts in the picker are stale
    fetch("/api/admin/albums")
      .then((res) => (res.ok ? res.json() : { albums }))
      .then((data) => setAlbums(data.albums ?? albums))
      .catch(() => {});
  };

  const createShoot = async (shoot) => {
    const res = await fetch("/api/admin/albums", {
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

  const counts = items.reduce(
    (totals, item) => ({ ...totals, [item.status]: (totals[item.status] ?? 0) + 1 }),
    {}
  );
  const waiting = items.filter((item) => item.status === "waiting");
  const failed = items.filter((item) => item.status === "failed");
  const totalBytes = waiting.reduce((sum, item) => sum + item.file.size, 0);

  return (
    <div className={`${styles.home} ${styles.body}`}>
      <NavigationSidebar />
      <div className={styles.all}>
        <div className={styles.container}>
          <h1 className={styles.title}>Upload</h1>
          <p className={styles.description}>
            Drop a batch in. Decisions are per batch, not per photo.
          </p>

          <div className={uploadStyles.layout}>
            <div className={uploadStyles.settings}>
              <div className={uploadStyles.panel}>
                <div className={uploadStyles.panelLabel}>Shoot</div>
                <ShootPicker
                  albums={albums}
                  value={albumId}
                  onAssign={(id) => setAlbumId(id)}
                  onCreate={createShoot}
                />
                <p className={uploadStyles.hint}>
                  Everything in this batch is filed here. Leave it on no shoot to file later.
                </p>
              </div>

              <div className={uploadStyles.panel}>
                <div className={uploadStyles.panelLabel}>Rating</div>
                <div className={uploadStyles.ratingList}>
                  {UPLOAD_RATINGS.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={`${uploadStyles.ratingButton} ${rating === option.id ? uploadStyles.active : ""}`}
                      onClick={() => setRating(option.id)}
                    >
                      <span>{option.label}</span>
                      <span className={uploadStyles.ratingWhere}>{option.where}</span>
                    </button>
                  ))}
                </div>
                <p className={uploadStyles.hint}>
                  Okay is the default on purpose: bring everything in, hide what should not
                  be there, then rate the rest up. The tier follows from the rating.
                </p>
              </div>

              <div className={uploadStyles.panel}>
                <div className={uploadStyles.panelLabel}>Shot on</div>
                <div className={uploadStyles.segmented}>
                  {["film", "digital"].map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={`${uploadStyles.segment} ${medium === option ? uploadStyles.active : ""}`}
                      onClick={() => setMedium(medium === option ? "" : option)}
                    >
                      {option === "film" ? "Film" : "Digital"}
                    </button>
                  ))}
                </div>
                {medium === "film" && (
                  <input
                    className={uploadStyles.input}
                    list="upload-film-stocks"
                    placeholder="Film stock"
                    value={filmStock}
                    onChange={(event) => setFilmStock(event.target.value)}
                  />
                )}
                {medium !== "film" && (
                  <p className={uploadStyles.hint}>
                    Camera and lens come from EXIF where the file still has it.
                  </p>
                )}
                <datalist id="upload-film-stocks">
                  {FILM_STOCKS.map((stock) => (
                    <option value={stock} key={stock} />
                  ))}
                </datalist>
              </div>

              <button
                type="button"
                className={uploadStyles.upload}
                disabled={running || waiting.length === 0}
                onClick={() => run(waiting)}
              >
                <Upload size={15} />
                {running
                  ? `Uploading ${counts.uploading ?? 0}...`
                  : waiting.length
                    ? `Upload ${waiting.length} as ${ratingById(rating)?.label.toLowerCase()} · ${formatSize(totalBytes)}`
                    : "Nothing waiting"}
              </button>

              {failed.length > 0 && !running && (
                <button type="button" className={uploadStyles.retry} onClick={() => run(failed)}>
                  <RotateCw size={14} />
                  Retry {failed.length} failed
                </button>
              )}
            </div>

            <div className={uploadStyles.queueColumn}>
              <div
                className={`${uploadStyles.dropzone} ${dragging ? uploadStyles.dragging : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  addFiles(event.dataTransfer.files);
                }}
                onClick={() => fileInput.current?.click()}
              >
                <ImageIcon size={18} />
                <span>Drop photos here, or click to choose</span>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    addFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>

              {items.length > 0 && (
                <div className={uploadStyles.queueHeader}>
                  <span>
                    {items.length} file{items.length === 1 ? "" : "s"}
                    {counts.done ? ` · ${counts.done} done` : ""}
                    {counts.failed ? ` · ${counts.failed} failed` : ""}
                  </span>
                  <button
                    type="button"
                    className={uploadStyles.clear}
                    disabled={running}
                    onClick={() => setItems(items.filter((item) => item.status === "uploading"))}
                  >
                    Clear list
                  </button>
                </div>
              )}

              <div className={uploadStyles.queue}>
                {items.map((item) => (
                  <div className={uploadStyles.row} key={item.key} data-status={item.status}>
                    <img className={uploadStyles.rowThumb} src={item.previewUrl} alt="" />
                    <div className={uploadStyles.rowText}>
                      <div className={uploadStyles.rowName}>{item.file.name}</div>
                      <div className={uploadStyles.rowMeta}>
                        {item.status === "failed"
                          ? item.error
                          : item.status === "uploading"
                            ? "Uploading, resizing, reading EXIF..."
                            : formatSize(item.file.size)}
                      </div>
                    </div>
                    <div className={uploadStyles.rowStatus}>
                      {item.status === "done" && <Check size={16} />}
                      {item.status === "failed" && <X size={16} />}
                      {item.status === "uploading" && <span className={uploadStyles.spinner} />}
                      {item.status === "waiting" && !running && (
                        <button
                          type="button"
                          className={uploadStyles.remove}
                          onClick={() =>
                            setItems((prev) => prev.filter((other) => other.key !== item.key))
                          }
                          aria-label="Remove"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
