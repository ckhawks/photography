import { promises as fs } from "fs";
import Head from "next/head";
import path from "path";
import React from "react";
import Gallery from "./Gallery";

import "inter-ui/inter.css";
import styles from "./page.module.scss";

// using process.cwd() to get the path
// fs.readdir to get all files in directory
const GalleryPage = async () => {
  const ITEMS_TO_SHOW = 40;

  // const imageDirectory = path.join(process.cwd(), "/public/gallery1");
  const imageDirectory = path.join(process.cwd(), "../../organizing/photog");
  const imageFilenamesWithDsStore = await fs.readdir(imageDirectory);
  let imageFilenames = imageFilenamesWithDsStore.filter((e) => {
    return e !== ".DS_Store";
  });
  shuffle(imageFilenames);
  if (imageFilenames.length > ITEMS_TO_SHOW)
    imageFilenames = imageFilenames.slice(0, ITEMS_TO_SHOW);

  console.log("imageFilenames.length", imageFilenames.length);
  console.log(imageFilenames);

  return (
    <div className={styles.body}>
      <div className={styles.all}>
        <Head>
          <link
            href="https://fonts.googleapis.com/css?family=Inter"
            rel="stylesheet"
          />
        </Head>
        <div>
          <Title Name="Photography" Title={""} />
          <Gallery images={imageFilenames} />
        </div>
      </div>
    </div>
  );
};

const Title = ({ Name, Title }) => {
  return (
    <h1 className={styles.title}>
      {Name} {Title}
    </h1>
  );
};

export default GalleryPage;
