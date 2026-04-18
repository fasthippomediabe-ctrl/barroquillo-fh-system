/**
 * Adds embalmer_id + embalmer_fee columns to services (idempotent).
 *
 * Usage:
 *   export TURSO_DATABASE_URL="libsql://..."
 *   export TURSO_AUTH_TOKEN="..."
 *   npx tsx scripts/add-service-embalmer.ts
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

  const cols = (await db.execute("PRAGMA table_info(services)")).rows.map(
    (r) => r.name as string,
  );
  if (!cols.includes("embalmer_id")) {
    await db.execute("ALTER TABLE services ADD COLUMN embalmer_id INTEGER");
    console.log("added embalmer_id");
  } else console.log("embalmer_id already present");
  if (!cols.includes("embalmer_fee")) {
    await db.execute(
      "ALTER TABLE services ADD COLUMN embalmer_fee REAL DEFAULT 0",
    );
    console.log("added embalmer_fee");
  } else console.log("embalmer_fee already present");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
