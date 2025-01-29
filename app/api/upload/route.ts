import { NextResponse } from "next/server";
import { PutFileIntoS3 } from "../../../util/s3/PutFileIntoS3";
import { db } from "../../../util/db/db";

import { randomBytes } from "crypto";

function generateHexId(length = 8) {
  return randomBytes(length / 2).toString("hex"); // Generates 8-character hex string
}

function sanitizeFilename(filename: string) {
  // Extract file extension
  const fileExtension = filename.includes(".") ? filename.split(".").pop() : "";

  // Remove special characters except for letters, numbers, dashes, and underscores
  const baseName = filename
    .replace(/\.[^/.]+$/, "") // Remove extension
    .replace(/[^a-zA-Z0-9-_ ]/g, "") // Keep alphanumeric, dash, underscore, space
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .substring(0, 50); // Limit length for safety

  return `${generateHexId()}-${baseName}${
    fileExtension ? `.${fileExtension}` : ""
  }`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const uploadedPhotos = [];

    for (const file of files) {
      const sanitizedFilename = sanitizeFilename(file.name);
      const fileKey = `uploads/${sanitizedFilename}`;

      // **Try to upload the file to S3**
      try {
        // @ts-ignore
        await PutFileIntoS3(file, fileKey);
      } catch (s3Error) {
        console.error("S3 Upload Failed:", s3Error);
        return NextResponse.json(
          { error: `Failed to upload ${file.name} to S3` },
          { status: 500 }
        );
      }

      // Store file info in the database
      const query = `
        INSERT INTO "Photo" ("s3Key", "originalFilename", "createdAt") 
        VALUES ($1, $2, NOW()) 
        RETURNING id, "s3Key"
      `;
      const params = [fileKey, sanitizedFilename];
      const result = await db(query, params);

      uploadedPhotos.push({
        id: result.id,
        fileKey: fileKey,
      });
    }

    return NextResponse.json({ success: true, photos: uploadedPhotos });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}
