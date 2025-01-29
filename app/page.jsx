"use client";

import Head from "next/head";
import React, { useEffect, useState } from "react";

import "inter-ui/inter.css";
import styles from "./page.module.scss";
import NavigationSidebar from "../components/NavigationSidebar";
import LikeButton from "../components/LikeButton";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ArrowLeft, ArrowRight } from "react-feather";

function formatRelativeTimestamp(createdAt) {
  const date = parseISO(createdAt);
  return formatDistanceToNow(date, { addSuffix: true }); // Example: "3 days ago"
}

const HallOfFame = () => {
  const [photos, setPhotos] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPhotos() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/photos/halloffame`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load photos");

        setPhotos(data.photos);
        setTotalPages(data.totalPages);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPhotos();
  }, [currentPage]);

  return (
    <div className={`${styles.home} ${styles.body}`}>
      <NavigationSidebar />
      <div className={styles.all}>
        <Head>
          <link
            href="https://fonts.googleapis.com/css?family=Inter"
            rel="stylesheet"
          />
        </Head>
        <div className={styles.container}>
          <h1 className={styles.title}>Hall of Fame</h1>
          <p className={styles.description}>Here's my personal best work.</p>

          {error && <p className="error-message">{error}</p>}
          {loading && <p>Loading...</p>}

          <div
            className="photo-grid"
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            {photos.map((photo) => (
              <div key={photo.id} className={styles["photo-card"]}>
                <img
                  className={styles.photo}
                  src={`/api/resource/${photo.s3Key}`}
                  alt={photo.originalFilename}
                />
                <div className={styles.photoMetaRow}>
                  <LikeButton initialLikes={photo.likes} photoId={photo.id} />
                  <span className={styles.date}>
                    {formatRelativeTimestamp(photo.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HallOfFame;
