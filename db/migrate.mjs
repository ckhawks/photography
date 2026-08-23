#!/usr/bin/env node
/**
 * Minimal migration runner: applies db/migrations/*.sql in filename order,
 * once each, recording what ran in schema_migrations.
 *
 *   node db/migrate.mjs              apply everything pending
 *   node db/migrate.mjs --status     list applied and pending, change nothing
 *   node db/migrate.mjs --baseline   record every file as applied WITHOUT
 *                                    running it, for a database that already
 *                                    has the schema (that is the current one)
 *
 * Reads DATABASE_URL from the environment or .env.local.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, "migrations");

// tiny .env.local reader so this runs without the Next runtime
if (!process.env.DATABASE_URL) {
  const envPath = path.join(here, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set (env or .env.local)");
  process.exit(1);
}

const mode = process.argv[2] ?? "--apply";
const client = new pg.Client({
  connectionString,
  ssl: /sslmode=require|sslmode=verify/.test(connectionString)
    ? { rejectUnauthorized: false }
    : undefined,
});

await client.connect();
await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

const applied = new Set(
  (await client.query("SELECT filename FROM schema_migrations")).rows.map((r) => r.filename)
);
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (mode === "--status") {
  for (const file of files) {
    console.log(`${applied.has(file) ? "applied" : "pending"}  ${file}`);
  }
  await client.end();
  process.exit(0);
}

for (const file of files) {
  if (applied.has(file)) continue;

  if (mode === "--baseline") {
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
    console.log(`baselined (not run)  ${file}`);
    continue;
  }

  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log(`applied  ${file}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`FAILED   ${file}\n${error.message}`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("done");
