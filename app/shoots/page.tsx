"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import "inter-ui/inter.css";
import { Eye, EyeOff, FileText, Trash2 } from "react-feather";
import styles from "../page.module.scss";
import shootStyles from "./shoots.module.scss";
import NavigationSidebar from "../../components/NavigationSidebar";
import Unauthorized from "../../components/Unauthorized";

const VISIBILITIES = [
  { value: "public", label: "Public", hint: "listed on Albums", icon: Eye },
  { value: "unlisted", label: "Unlisted", hint: "link only", icon: EyeOff },
  { value: "draft", label: "Draft", hint: "404 to everyone else", icon: FileText },
];

/** Editing a shoot: name it now or name it later, and move it if the date was wrong. */
function ShootRow({ album, onSave, onDelete }) {
  const [title, setTitle] = useState(album.title);
  const [shootDate, setShootDate] = useState(String(album.shootDate).slice(0, 10));
  const [updateSlug, setUpdateSlug] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setTitle(album.title);
    setShootDate(String(album.shootDate).slice(0, 10));
    setUpdateSlug(false);
  }, [album.id, album.title, album.shootDate]);

  const dirty = title !== album.title || shootDate !== String(album.shootDate).slice(0, 10);

  const save = async (changes) => {
    setStatus("saving");
    try {
      await onSave(album.id, changes);
      setStatus("saved");
      setTimeout(() => setStatus(null), 1500);
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <div className={shootStyles.row}>
      <div className={shootStyles.fields}>
        <input
          className={shootStyles.title}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Shoot title"
          aria-label="Shoot title"
        />
        <input
          className={shootStyles.date}
          type="date"
          value={shootDate}
          onChange={(event) => setShootDate(event.target.value)}
          aria-label="Shoot date"
        />
        <button
          type="button"
          className={shootStyles.save}
          disabled={!dirty}
          onClick={() => save({ title, shootDate, updateSlug })}
        >
          {dirty ? "Save" : "Saved"}
        </button>
      </div>

      <div className={shootStyles.meta}>
        <Link href={`/albums/${album.slug}`} className={shootStyles.slug}>
          /albums/{album.slug}
        </Link>
        <span className={shootStyles.count}>
          {album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}
        </span>

        <label className={shootStyles.slugToggle}>
          <input
            type="checkbox"
            checked={updateSlug}
            onChange={(event) => setUpdateSlug(event.target.checked)}
          />
          rebuild the link from the new name
        </label>

        <div className={shootStyles.visibility}>
          {VISIBILITIES.map((option) => {
            const Icon = option.icon;
            return (
              <button
                type="button"
                key={option.value}
                title={option.hint}
                className={`${shootStyles.visButton} ${album.visibility === option.value ? shootStyles.active : ""}`}
                onClick={() => save({ visibility: option.value })}
              >
                <Icon size={13} />
                {option.label}
              </button>
            );
          })}
        </div>

        <label className={shootStyles.cullToggle} title="Show the unedited frames on this shoot's page">
          <input
            type="checkbox"
            checked={Boolean(album.showCull)}
            onChange={(event) => save({ showCull: event.target.checked })}
          />
          show unedited
        </label>

        {album.photoCount === 0 && (
          <button
            type="button"
            className={shootStyles.delete}
            onClick={() => onDelete(album.id)}
            title="Delete this empty shoot"
          >
            <Trash2 size={13} />
          </button>
        )}

        {status && <span className={shootStyles.status}>{status}</span>}
      </div>
    </div>
  );
}

export default function Shoots() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState("");
  const [shootDate, setShootDate] = useState("");

  useEffect(() => {
    setIsAuthenticated(
      Boolean(document.cookie.split("; ").find((row) => row.startsWith("client-auth=")))
    );
  }, []);

  const load = () =>
    fetch("/api/albums")
      .then((res) => (res.ok ? res.json() : { albums: [] }))
      .then((data) => setAlbums(data.albums ?? []))
      .catch((err) => setError(err.message));

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Unauthorized />;

  const save = async (id, changes) => {
    const res = await fetch("/api/albums", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...changes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save");

    setAlbums((prev) =>
      prev
        .map((album) => (album.id === id ? { ...album, ...data.album } : album))
        .sort((a, b) => String(b.shootDate).localeCompare(String(a.shootDate)))
    );
  };

  const create = async () => {
    setError(null);
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, shootDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");

      setTitle("");
      setShootDate("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this shoot?")) return;
    setError(null);
    try {
      const res = await fetch("/api/albums", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={`${styles.home} ${styles.body}`}>
      <NavigationSidebar />
      <div className={styles.all}>
        <div className={styles.container}>
          <h1 className={styles.title}>Shoots</h1>
          <p className={styles.description}>
            Rename them, move their dates, decide who can see them. Names can wait until
            after the photos are in.
          </p>

          {error && <p className={shootStyles.error}>{error}</p>}

          <div className={shootStyles.create}>
            <input
              className={shootStyles.date}
              type="date"
              value={shootDate}
              onChange={(event) => setShootDate(event.target.value)}
              aria-label="New shoot date"
            />
            <input
              className={shootStyles.title}
              placeholder="New shoot title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && create()}
            />
            <button
              type="button"
              className={shootStyles.createButton}
              onClick={create}
              disabled={!title.trim() || !shootDate}
            >
              Add shoot
            </button>
          </div>

          <div className={shootStyles.rows}>
            {albums.map((album) => (
              <ShootRow key={album.id} album={album} onSave={save} onDelete={remove} />
            ))}
          </div>

          {albums.length === 0 && (
            <p className={shootStyles.empty}>No shoots yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
