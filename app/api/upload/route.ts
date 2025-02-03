import { NextResponse } from "next/server";
import { PutFileIntoS3 } from "../../../util/s3/PutFileIntoS3";
import { db } from "../../../util/db/db";

import { randomBytes } from "crypto";
import { verifyToken } from "../../../util/auth";

function generateHexId(length = 8) {
  return randomBytes(length / 2).toString("hex"); // Generates 8-character hex string
}

function sanitizeFilename(filename: string) {
  const fileExtension = filename.includes(".") ? filename.split(".").pop() : "";
  const baseName = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);

  return `${generateHexId()}-${baseName}${
    fileExtension ? `.${fileExtension}` : ""
  }`;
}

export async function POST(req: Request) {
  const token = req.headers
    .get("cookie")
    ?.split("auth-token=")[1]
    ?.split(";")[0];

  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const tier = parseInt(formData.get("tier") as string); // Get the tier from the form data

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    if (![1, 2, 3].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier value. Must be 1, 2, or 3." },
        { status: 400 }
      );
    }

    const uploadedPhotos = [];

    for (const file of files) {
      const sanitizedFilename = sanitizeFilename(file.name);
      const fileKey = `uploads/${sanitizedFilename}`;

      // Upload the file to S3
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
        INSERT INTO "Photo" ("s3Key", "originalFilename", "tier", "createdAt") 
        VALUES ($1, $2, $3, NOW()) 
        RETURNING id, "s3Key"
      `;
      const params = [fileKey, sanitizedFilename, tier.toString()];
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
