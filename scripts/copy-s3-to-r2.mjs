#!/usr/bin/env node
/**
 * Copy every object from the S3 bucket to the R2 bucket, preserving keys and
 * content types. Safe to re-run: an object already in R2 with the same size is
 * skipped, so this can be run again to pick up anything uploaded since.
 *
 *   node scripts/copy-s3-to-r2.mjs            copy what is missing
 *   node scripts/copy-s3-to-r2.mjs --check    compare both sides, copy nothing
 *   node scripts/copy-s3-to-r2.mjs --force    re-upload everything
 *
 * Reads credentials from .env.local:
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_REGION / AWS_S3_BUCKET
 *   R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET
 *
 * Nothing is ever deleted from S3. S3 stays the source of truth until the site
 * has been serving from R2 long enough to trust it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

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

const mode = process.argv[2] ?? "--copy";

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function listAll(client, Bucket) {
  const objects = new Map();
  let ContinuationToken;
  do {
    const out = await client.send(new ListObjectsV2Command({ Bucket, ContinuationToken }));
    for (const object of out.Contents ?? []) objects.set(object.Key, object.Size);
    ContinuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return objects;
}

const source = await listAll(s3, process.env.AWS_S3_BUCKET);
const target = await listAll(r2, process.env.R2_BUCKET);

const totalBytes = [...source.values()].reduce((sum, size) => sum + size, 0);
console.log(
  `s3://${process.env.AWS_S3_BUCKET}  ${source.size} objects, ${(totalBytes / 1024 / 1024).toFixed(1)} MB`
);
console.log(`r2://${process.env.R2_BUCKET}  ${target.size} objects`);

const missing = [...source.keys()].filter((key) => target.get(key) !== source.get(key));
const mismatched = [...source.keys()].filter(
  (key) => target.has(key) && target.get(key) !== source.get(key)
);
const extra = [...target.keys()].filter((key) => !source.has(key));

if (mismatched.length) console.log(`size mismatch on ${mismatched.length}: ${mismatched.join(", ")}`);
if (extra.length) console.log(`only in R2 (${extra.length}): ${extra.join(", ")}`);

if (mode === "--check") {
  console.log(missing.length ? `${missing.length} object(s) not yet in R2` : "R2 matches S3");
  process.exit(0);
}

const queue = mode === "--force" ? [...source.keys()] : missing;
console.log(`copying ${queue.length} object(s)`);

let done = 0;
for (const Key of queue) {
  const object = await s3.send(
    new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key })
  );
  const body = Buffer.from(await object.Body.transformToByteArray());

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key,
      Body: body,
      ContentType: object.ContentType,
      CacheControl: object.CacheControl ?? "public, max-age=31536000, immutable",
    })
  );

  done++;
  console.log(`  ${done}/${queue.length}  ${Key}  ${(body.length / 1024 / 1024).toFixed(1)} MB`);
}

const after = await listAll(r2, process.env.R2_BUCKET);
const stillMissing = [...source.keys()].filter((key) => after.get(key) !== source.get(key));
console.log(
  stillMissing.length
    ? `done, but ${stillMissing.length} object(s) still do not match: ${stillMissing.join(", ")}`
    : `done, all ${source.size} objects present in R2 at matching sizes`
);
