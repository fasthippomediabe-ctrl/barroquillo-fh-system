/**
 * Adds image_url + image_filename columns to inventory (idempotent).
 *
 * Usage:
 *   export TURSO_DATABASE_URL="libsql://..."
 *   export TURSO_AUTH_TOKEN="..."
 *   npx tsx scripts/add-inventory-image.ts
 */
import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) {
    console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.");
    process.exit(1);
  }
  const db = createClient({ url, authToken: token });

  const cols = (await db.execute("PRAGMA table_info(inventory)")).rows.map(
    (r) => r.name as string,
  );
  if (!cols.includes("image_url")) {
    await db.execute("ALTER TABLE inventory ADD COLUMN image_url TEXT");
    console.log("added image_url");
  } else console.log("image_url already present");
  if (!cols.includes("image_filename")) {
    await db.execute("ALTER TABLE inventory ADD COLUMN image_filename TEXT");
    console.log("added image_filename");
  } else console.log("image_filename already present");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
