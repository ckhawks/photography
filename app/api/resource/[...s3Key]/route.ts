import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import getS3Client from "../../../../util/s3/GetS3Client";

export async function GET(
  request: Request,
  context: { params: Promise<{ s3Key?: string | string[] }> } // ✅ `params` must be awaited
) {
  const { s3Key } = await context.params; // ✅ Await params before accessing it

  if (!s3Key) {
    return new NextResponse("Missing S3 key", { status: 400 });
  }

  // ✅ Handle both single and catch-all routes
  const objectPath = Array.isArray(s3Key) ? s3Key.join("/") : s3Key;

  try {
    const s3Client = getS3Client();
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: objectPath,
    });

    const data = await s3Client.send(getObjectCommand);
    if (!data.Body) {
      return new NextResponse("Image not found", { status: 404 });
    }

    return new NextResponse(data.Body as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": data.ContentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("S3 Fetch Error:", error);
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
