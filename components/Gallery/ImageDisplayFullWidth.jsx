import { faVideo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import styles from "./ImageDisplayFullWidth.module.scss";

const ImageDisplayFullWidth = (props) => {
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

  const isVideo = props.image.endsWith(".mp4");

  const VideoIcon = () => {
    return (
      <div className={styles["videoIconWrapper"]}>
        <FontAwesomeIcon icon={faVideo} className={styles.videoIcon} />
      </div>
    );
  };

  return (
    <div className={styles["image-display"]} key={props.image}>
      <div className={styles.thumbnail}>
        {!isVideo && (
          <img
            loading="lazy"
            // width={1190}
            className={styles["gallery-image"]}
            // alt={"alt"}
            // src={`/gallery1/${props.image}`}
            src={`${props.image}`}
            onClick={() => {
              setOverlayOpen(!overlayOpen);
            }}
          />
        )}
        {isVideo && (
          <>
            <video
              loading="lazy"
              className={styles["gallery-image"]}
              // width={1190}
              // width={350}
              // alt={"alt"}
              // src={`/gallery1/${props.image}`}
              loop
              onClick={() => {
                setOverlayOpen(!overlayOpen);
              }}
              autoPlay
              muted
            >
              <source src={props.image} type="video/mp4" />
            </video>
            <VideoIcon />
          </>
        )}
      </div>

      {showingOverlay && props.overlay && (
        <div
          className={`${styles["overlay"]} ${
            overlayOpacitied ? styles["opacity-1"] : ""
          }`}
          onClick={() => {
            setOverlayOpen(!overlayOpen);
          }}
        >
          {!isVideo && (
            <img
              className={`${styles["overlay-image"]} ${
                imageOpacitied ? styles["opacity-1"] : ""
              }`}
              // width={350}
              alt={"alt"}
              // src={`/gallery1/${props.image}`}
              src={`${props.image}`}
            />
          )}
          {isVideo && (
            <video
              className={`${styles["overlay-image"]} ${
                imageOpacitied ? styles["opacity-1"] : ""
              }`}
              // width={350}
              alt={"alt"}
              // src={`/gallery1/${props.image}`}
              // src={`${props.image}`}
              loop
              controls
              autoPlay
            >
              {/* <script>
                var scriptTag = document.scripts[document.scripts.length - 1];
                var parentTag = scriptTag.parentNode; parentTag.play( );
              </script> */}
              <source src={props.image} type="video/mp4" />
            </video>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageDisplayFullWidth;
