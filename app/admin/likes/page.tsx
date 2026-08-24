"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "inter-ui/inter.css";
import { ArrowLeft } from "react-feather";
import styles from "../../page.module.scss";
import likesStyles from "./likes.module.scss";
import NavigationSidebar from "../../../components/NavigationSidebar";
import Unauthorized from "../../../components/Unauthorized";
import { imageUrl, thumbnailUrl } from "../../../constants/images";
import { formatRelativeTimestamp } from "../../../util/date";

type LikeSessionPhoto = {
  id: number;
  s3Key: string;
  thumbKey: string | null;
  originalFilename: string | null;
  at: string;
};

type LikeSession = {
  visitor: string;
  action: "liked" | "unliked";
  startedAt: string;
  endedAt: string;
  count: number;
  visitorTotal: number;
  photos: LikeSessionPhoto[];
};

/** "in one go" reads better than a duration of zero on a single-photo burst. */
function spanLabel(session: LikeSession) {
  const seconds =
    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000;
  if (session.count < 2 || seconds < 60) return "in one go";
  return `over ${Math.round(seconds / 60)} min`;
}

function Session({ session }: { session: LikeSession }) {
  const missing = session.count - session.photos.length;

  return (
    <li
      className={`${likesStyles.session} ${
        session.action === "unliked" ? likesStyles.withdrawn : ""
      }`}
    >
      <div className={likesStyles.line}>
        <span className={likesStyles.visitor}>#{session.visitor}</span>
        <span className={likesStyles.said}>
          {session.action} {session.count}{" "}
          {session.count === 1 ? "photo" : "photos"}
        </span>
        <span className={likesStyles.when} suppressHydrationWarning>
          {formatRelativeTimestamp(session.startedAt)}
        </span>
        <span className={likesStyles.span}>{spanLabel(session)}</span>
        {session.visitorTotal !== session.count && (
          <span className={likesStyles.span}>
            {session.visitorTotal} still liked
          </span>
        )}
      </div>

      <div className={likesStyles.strip}>
        {/*
          No route opens the gallery on one photo, so a tile goes to the
          original rather than inventing a deep link.
        */}
        {session.photos.map((photo) => (
          <a
            key={`${photo.id}-${photo.at}`}
            href={imageUrl(photo.s3Key)}
            target="_blank"
            rel="noreferrer"
            className={likesStyles.tile}
            title={photo.originalFilename || `Photo #${photo.id}`}
          >
            <img
              className={likesStyles.thumb}
              src={thumbnailUrl(photo)}
              alt={photo.originalFilename || "Photograph"}
              loading="lazy"
              decoding="async"
            />
            <span className={likesStyles.id}>#{photo.id}</span>
          </a>
        ))}
        {missing > 0 && (
          <span className={likesStyles.missing}>
            {missing} since deleted
          </span>
        )}
      </div>
    </li>
  );
}

export default function Likes() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessions, setSessions] = useState<LikeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsAuthenticated(
      document.cookie.split("; ").some((row) => row.startsWith("client-auth="))
    );
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const res = await fetch("/api/admin/likes");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setSessions(data.sessions);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated]);

  const visitors = useMemo(
    () => new Set(sessions.map((session) => session.visitor)).size,
    [sessions]
  );

  if (!isAuthenticated) return <Unauthorized />;

  return (
    <div className={`${styles.home} ${styles.body}`}>
      <NavigationSidebar />
      <div className={styles.all}>
        <div className={styles.container}>
          <Link href="/admin/photos" className={likesStyles.back}>
            <ArrowLeft size={14} />
            Manage
          </Link>

          <div className={likesStyles.header}>
            <div>
              <h1 className={likesStyles.title}>Likes</h1>
              <p className={likesStyles.blurb}>
                Likes and unlikes grouped into visits, newest first. The label
                is a browser fingerprint, not a person — the same someone on a
                different browser shows up as a different one. Unlikes are only
                recorded from 2026-08-24; before that they deleted the like
                outright and left nothing behind.
              </p>
            </div>
            {!loading && !error && (
              <span className={likesStyles.tally}>
                {sessions.length} {sessions.length === 1 ? "visit" : "visits"}
                {" · "}
                {visitors} {visitors === 1 ? "visitor" : "visitors"}
              </span>
            )}
          </div>

          {error && <p className={likesStyles.error}>{error}</p>}
          {loading && !error && <p className={likesStyles.empty}>Loading</p>}
          {!loading && !error && sessions.length === 0 && (
            <p className={likesStyles.empty}>Nobody has liked anything yet.</p>
          )}

          <ul className={likesStyles.list}>
            {sessions.map((session) => (
              <Session
                key={`${session.visitor}-${session.action}-${session.startedAt}`}
                session={session}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
