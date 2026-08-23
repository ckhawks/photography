"use client";

import { useState } from "react";
import styles from "./ShootPicker.module.scss";

const NEW_SHOOT = "__new__";

/**
 * Which shoot a photo belongs to.
 *
 * Choosing "New shoot" opens two fields, because a shoot is only ever a date
 * and a title. The photo is filed into it as soon as it is created, so adding
 * a shoot and assigning to it is one action rather than two.
 */
export default function ShootPicker({ albums, value, onAssign, onCreate }) {
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
      setError(problem.message || "Could not create the shoot");
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
          aria-label="Shoot date"
        />
        <input
          className={styles.input}
          placeholder="Shoot title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && create()}
          aria-label="Shoot title"
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
        if (event.target.value === NEW_SHOOT) {
          setCreating(true);
          return;
        }
        onAssign(event.target.value === "" ? null : Number(event.target.value));
      }}
      aria-label="Shoot"
    >
      <option value="">No shoot</option>
      {albums.map((album) => (
        <option value={album.id} key={album.id}>
          {album.title} · {String(album.shootDate).slice(0, 10)}
        </option>
      ))}
      <option value={NEW_SHOOT}>New shoot...</option>
    </select>
  );
}
