"use client";

import { useState, useEffect } from "react";
import { Heart } from "react-feather";
import { getVisitorId } from "../util/fingerprint";

import localStyles from "./LikeButton.module.scss";
import styles from "../app/page.module.scss";

export default function LikeButton({ photoId, initialLikes }) {
  const [likes, setLikes] = useState(initialLikes);
  const [activated, setActivated] = useState(false);
  const [fingerprintId, setFingerprintId] = useState(null);

  // The visitor id is shared across every button on the page, so this waits on
  // work the first mounted button already started rather than fingerprinting
  // once per photo.
  useEffect(() => {
    let live = true;
    getVisitorId()
      .then((id) => {
        if (live) setFingerprintId(id);
      })
      .catch((error) => console.error("Fingerprint failed:", error));
    return () => {
      live = false;
    };
  }, []);

  // Check if user has already liked the image
  useEffect(() => {
    if (!fingerprintId) return;

    const likedImages = JSON.parse(localStorage.getItem("likedImages") || "{}");
    if (likedImages[photoId] === fingerprintId) {
      setActivated(true);
    }
  }, [fingerprintId]);

  // Handle Like Toggle
  const toggleLike = async (event) => {
    event.stopPropagation();
    if (!fingerprintId) return;

    try {
      const res = await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, fingerprintId }),
      });

      const data = await res.json();

      if (data.liked) {
        setLikes(likes + 1);
        setActivated(true);

        // Store in localStorage
        const likedImages = JSON.parse(
          localStorage.getItem("likedImages") || "{}"
        );
        likedImages[photoId] = fingerprintId;
        localStorage.setItem("likedImages", JSON.stringify(likedImages));
      } else {
        setLikes(likes - 1);
        setActivated(false);

        // Remove from localStorage
        const likedImages = JSON.parse(
          localStorage.getItem("likedImages") || "{}"
        );
        delete likedImages[photoId];
        localStorage.setItem("likedImages", JSON.stringify(likedImages));
      }
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleLike}
      className={`${styles["button-secondary"]} ${localStyles["wrapper"]} ${
        activated ? localStyles["activated"] : ""
      }`}
    >
      <Heart
        size={14}
        fill={activated ? "#d37572" : "rgba(0,0,0,0)"}
        className={`${localStyles["icon"]}`}
      />
      {likes}
    </button>
  );
}
