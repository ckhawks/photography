"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import "inter-ui/inter.css";
import { Eye, EyeOff, FileText, Trash2 } from "react-feather";
import styles from "../../page.module.scss";
import albumStyles from "./albums.module.scss";
import NavigationSidebar from "../../../components/NavigationSidebar";
import Unauthorized from "../../../components/Unauthorized";

const VISIBILITIES = [
  { value: "public", label: "Public", hint: "listed on Albums", icon: Eye },
  { value: "unlisted", label: "Unlisted", hint: "link only", icon: EyeOff },
  { value: "draft", label: "Draft", hint: "404 to everyone else", icon: FileText },
];

/** Editing a album: name it now or name it later, and move it if the date was wrong. */
function AlbumRow({ album, onSave, onDelete }) {
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
    <div className={albumStyles.row}>
      <div className={albumStyles.fields}>
        <input
          className={albumStyles.title}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Album title"
          aria-label="Album title"
        />
        <input
          className={albumStyles.date}
          type="date"
          value={shootDate}
          onChange={(event) => setShootDate(event.target.value)}
          aria-label="Album date"
        />
        <button
          type="button"
          className={albumStyles.save}
          disabled={!dirty}
          onClick={() => save({ title, shootDate, updateSlug })}
        >
          {dirty ? "Save" : "Saved"}
        </button>
      </div>

      <div className={albumStyles.meta}>
        <Link href={`/albums/${album.slug}`} className={albumStyles.slug}>
          /albums/{album.slug}
        </Link>
        <span className={albumStyles.count}>
          {album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}
        </span>

        <label className={albumStyles.slugToggle}>
          <input
            type="checkbox"
            checked={updateSlug}
            onChange={(event) => setUpdateSlug(event.target.checked)}
          />
          rebuild the link from the new name
        </label>

        <div className={albumStyles.visibility}>
          {VISIBILITIES.map((option) => {
            const Icon = option.icon;
            return (
              <button
                type="button"
                key={option.value}
                title={option.hint}
                className={`${albumStyles.visButton} ${album.visibility === option.value ? albumStyles.active : ""}`}
                onClick={() => save({ visibility: option.value })}
              >
                <Icon size={13} />
                {option.label}
              </button>
            );
          })}
        </div>

        <label className={albumStyles.cullToggle} title="Show the unedited frames on this album's page">
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
            className={albumStyles.delete}
            onClick={() => onDelete(album.id)}
            title="Delete this empty album"
          >
            <Trash2 size={13} />
          </button>
        )}

        {status && <span className={albumStyles.status}>{status}</span>}
      </div>
    </div>
  );
}

export default function Albums() {
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
    fetch("/api/admin/albums")
      .then((res) => (res.ok ? res.json() : { albums: [] }))
      .then((data) => setAlbums(data.albums ?? []))
      .catch((err) => setError(err.message));

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Unauthorized />;

  const save = async (id, changes) => {
    const res = await fetch("/api/admin/albums", {
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
      const res = await fetch("/api/admin/albums", {
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
    if (!confirm("Delete this album?")) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/albums", {
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
          <h1 className={styles.title}>Albums</h1>
          <p className={styles.description}>
            Rename them, move their dates, decide who can see them. Names can wait until
            after the photos are in.
          </p>

          {error && <p className={albumStyles.error}>{error}</p>}

          <div className={albumStyles.create}>
            <input
              className={albumStyles.date}
              type="date"
              value={shootDate}
              onChange={(event) => setShootDate(event.target.value)}
              aria-label="New album date"
            />
            <input
              className={albumStyles.title}
              placeholder="New album title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && create()}
            />
            <button
              type="button"
              className={albumStyles.createButton}
              onClick={create}
              disabled={!title.trim() || !shootDate}
            >
              Add album
            </button>
          </div>

          <div className={albumStyles.rows}>
            {albums.map((album) => (
              <AlbumRow key={album.id} album={album} onSave={save} onDelete={remove} />
            ))}
          </div>

          {albums.length === 0 && (
            <p className={albumStyles.empty}>No albums yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
