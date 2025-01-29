import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";

export default function getS3Client() {
  // set up the s3 client and return it
  const client = new S3Client({
    region: process.env.AWS_S3_REGION,
    apiVersion: "latest",
    credentials: {
      // credentials from .env file
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    // signatureVersion: 'v4',
  } as S3ClientConfig);

  return client;
}
