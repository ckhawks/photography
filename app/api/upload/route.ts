import { NextResponse } from "next/server";
import { PutBufferIntoS3, PutFileIntoS3 } from "../../../util/s3/PutFileIntoS3";
import { makeThumbnail, readDimensions, thumbnailKeyFor } from "../../../util/images/makeThumbnail";
import { readExif } from "../../../util/images/readExif";
import { db } from "../../../util/db/db";

import { randomBytes } from "crypto";
import { getCookie, verifyToken } from "../../../util/auth";

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
  const token = getCookie(req, "auth-token");

  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const tier = parseInt(formData.get("tier") as string);

    // Batch settings. The client sends one file per request so a failure costs
    // one photo rather than the whole run, but these ride along with each.
    const rawAlbumId = formData.get("albumId");
    const albumId = rawAlbumId ? Number(rawAlbumId) : null;
    const medium = (formData.get("medium") as string) || null;
    const filmStock = ((formData.get("filmStock") as string) || "").trim() || null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    if (![1, 2, 3].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier value. Must be 1, 2, or 3." },
        { status: 400 }
      );
    }

    if (medium && !["film", "digital"].includes(medium)) {
      return NextResponse.json(
        { error: "Invalid medium. Must be film or digital." },
        { status: 400 }
      );
    }

    if (albumId !== null && !Number.isInteger(albumId)) {
      return NextResponse.json({ error: "Invalid shoot" }, { status: 400 });
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

      // Generate the gallery thumbnail. A failure here is not fatal: the row
      // is written without one and the wall falls back to the original, so a
      // bad file costs quality rather than the upload.
      let thumbKey: string | null = null;
      let width: number | null = null;
      let height: number | null = null;
      let exif = { camera: null, lens: null, takenAt: null, settings: null, mediumHint: null };
      try {
        const original = Buffer.from(await file.arrayBuffer());
        ({ width, height } = await readDimensions(original));
        exif = await readExif(original);
        const thumbnail = await makeThumbnail(original);
        const candidate = thumbnailKeyFor(fileKey);
        if (await PutBufferIntoS3(thumbnail, candidate, "image/webp")) {
          thumbKey = candidate;
        }
      } catch (thumbError) {
        console.error(`Thumbnail failed for ${fileKey}:`, thumbError);
      }

      // Store file info in the database
      const query = `
        INSERT INTO "Photo" ("s3Key", "originalFilename", "tier", "thumbKey", "width", "height",
                             "albumId", "medium", "filmStock", "camera", "lens", "takenAt", "exif", "createdAt") 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, NOW()) 
        RETURNING id, "s3Key", "thumbKey"
      `;
      const params = [
        fileKey,
        sanitizedFilename,
        tier.toString(),
        thumbKey,
        width,
        height,
        albumId,
        // what the batch says wins over what the file claims: a scan's EXIF
        // describes the scanner
        medium ?? exif.mediumHint,
        filmStock,
        exif.camera,
        exif.lens,
        exif.takenAt,
        exif.settings ? JSON.stringify(exif.settings) : null,
      ];
      const result = await db(query, params);

      uploadedPhotos.push({
        // db() returns rows; result.id was always undefined here
        id: result[0]?.id,
        fileKey,
        thumbKey,
        originalFilename: sanitizedFilename,
        width,
        height,
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
