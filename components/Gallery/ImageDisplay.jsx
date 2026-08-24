import { useEffect, useState } from "react";
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
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [showingOverlay, setShowingOverlay] = useState(false);
  const [overlayOpacitied, setOverlayOpacitied] = useState(false);
  const [imageOpacitied, setImageOpacitied] = useState(false);

  useEffect(() => {
    document.body.style.overflow = overlayOpen ? "hidden" : "";
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
          <img
            className={`${imageDisplayStyles["overlay-image"]} ${
              imageOpacitied ? imageDisplayStyles["opacity-1"] : ""
            }`}
            alt={props.image.originalFilename || "Photograph"}
            src={imageUrl(props.image.s3Key)}
          />
          <PhotoMetaRow photo={props.image} />
          <PhotoGearLine photo={props.image} />
        </div>
      )}
    </div>
  );
};

export default ImageDisplay;
