import { useEffect, useRef, useState } from "react";
import { Eye } from "react-feather";
import imageDisplayStyles from "./ImageDisplay.module.scss";
import PhotoMetaRow from "./PhotoMetaRow";
import PhotoGearLine from "./PhotoGearLine";
import { imageUrl, thumbnailUrl } from "../../constants/images";

// The width every wall photo renders at, matched to GalleryView's packing.
const TILE_WIDTH = 350;

// Reserving the right height before the file arrives is what stops a lazily
// loaded wall from reflowing under the reader as they scroll — and it keeps the
// real column heights matching the ones GalleryView packed against.
function reservedHeight(image) {
  if (!image.width || !image.height) return undefined;
  return Math.round((TILE_WIDTH * image.height) / image.width);
}

const ImageDisplay = (props) => {
  const [showingBefore, setShowingBefore] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [showingOverlay, setShowingOverlay] = useState(false);
  const [overlayOpacitied, setOverlayOpacitied] = useState(false);
  const [imageOpacitied, setImageOpacitied] = useState(false);

  useEffect(() => {
    document.body.style.overflow = overlayOpen ? "hidden" : "";
  }, [overlayOpen]);

  const before = props.image.beforeS3Key;

  // Hold b to see the unedited version, release to come back -- the same
  // gesture the film reviewer uses, so the two tools behave alike. Releasing
  // on blur matters: alt-tabbing mid-hold never delivers the keyup, and
  // without this you come back to a photo stuck on its before.
  useEffect(() => {
    if (!overlayOpen || !before) return;

    const down = (event) => {
      if (event.key === "b" || event.key === "B") setShowingBefore(true);
    };
    const up = (event) => {
      if (event.key === "b" || event.key === "B") setShowingBefore(false);
    };
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

  // closing the lightbox must not leave the toggle latched for next time
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
          width={TILE_WIDTH}
          height={reservedHeight(props.image)}
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
          {/*
            The edit sizes the frame and the before is laid over it, rather
            than the two swapping places. A straighten crops, so the before has
            a different aspect ratio: let it drive the layout and the whole
            lightbox jumps on every toggle, which reads as a glitch instead of
            a rotation.
          */}
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

          {before && (
            <button
              type="button"
              className={`${imageDisplayStyles["before-toggle"]} ${
                showingBefore ? imageDisplayStyles["before-active"] : ""
              }`}
              onClick={(event) => {
                event.stopPropagation();
                setShowingBefore(!showingBefore);
              }}
              title="Hold b to compare"
            >
              <Eye size={13} />
              {showingBefore ? "Before" : "See before"}
              <span className={imageDisplayStyles["before-key"]}>b</span>
            </button>
          )}

          <PhotoMetaRow photo={props.image} />
          <PhotoGearLine photo={props.image} />
        </div>
      )}
    </div>
  );
};

export default ImageDisplay;
