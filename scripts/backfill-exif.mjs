#!/usr/bin/env node
/**
 * Read camera details out of each original's EXIF and record them. Only fills
 * blanks — anything typed in by hand wins and is never overwritten.
 *
 *   node scripts/backfill-exif.mjs           fill in what is missing
 *   node scripts/backfill-exif.mjs --check    report coverage only
 *
 * Reads the ORIGINALS, not the thumbnails: sharp strips metadata when it
 * resizes, so the thumbnails carry none.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import sharp from "sharp";
import exifReader from "exif-reader";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(here, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const SCANNER_MAKES = ["noritsu", "fujifilm frontier", "frontier", "epson", "plustek", "pakon", "flextight", "imacon"];
const isScanner = (text) => SCANNER_MAKES.some((s) => text.toLowerCase().includes(s));
const formatShutter = (seconds) =>
  !seconds ? undefined : seconds >= 1 ? `${Number(seconds.toFixed(1))}s` : `1/${Math.round(1 / seconds)}`;

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: /sslmode=require|sslmode=verify/.test(process.env.DATABASE_URL ?? "")
    ? { rejectUnauthorized: false }
    : undefined,
});

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION || (process.env.AWS_S3_ENDPOINT ? "auto" : undefined),
  endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  forcePathStyle: Boolean(process.env.AWS_S3_ENDPOINT),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

await client.connect();

const { rows } = await client.query(
  `SELECT id, "s3Key" FROM "Photo" WHERE "exif" IS NULL AND "s3Key" IS NOT NULL ORDER BY id`
);
console.log(`${rows.length} photo(s) not yet read`);

if (process.argv[2] === "--check") {
  await client.end();
  process.exit(0);
}

let withExif = 0;
let withoutExif = 0;
let failed = 0;

for (const [index, row] of rows.entries()) {
  try {
    const object = await s3.send(
      new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: row.s3Key })
    );
    const buffer = Buffer.from(await object.Body.transformToByteArray());
    const { exif } = await sharp(buffer).metadata();

    if (!exif) {
      // record an empty object so a re-run skips it, and so "read, found
      // nothing" is distinguishable from "never read"
      await client.query(`UPDATE "Photo" SET "exif" = '{}'::jsonb WHERE id = $1`, [row.id]);
      withoutExif++;
      console.log(`  ${index + 1}/${rows.length}  ${row.s3Key}  no EXIF`);
      continue;
    }

    const parsed = exifReader(exif);
    const device = [parsed?.Image?.Make?.trim(), parsed?.Image?.Model?.trim()].filter(Boolean).join(" ");
    const scanner = device ? isScanner(device) : false;
    const settings = {
      aperture: parsed?.Photo?.FNumber,
      shutter: formatShutter(parsed?.Photo?.ExposureTime),
      iso: parsed?.Photo?.ISOSpeedRatings,
      focalLength: parsed?.Photo?.FocalLength,
    };

    await client.query(
      `UPDATE "Photo"
          SET "exif" = $1::jsonb,
              "camera" = COALESCE("camera", $2),
              "lens" = COALESCE("lens", $3),
              "takenAt" = COALESCE("takenAt", $4),
              "medium" = COALESCE("medium", $5)
        WHERE id = $6`,
      [
        JSON.stringify(settings),
        scanner || !device ? null : device,
        parsed?.Photo?.LensModel?.trim() || null,
        parsed?.Photo?.DateTimeOriginal ?? null,
        scanner ? "film" : device ? "digital" : null,
        row.id,
      ]
    );

    withExif++;
    console.log(`  ${index + 1}/${rows.length}  ${row.s3Key}  ${device || "unknown"}${scanner ? " (scanner → film)" : ""}`);
  } catch (error) {
    failed++;
    console.error(`  FAILED ${row.s3Key}: ${error.message}`);
  }
}

console.log(`\n${withExif} with EXIF, ${withoutExif} without${failed ? `, ${failed} failed` : ""}`);
await client.end();
