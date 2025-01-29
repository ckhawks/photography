import { GetObjectCommand, GetObjectCommandInput } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import getS3Client from "../../../../util/s3/GetS3Client";

export async function GET(
  request: Request,
  { params }: { params: { s3Key: string[] } }
) {
  if (params.s3Key.length === 0) {
    return new NextResponse("Please provide an id.", { status: 404 });
  }

  const objectPath = params.s3Key.join("/");
  try {
    const s3Client = getS3Client();
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Region: process.env.AWS_S3_REGION,
      Key: objectPath,
    } as GetObjectCommandInput);

    const data = await s3Client.send(getObjectCommand);

    return new NextResponse(data.Body as unknown as Buffer, {
      status: 200,
      headers: {
        "Content-Type": data.ContentType!,
        "Cache-Control": "public, max-age=31536000, immutable", // optional, for caching
      },
    });
  } catch (error) {
    console.error("Error fetching image from S3: ", error);
    return new NextResponse("Image not found", { status: 404 });
  }
}
