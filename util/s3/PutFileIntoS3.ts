import { PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import getS3Client from "./GetS3Client";

/**
 * Only the two things actually used, rather than a File type.
 *
 * The helper imported File from node:buffer while every caller hands it the web
 * File out of a FormData. Those are different types, which is what the
 * @ts-ignore at each call site was suppressing -- three copies of the same
 * suppression for one wrong parameter type.
 */
type UploadableFile = {
  arrayBuffer(): Promise<ArrayBuffer>;
  type: string;
};

export async function PutFileIntoS3(file: UploadableFile, key: string) {
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
