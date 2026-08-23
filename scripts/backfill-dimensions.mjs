#!/usr/bin/env node
/**
 * Record each photo's pixel dimensions. Reads the thumbnail rather than the
 * original — a resize preserves aspect ratio, and it is a hundredth of the
 * bytes — falling back to the original when there is no thumbnail.
 *
 *   node scripts/backfill-dimensions.mjs           fill in what is missing
 *   node scripts/backfill-dimensions.mjs --check   report only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import sharp from "sharp";
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
  `SELECT id, "s3Key", "thumbKey" FROM "Photo"
    WHERE ("width" IS NULL OR "height" IS NULL) AND "s3Key" IS NOT NULL
    ORDER BY id`
);
console.log(`${rows.length} photo(s) missing dimensions`);

if (process.argv[2] === "--check") {
  await client.end();
  process.exit(0);
}

let failed = 0;
for (const [index, row] of rows.entries()) {
  const key = row.thumbKey || row.s3Key;
  try {
    const object = await s3.send(
      new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key })
    );
    const buffer = Buffer.from(await object.Body.transformToByteArray());
    const { width, height } = await sharp(buffer).metadata();
    if (!width || !height) throw new Error("no dimensions in metadata");

    await client.query(`UPDATE "Photo" SET "width" = $1, "height" = $2 WHERE id = $3`, [
      width,
      height,
      row.id,
    ]);
    console.log(`  ${index + 1}/${rows.length}  ${key}  ${width} x ${height}`);
  } catch (error) {
    failed++;
    console.error(`  FAILED ${key}: ${error.message}`);
  }
}

if (failed) console.log(`${failed} failed`);
await client.end();
