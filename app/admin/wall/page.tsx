"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "inter-ui/inter.css";
import { ArrowLeft, X } from "react-feather";
import styles from "../../page.module.scss";
import wallStyles from "./wall.module.scss";
import NavigationSidebar from "../../../components/NavigationSidebar";
import Unauthorized from "../../../components/Unauthorized";
import { thumbnailUrl } from "../../../constants/images";
import { PHOTO_TIERS } from "../../../constants/photoTiers";

/** One photo, in either column. */
function Tile({ photo, badge, onClick, actionLabel, draggable, dragHandlers }) {
  return (
    <div
      className={wallStyles.tile}
      draggable={draggable}
      {...(dragHandlers ?? {})}
    >
      <img
        className={wallStyles.thumb}
        src={thumbnailUrl(photo)}
        alt={photo.originalFilename || "Photograph"}
        loading="lazy"
        decoding="async"
      />
      <div className={wallStyles.tileMeta}>
        {badge && <span className={wallStyles.rank}>{badge}</span>}
        <span className={wallStyles.tierLabel}>{PHOTO_TIERS[photo.tier]}</span>
        <span className={wallStyles.id}>#{photo.id}</span>
        {photo.medium === "film" && <span className={wallStyles.film}>film</span>}
      </div>
      <button type="button" className={wallStyles.action} onClick={onClick} title={actionLabel}>
        {actionLabel === "Unpin" ? <X size={13} /> : "Pin"}
      </button>
    </div>
  );
}

export default function Wall() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [pinned, setPinned] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragFrom = useRef<number | null>(null);

  useEffect(() => {
    setIsAuthenticated(
      document.cookie.split("; ").some((row) => row.startsWith("client-auth="))
    );
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const res = await fetch("/api/admin/wall");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setPhotos(data.photos);
        const order = data.photos.filter((p) => p.wallRank).map((p) => p.id);
        setPinned(order);
        setSaved(order);
      } catch (err: any) {
        setError(err.message);
      }
    })();
  }, [isAuthenticated]);

  const byId = useMemo(
    () => new Map(photos.map((photo) => [photo.id, photo])),
    [photos]
  );
  const unpinned = useMemo(
    () => photos.filter((photo) => !pinned.includes(photo.id)),
    [photos, pinned]
  );
  const dirty =
    pinned.length !== saved.length || pinned.some((id, index) => id !== saved[index]);

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= pinned.length) return;
    const next = pinned.slice();
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    setPinned(next);
  };

  const save = async () => {
    setStatus("Saving");
    try {
      const res = await fetch("/api/admin/wall", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: pinned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSaved(pinned);
      setStatus(`Saved — ${data.pinned} pinned`);
      setTimeout(() => setStatus(null), 2000);
    } catch (err: any) {
      setStatus(err.message);
    }
  };

  if (!isAuthenticated) return <Unauthorized />;

  return (
    <div className={`${styles.home} ${styles.body}`}>
      <NavigationSidebar />
      <div className={styles.all}>
        <div className={styles.container}>
          <Link href="/admin/photos" className={wallStyles.back}>
            <ArrowLeft size={14} />
            Manage
          </Link>

          <div className={wallStyles.header}>
            <div>
              <h1 className={wallStyles.title}>Wall order</h1>
              <p className={wallStyles.blurb}>
                Pinned photos lead the gallery in this order. Everything else shuffles
                behind them, so pinning the first handful is usually all this needs.
              </p>
            </div>
            <div className={wallStyles.actions}>
              {status && <span className={wallStyles.status}>{status}</span>}
              {pinned.length > 0 && (
                <button type="button" className={wallStyles.clear} onClick={() => setPinned([])}>
                  Unpin all
                </button>
              )}
              <button
                type="button"
                className={wallStyles.save}
                disabled={!dirty}
                onClick={save}
              >
                {dirty ? "Save order" : "Saved"}
              </button>
            </div>
          </div>

          {error && <p className={wallStyles.error}>{error}</p>}

          <h2 className={wallStyles.sectionTitle}>
            Pinned {pinned.length > 0 && <span className={wallStyles.count}>{pinned.length}</span>}
          </h2>
          {pinned.length === 0 ? (
            <p className={wallStyles.empty}>
              Nothing pinned — the wall is a pure shuffle. Pin a photo below to lead with it.
            </p>
          ) : (
            <div className={wallStyles.grid}>
              {pinned.map((id, index) => {
                const photo = byId.get(id);
                if (!photo) return null;
                return (
                  <Tile
                    key={id}
                    photo={photo}
                    badge={index + 1}
                    actionLabel="Unpin"
                    onClick={() => setPinned(pinned.filter((pid) => pid !== id))}
                    draggable
                    dragHandlers={{
                      onDragStart: () => {
                        dragFrom.current = index;
                      },
                      onDragOver: (event: React.DragEvent) => event.preventDefault(),
                      onDrop: (event: React.DragEvent) => {
                        event.preventDefault();
                        if (dragFrom.current !== null) move(dragFrom.current, index);
                        dragFrom.current = null;
                      },
                    }}
                  />
                );
              })}
            </div>
          )}

          <h2 className={wallStyles.sectionTitle}>
            Shuffled <span className={wallStyles.count}>{unpinned.length}</span>
          </h2>
          <div className={wallStyles.grid}>
            {unpinned.map((photo) => (
              <Tile
                key={photo.id}
                photo={photo}
                badge={null}
                actionLabel="Pin"
                onClick={() => setPinned([...pinned, photo.id])}
                draggable={false}
                dragHandlers={null}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
