#!/usr/bin/env node
/**
 * Generate gallery thumbnails for photos that have none, and record the key.
 *
 *   node scripts/backfill-thumbnails.mjs           do the work
 *   node scripts/backfill-thumbnails.mjs --check   report what is missing
 *   node scripts/backfill-thumbnails.mjs --force   regenerate every thumbnail
 *
 * Reads the same .env.local the app does, so it works against whichever
 * bucket and database that points at. Originals are never modified.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import sharp from "sharp";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

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

// kept in step with util/images/makeThumbnail.ts
const LONG_EDGE = 1600;
const QUALITY = 78;
const thumbnailKeyFor = (s3Key) =>
  s3Key.replace(/^uploads\//, "thumbs/").replace(/\.[^.]+$/, "") + ".webp";

const mode = process.argv[2] ?? "--run";

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
  mode === "--force"
    ? `SELECT id, "s3Key" FROM "Photo" WHERE "s3Key" IS NOT NULL ORDER BY id`
    : `SELECT id, "s3Key" FROM "Photo" WHERE "s3Key" IS NOT NULL AND "thumbKey" IS NULL ORDER BY id`
);

console.log(`${rows.length} photo(s) to process`);
if (mode === "--check") {
  for (const row of rows) console.log(`  ${row.id}  ${row.s3Key}`);
  await client.end();
  process.exit(0);
}

let originalBytes = 0;
let thumbBytes = 0;
let failed = 0;

for (const [index, row] of rows.entries()) {
  try {
    const object = await s3.send(
      new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: row.s3Key })
    );
    const original = Buffer.from(await object.Body.transformToByteArray());

    const thumbnail = await sharp(original)
      .rotate()
      .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();

    const key = thumbnailKeyFor(row.s3Key);
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: thumbnail,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    await client.query(`UPDATE "Photo" SET "thumbKey" = $1 WHERE id = $2`, [key, row.id]);

    originalBytes += original.length;
    thumbBytes += thumbnail.length;
    console.log(
      `  ${index + 1}/${rows.length}  ${row.s3Key}  ` +
        `${(original.length / 1024 / 1024).toFixed(1)} MB -> ${(thumbnail.length / 1024).toFixed(0)} KB`
    );
  } catch (error) {
    failed++;
    console.error(`  FAILED ${row.s3Key}: ${error.message}`);
  }
}

if (originalBytes) {
  console.log(
    `\n${(originalBytes / 1024 / 1024).toFixed(1)} MB of originals -> ` +
      `${(thumbBytes / 1024 / 1024).toFixed(1)} MB of thumbnails ` +
      `(${((1 - thumbBytes / originalBytes) * 100).toFixed(1)}% smaller)`
  );
}
if (failed) console.log(`${failed} failed`);

await client.end();
