"use client";

import Masonry from "react-masonry-css";
import ImageDisplay from "./ImageDisplay";
import styles from "../../app/page.module.scss";

const GalleryView = ({ images }) => {
  return (
    <>
      <div className={styles.gallery}>
        <Masonry
          breakpointCols={{
            default: 3,
            1650: 2,
            850: 1,
          }}
          // breakpointCols={{
          //   default: 3,
          //   1280: 2,
          //   850: 1,
          // }}
          className="my-masonry-grid"
          columnClassName="my-masonry-grid_column"
        >
          {images.map((image) => (
            <ImageDisplay image={image} key={image.s3Key} overlay />
            // <img width={350} alt={"alt"} src={`/gallery1/${el}`} key={el} />
            // <img
            //   width={400}
            //   alt={"alt"}
            //   src={`../../../organizing/photog/${el}`}
            //   key={el}
            // />
            // phase 1: add the animate-out class to body
            //   use setTimeout() to wait until element is added before you add class
            // phase 2: add to not display to whats there
            // phase 3: add element to the dom with the appropriate incoming
            // phase 4: add class to bring it in the right way
            // prevent backdrop scroll: https://stackoverflow.com/a/58290739

            // add fullscreen element, setTimeout() delay
            // add class to animate opacity to cover background and become backdrop, setTimeout() delay
            // add image in, setTimeout() delay, add class to animate image in
            //
          ))}
        </Masonry>
      </div>
      <style jsx global>
        {`
          .gallery {
            margin: auto;
            max-width: 1210px;
          }
          .my-masonry-grid {
            display: -webkit-box; /* Not needed if autoprefixing */
            display: -ms-flexbox; /* Not needed if autoprefixing */
            display: flex;
            margin-left: -50px; /* gutter size offset */
            width: auto;
          }
          .my-masonry-grid_column {
            padding-left: 50px; /* gutter size */
            background-clip: padding-box;
          }

          /* Style your items */
          .my-masonry-grid_column > img {
            /* change div to reference your elements you put in <Masonry> */
          }
          @media screen and (max-width: 1280px) {
            .my-masonry-grid {
              margin-left: none;
            }

            .my-masonry-grid_column {
              padding-left: none;
            }
          }
        `}
      </style>
    </>
  );
};

export default GalleryView;
