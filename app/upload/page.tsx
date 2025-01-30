"use client";

import Head from "next/head";
import React, { useEffect, useState } from "react";

import "inter-ui/inter.css";
import styles from "../page.module.scss";
import uploadStyles from "./upload.module.scss";
import { getCategories } from "../../util/GetCategories";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from "@fortawesome/free-solid-svg-icons";
import ButtonBack from "../../components/ButtonBack";
import ButtonSwap from "../../components/ButtonSwap";
import NavigationSidebar from "../../components/NavigationSidebar";
import Unauthorized from "../../components/Unauthorized";
import { Form } from "react-bootstrap";

// const categories = await getCategories();

const UploadPhotos = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
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

  if (!isAuthenticated) {
    return (
      <>
        <Unauthorized />
      </>
    );
  }

  const handleFileChange = (event) => {
    const filesArray = Array.from(event.target.files);

    // Only allow images
    const imageFiles = filesArray.filter((file) =>
      // @ts-ignore
      file?.type.startsWith("image/")
    );

    // Generate preview URLs
    const filePreviews = imageFiles.map((file) => ({
      file,
      // @ts-ignore
      previewUrl: URL.createObjectURL(file),
    }));

    setSelectedFiles(filePreviews);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setUploading(true);
    setError(null);

    const formData = new FormData();
    selectedFiles.forEach(({ file }) => formData.append("files", file));

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload");
      }

      console.log("Uploaded successfully:", data.photos);
      setSelectedFiles([]); // Clear selected files on success
    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
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
            <h1 className={styles.title}>Upload</h1>
            <p className={styles.description}>The more photos the merrier.</p>
            <Form onSubmit={handleSubmit}>
              <Form.Group controlId="formFile">
                <Form.Label>Choose files</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  onChange={handleFileChange}
                />
              </Form.Group>

              {/* Display Image Previews */}
              {selectedFiles.length > 0 && (
                <div
                  className={uploadStyles["image-preview-container"]}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                  }}
                >
                  {selectedFiles.map(({ previewUrl, file }, index) => (
                    <div key={index} className={uploadStyles["image-preview"]}>
                      <img
                        src={previewUrl}
                        alt={file.name}
                        className={uploadStyles["preview-image"]}
                        width={400}
                      />
                      <p>{file.name}</p>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="error-message">{error}</p>}

              <button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
};

export default UploadPhotos;
