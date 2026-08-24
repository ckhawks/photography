"use client";

import { useState } from "react";
import styles from "./AlbumPicker.module.scss";

const NEW_ALBUM = "__new__";

/**
 * Which album a photo belongs to.
 *
 * Choosing "New album" opens two fields, because a album is only ever a date
 * and a title. The photo is filed into it as soon as it is created, so adding
 * a album and assigning to it is one action rather than two.
 */
export default function AlbumPicker({ albums, value, onAssign, onCreate }) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!title.trim() || !shootDate) {
      setError("Both a date and a title");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const album = await onCreate({ title: title.trim(), shootDate });
      await onAssign(album.id);
      setCreating(false);
      setTitle("");
      setShootDate("");
    } catch (problem) {
      setError(problem.message || "Could not create the album");
    } finally {
      setBusy(false);
    }
  };

  if (creating) {
    return (
      <div className={styles.creator}>
        <input
          className={styles.input}
          type="date"
          value={shootDate}
          onChange={(event) => setShootDate(event.target.value)}
          aria-label="Album date"
        />
        <input
          className={styles.input}
          placeholder="Album title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && create()}
          aria-label="Album title"
        />
        <div className={styles.creatorButtons}>
          <button type="button" className={styles.primary} onClick={create} disabled={busy}>
            {busy ? "Creating..." : "Create and file here"}
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              setCreating(false);
              setError(null);
            }}
          >
            Cancel
          </button>
        </div>
        {error && <div className={styles.error}>{error}</div>}
      </div>
    );
  }

  return (
    <select
      className={styles.select}
      value={value ?? ""}
      onChange={(event) => {
        if (event.target.value === NEW_ALBUM) {
          setCreating(true);
          return;
        }
        onAssign(event.target.value === "" ? null : Number(event.target.value));
      }}
      aria-label="Album"
    >
      <option value="">No album</option>
      {albums.map((album) => (
        <option value={album.id} key={album.id}>
          {album.title} · {String(album.shootDate).slice(0, 10)}
        </option>
      ))}
      <option value={NEW_ALBUM}>New album...</option>
    </select>
  );
}
