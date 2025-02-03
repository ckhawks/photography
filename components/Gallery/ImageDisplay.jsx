import { useEffect, useState } from "react";
import imageDisplayStyles from "./ImageDisplay.module.scss";
import PhotoMetaRow from "./PhotoMetaRow";

const ImageDisplay = (props) => {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [showingOverlay, setShowingOverlay] = useState(false);
  const [overlayOpacitied, setOverlayOpacitied] = useState(false);
  const [imageOpacitied, setImageOpacitied] = useState(false);

  useEffect(() => {
    overlayOpen && (document.body.style.overflow = "hidden");
    !overlayOpen && (document.body.style.overflow = "unset");
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
          width={350}
          className={imageDisplayStyles["gallery-image"]}
          src={`/api/resource/${props.image.s3Key}`}
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
            alt={"alt"}
            src={`/api/resource/${props.image.s3Key}`}
          />
          <PhotoMetaRow photo={props.image} />
        </div>
      )}
    </div>
  );
};

export default ImageDisplay;
