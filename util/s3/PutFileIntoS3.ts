import { PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { File } from "buffer";
import getS3Client from "./GetS3Client";

export async function PutFileIntoS3(file: File, key: String) {
  // get s3Client to use for the request
  const s3Client = getS3Client();
  try {
    // set up our parameters
    // @ts-ignore
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET, // destination bucket
      Key: key, // what the want the file path to be basically
      Body: await file.arrayBuffer(), // the file itself
      ContentType: file.type, // the type of the file (look up MIME types)
    } as PutObjectCommandInput;

    // create the request and send it with the client
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // return success
    return true;
  } catch (error) {
    // if we had an error, print it out
    console.error("Error uploading file: ", error);

    // return failure
    return false;
  }
}

/**
 * Put an already-materialised buffer (a generated thumbnail, say) rather than
 * an uploaded File.
 */
export async function PutBufferIntoS3(
  body: Buffer,
  key: string,
  contentType: string
) {
  const s3Client = getS3Client();
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      } as PutObjectCommandInput)
    );
    return true;
  } catch (error) {
    console.error("Error uploading buffer: ", error);
    return false;
  }
}
