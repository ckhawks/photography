"use client";

import { useEffect, useMemo, useState } from "react";
import ImageDisplay from "./ImageDisplay";
import styles from "../../app/page.module.scss";

// The rendered width of a photo inside a column. Only the ratio between tiles
// matters for packing, so this needs to be about right, not exact.
const TILE_WIDTH = 350;

// Everything in a tile that is not the photo, measured off the rendered page:
// 20px of padding around the image, a 38px meta row, and the 50px gap below.
// A constant per tile, which is why a wall of tall photos still packs sensibly.
const TILE_CHROME = 108;

// Matches the breakpoints react-masonry-css was configured with: at most 850px
// wide gets one column, at most 1650px gets two, wider gets three.
const DEFAULT_COLUMNS = 3;

function columnsForWidth(width) {
  if (width <= 850) return 1;
  if (width <= 1650) return 2;
  return DEFAULT_COLUMNS;
}

function tileHeight(image) {
  // Older photos predate the dimension columns; square is the safest guess.
  const ratio = image.width && image.height ? image.height / image.width : 1;
  return TILE_WIDTH * ratio + TILE_CHROME;
}

/**
 * Deal photos into columns shortest-column-first, in the order they arrive.
 *
 * react-masonry-css dealt them round-robin — 1st, 4th, 7th into column one, 2nd,
 * 5th, 8th into column two — which ignores how tall anything is. One portrait
 * near the top pushed its whole column down, so the columns sheared apart and a
 * ranked list stopped reading in rank order: you would meet the 6th best photo
 * above the 4th. Choosing the shortest column instead keeps the columns level
 * with each other, so scanning down the page tracks the order the query
 * returned. The first row still fills left to right because every column starts
 * empty and ties go to the leftmost.
 */
function packColumns(images, columnCount) {
  const columns = Array.from({ length: columnCount }, () => []);
  const heights = new Array(columnCount).fill(0);

  for (const image of images) {
    let target = 0;
    for (let index = 1; index < columnCount; index += 1) {
      if (heights[index] < heights[target]) target = index;
    }
    columns[target].push(image);
    heights[target] += tileHeight(image);
  }

  return columns;
}

const GalleryView = ({ images }) => {
  // Starts at the server's assumption so hydration matches, then corrects on
  // mount. Same behaviour react-masonry-css had.
  const [columnCount, setColumnCount] = useState(DEFAULT_COLUMNS);

  useEffect(() => {
    const update = () => setColumnCount(columnsForWidth(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const columns = useMemo(
    () => packColumns(images, columnCount),
    [images, columnCount]
  );

  return (
    <>
      <div className={styles.gallery}>
        <div className="my-masonry-grid">
          {columns.map((column, index) => (
            <div
              className="my-masonry-grid_column"
              key={index}
              // equal columns, the same inline width react-masonry-css set
              style={{ width: `${100 / columnCount}%` }}
            >
              {column.map((image) => (
                <ImageDisplay image={image} key={image.s3Key} overlay />
              ))}
            </div>
          ))}
        </div>
      </div>
      <style jsx global>
        {`
          .gallery {
            margin: auto;
            max-width: 1210px;
          }
          .my-masonry-grid {
            display: flex;
            margin-left: -50px; /* gutter size offset */
            width: auto;
          }
          .my-masonry-grid_column {
            padding-left: 50px; /* gutter size */
            background-clip: padding-box;
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
