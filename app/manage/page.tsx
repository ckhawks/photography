"use client";

import Head from "next/head";
import React, { useEffect, useState } from "react";

import "inter-ui/inter.css";
import styles from "../page.module.scss";
import manageStyles from "./manage.module.scss";
import { getCategories } from "../../util/GetCategories";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from "@fortawesome/free-solid-svg-icons";
import ButtonBack from "../../components/ButtonBack";
import ButtonSwap from "../../components/ButtonSwap";
import NavigationSidebar from "../../components/NavigationSidebar";
import Unauthorized from "../../components/Unauthorized";
import { ArrowLeft, ArrowRight } from "react-feather";

// const categories = await getCategories();

const PhotoManagement = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [photos, setPhotos] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if the client-auth cookie is present
    const isAuthenticated = document.cookie
      .split("; ")
      .find((row) => row.startsWith("client-auth="));

    if (isAuthenticated) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // Fetch paginated photos
  useEffect(() => {
    async function fetchPhotos() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/photos?page=${currentPage}&sort=newest`);
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
  }, [currentPage]); // Refetch when page changes

  // Handle pagination
  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Delete a photo
  const deletePhoto = async (id, fileKey) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, fileKey }),
      });

      if (!res.ok) throw new Error("Failed to delete photo");

      setPhotos((prev) => prev.filter((photo) => photo.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mark a photo as "Hall of Fame"
  const toggleHallOfFame = async (id, currentStatus) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, hallOfFame: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to update Hall of Fame status");

      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === id ? { ...photo, hallOfFame: !currentStatus } : photo
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <Unauthorized />
      </>
    );
  }

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
          <h1 className={styles.title}>Manage</h1>
          <p className={styles.description}>What goes where?</p>
          {error && <p className={manageStyles["error-message"]}>{error}</p>}
          {loading && <p>Loading...</p>}

          <div className={manageStyles["photo-grid"]}>
            {photos.map((photo) => (
              <div key={photo.id} className={manageStyles["photo-card"]}>
                <img
                  style={{ maxWidth: 300, maxHeight: 300 }}
                  src={`api/resource/${photo.s3Key}`}
                  // width={300}
                  alt={photo.file_name}
                />
                <p>{photo.file_name}</p>
                <button
                  className={`${styles["button"]} ${styles["button-secondary"]}`}
                  onClick={() => deletePhoto(photo.id, photo.s3Key)}
                >
                  🗑 Delete
                </button>
                <button
                  className={`${styles["button"]} ${styles["button-secondary"]}`}
                  onClick={() => toggleHallOfFame(photo.id, photo.hallOfFame)}
                >
                  {photo.hallOfFame
                    ? "⭐ Remove from Hall of Fame"
                    : "🌟 Mark as Hall of Fame"}
                </button>
              </div>
            ))}
          </div>

          <br />
          <div
            className={`${"pagination"} ${styles.row}`}
            style={{ gap: "1rem", justifyContent: "center" }}
          >
            <button
              className={`${styles["button"]} ${styles["button-secondary"]}`}
              onClick={prevPage}
              disabled={currentPage === 1}
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className={`${styles["button"]} ${styles["button-secondary"]}`}
              onClick={nextPage}
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

export default PhotoManagement;
