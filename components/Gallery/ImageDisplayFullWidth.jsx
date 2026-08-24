"use client";

import { useEffect, useState } from "react";
import imageDisplayStyles from "./ImageDisplayFullWidth.module.scss";
import PhotoMetaRow from "./PhotoMetaRow";
import PhotoGearLine from "./PhotoGearLine";
import { imageUrl, thumbnailUrl } from "../../constants/images";

const ImageDisplayFullWidth = (props) => {
  const [showingBefore, setShowingBefore] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [showingOverlay, setShowingOverlay] = useState(false);
  const [overlayOpacitied, setOverlayOpacitied] = useState(false);
  const [imageOpacitied, setImageOpacitied] = useState(false);

  useEffect(() => {
    // both branches used to set "hidden", so closing the lightbox left the
    // page permanently unscrollable
    document.body.style.overflow = overlayOpen ? "hidden" : "";
  }, [overlayOpen]);

  const before = props.image.beforeS3Key;

  // same gesture as the grid lightbox; blur releases so alt-tabbing mid-hold
  // does not strand you on the before
  useEffect(() => {
    if (!overlayOpen || !before) return;
    const down = (event) => { if (event.key === "b" || event.key === "B") setShowingBefore(true); };
    const up = (event) => { if (event.key === "b" || event.key === "B") setShowingBefore(false); };
    const release = () => setShowingBefore(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
    };
  }, [overlayOpen, before]);

  useEffect(() => {
    if (!overlayOpen) setShowingBefore(false);
  }, [overlayOpen]);

  useEffect(() => {
    if (overlayOpen) {
      setShowingOverlay(true);
      setTimeout(() => {
        setOverlayOpacitied(true);
        setImageOpacitied(true);
        setTimeout(() => {}, 0);
      }, 30);
    } else {
      setTimeout(() => {
        setOverlayOpacitied(false);
        setTimeout(() => {
          setImageOpacitied(false);
          setShowingOverlay(false);
        }, 200);
      }, 10);

      // setShowingOverlay(false);
    }
  }, [overlayOpen]);

  return (
    <div className={imageDisplayStyles["image-display"]} key={props.image}>
      <div className={imageDisplayStyles.thumbnail}>
        <img
          loading="lazy"
          decoding="async"
          className={imageDisplayStyles["gallery-image"]}
          alt={props.image.originalFilename || "Photograph"}
          src={thumbnailUrl(props.image)}
          onClick={() => {
            setOverlayOpen(!overlayOpen);
          }}
        />
        <PhotoMetaRow photo={props.image} />
      </div>

      {showingOverlay && props.overlay && (
        <div
          className={`${imageDisplayStyles["overlay"]} ${
            overlayOpacitied ? imageDisplayStyles["opacity-1"] : ""
          }`}
          onClick={() => {
            setOverlayOpen(!overlayOpen);
          }}
        >
          <div
            className={`${imageDisplayStyles["overlay-frame"]} ${
              imageOpacitied ? imageDisplayStyles["opacity-1"] : ""
            }`}
          >
            <img
              className={imageDisplayStyles["overlay-image"]}
              alt={props.image.originalFilename || "Photograph"}
              src={imageUrl(props.image.s3Key)}
            />
            {before && (
              <img
                className={`${imageDisplayStyles["before-image"]} ${
                  showingBefore ? imageDisplayStyles["opacity-1"] : ""
                }`}
                alt="Before editing"
                src={imageUrl(before)}
                aria-hidden={!showingBefore}
              />
            )}
          </div>
          <PhotoMetaRow
            photo={props.image}
            hint={
              before ? (
                <button
                  type="button"
                  className={`${imageDisplayStyles["before-link"]} ${
                    showingBefore ? imageDisplayStyles["before-link-active"] : ""
                  }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowingBefore(!showingBefore);
                  }}
                  aria-pressed={showingBefore}
                >
                  hold b to see it unedited
                </button>
              ) : null
            }
          />
          <PhotoGearLine photo={props.image} />
        </div>
      )}
    </div>
  );
};

export default ImageDisplayFullWidth;
