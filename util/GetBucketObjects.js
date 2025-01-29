require("dotenv").config();
import { cache } from "react";
import { GetRevalidateVersion } from "./RevalidateVersion";

// used for react's cache() function
export const revalidate = 3600; // revalidate the data at most every hour

import {
  S3Client,
  // This command supersedes the ListObjectsCommand and is the recommended way to list objects.
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "us-west-1",
  apiVersion: "latest",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  signatureVersion: "v4",
});

// from https://stackoverflow.com/a/2450976
function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex > 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

export const GetNumberOfBucketObjectsRandom = async (prefix, amount) => {
  if (prefix === "null" || prefix === null) return [];
  console.log(`${prefix}, ${amount}`);
  let bucketObjects = await GetBucketObjects(prefix);
  console.log(bucketObjects.length);
  shuffle(bucketObjects);

  return bucketObjects.slice(0, amount);
};

export const GetBucketNumberOfObjects = cache(async (prefix) => {
  return ((await GetBucketObjects(prefix)) || []).length; // dont be silly wrap your await
});

export const GetBucketObjects = async (prefix) => {
  const version = GetRevalidateVersion();
  return await GetBucketObjectsWithRevalidateVersion(prefix, version);
};

const GetBucketObjectsWithRevalidateVersion = cache(
  async (prefix, revalidateVersion) => {
    console.log("revalidateVersion", revalidateVersion);
    console.log(`bucket_prefix !${prefix}!`);
    const command = new ListObjectsV2Command({
      Bucket: "taste-images.stlr.cx",
      Prefix: prefix || "",
      // The default and maximum number of keys returned is 1000. This limits it to
      // one for demonstration purposes.
      MaxKeys: 1000,
    });

    try {
      let isTruncated = true;

      console.log("Your bucket contains the following objects:\n");
      let contents = "";

      let objects = [];
      while (isTruncated) {
        const { Contents, IsTruncated, NextContinuationToken } =
          await client.send(command);
        console.log("sent");
        const contentsList = Contents.map((c) => ` • ${c.Key}`).join("\n");
        Contents.map((object) => {
          if (object.Key === `${prefix}/`) return;
          objects.push(object);
        });
        contents += contentsList + "\n";
        isTruncated = IsTruncated;
        command.input.ContinuationToken = NextContinuationToken;
      }
      console.log(contents.slice(0, 200));
      return objects;
    } catch (err) {
      console.log("error");
      console.error(err);
    }
  }
);
