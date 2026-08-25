import { PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { File } from "buffer";
import getS3Client from "./GetS3Client";

export async function PutFileIntoS3(file: File, key: string) {
  const s3Client = getS3Client();
  try {
    // Buffer, not the raw ArrayBuffer. The SDK's Body wants a Uint8Array or a
    // stream; passing an ArrayBuffer worked, but only because a cast was
    // hiding the mismatch from the compiler.
    const uploadParams: PutObjectCommandInput = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    return true;
  } catch (error) {
    console.error("Error uploading file: ", error);
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
