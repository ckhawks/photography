"use client";

import { useEffect, useState } from "react";
import styles from "./PhotoGearEditor.module.scss";

const FILM_STOCK_SUGGESTIONS = [
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

/**
 * The half of a photo's gear that EXIF cannot supply.
 *
 * Film is the reason this exists: a scan's EXIF belongs to the scanner, so the
 * camera and the stock have to be typed. Digital usually fills itself in from
 * EXIF and only needs correcting.
 *
 * Saves on blur rather than per keystroke, so typing a stock is one write.
 */
export default function PhotoGearEditor({ photo, onSave }) {
  const [medium, setMedium] = useState(photo.medium ?? "");
  const [camera, setCamera] = useState(photo.camera ?? "");
  const [filmStock, setFilmStock] = useState(photo.filmStock ?? "");
  const [status, setStatus] = useState(null);

  // a page change swaps the photo under the same component
  useEffect(() => {
    setMedium(photo.medium ?? "");
    setCamera(photo.camera ?? "");
    setFilmStock(photo.filmStock ?? "");
    setStatus(null);
  }, [photo.id]);

  const save = async (changes) => {
    setStatus("saving");
    try {
      await onSave(photo.id, changes);
      setStatus("saved");
      setTimeout(() => setStatus(null), 1400);
    } catch (error) {
      console.error(error);
      setStatus("failed");
    }
  };

  const saveIfChanged = (field, value, original) => {
    if ((value || "") === (original || "")) return;
    save({ [field]: value });
  };

  return (
    <div className={styles.editor}>
      <div className={styles.mediumRow}>
        {["film", "digital"].map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.mediumButton} ${medium === option ? styles.active : ""}`}
            onClick={() => {
              const next = medium === option ? "" : option;
              setMedium(next);
              save({ medium: next });
            }}
          >
            {option === "film" ? "Film" : "Digital"}
          </button>
        ))}
        {status && <span className={styles.status}>{status}</span>}
      </div>

      {medium === "film" && (
        <input
          className={styles.input}
          list="film-stock-suggestions"
          placeholder="Film stock"
          value={filmStock}
          onChange={(event) => setFilmStock(event.target.value)}
          onBlur={() => saveIfChanged("filmStock", filmStock, photo.filmStock)}
        />
      )}

      <input
        className={styles.input}
        placeholder={medium === "film" ? "Camera body" : "Camera"}
        value={camera}
        onChange={(event) => setCamera(event.target.value)}
        onBlur={() => saveIfChanged("camera", camera, photo.camera)}
      />

      {photo.lens && <div className={styles.readonly}>{photo.lens}</div>}

      <datalist id="film-stock-suggestions">
        {FILM_STOCK_SUGGESTIONS.map((stock) => (
          <option value={stock} key={stock} />
        ))}
      </datalist>
    </div>
  );
}
