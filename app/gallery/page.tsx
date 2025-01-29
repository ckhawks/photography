"use client";

import Head from "next/head";
import React, { useEffect, useState } from "react";

import "inter-ui/inter.css";
import styles from "../page.module.scss";
import NavigationSidebar from "../../components/NavigationSidebar";
import LikeButton from "../../components/LikeButton";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ArrowLeft, ArrowRight } from "react-feather";
import { Form } from "react-bootstrap";

function formatRelativeTimestamp(createdAt) {
  const date = parseISO(createdAt);
  return formatDistanceToNow(date, { addSuffix: true });
}

const Gallery = () => {
  const [photos, setPhotos] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState("random"); // Default sorting

  useEffect(() => {
    async function fetchPhotos() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/photos?page=${currentPage}&sort=${sort}`);
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
  }, [currentPage, sort]);

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
          <h1 className={styles.title}>Gallery</h1>
          <p className={styles.description}>
            All of my pictures I have to share with you.
          </p>

          {/* Sorting Options */}
          <div className={styles.sortingContainer}>
            <label htmlFor="sort">Sort by:</label>
            <Form.Select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="random">Random</option>
              <option value="most_liked">Most Liked</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </Form.Select>
          </div>

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

          {/* Pagination Controls */}
          <div
            className={`${"pagination"} ${styles.row}`}
            style={{ gap: "1rem", justifyContent: "center" }}
          >
            <button
              className={styles["button"]}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className={styles["button"]}
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
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

export default Gallery;
