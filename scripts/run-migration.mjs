// Applies supabase/schema.sql to a Postgres database.
// Usage: DATABASE_URL="postgresql://postgres:PASSWORD@HOST:5432/postgres" node scripts/run-migration.mjs
// (Requires the `pg` package: npm install pg --no-save)
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DATABASE_URL to your Supabase Postgres connection string.");
    process.exit(1);
  }
  const sql = await readFile(join(root, "supabase", "schema.sql"), "utf8");
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connected. Running schema.sql…");
  await client.query(sql);
  console.log("✓ Schema applied successfully.");
  await client.end();
}

main().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
