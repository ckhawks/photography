import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";

/**
 * S3-compatible client for wherever the photos live.
 *
 * Set AWS_S3_ENDPOINT to point the whole app at R2 (or any other S3-compatible
 * store) instead of AWS: keys are unchanged, only the endpoint and region move.
 * Left unset, this behaves exactly as before and talks to AWS S3.
 */
export default function getS3Client() {
  const endpoint = process.env.AWS_S3_ENDPOINT;

  const config: S3ClientConfig = {
    // R2 has no regions; it wants "auto"
    region: process.env.AWS_S3_REGION || (endpoint ? "auto" : undefined),
    apiVersion: "latest",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  };

  if (endpoint) {
    config.endpoint = endpoint;
    config.forcePathStyle = true;
  }

  return new S3Client(config);
}
