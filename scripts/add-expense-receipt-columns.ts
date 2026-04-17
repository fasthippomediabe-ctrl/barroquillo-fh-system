/**
 * Adds receipt_url and receipt_filename columns to the `expenses` table (idempotent).
 *
 * Usage:
 *   export TURSO_DATABASE_URL="libsql://..."
 *   export TURSO_AUTH_TOKEN="..."
 *   npx tsx scripts/add-expense-receipt-columns.ts
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

  const cols = (await db.execute("PRAGMA table_info(expenses)")).rows.map(
    (r) => r.name as string,
  );
  if (!cols.includes("receipt_url")) {
    await db.execute("ALTER TABLE expenses ADD COLUMN receipt_url TEXT");
    console.log("added receipt_url");
  } else {
    console.log("receipt_url already present");
  }
  if (!cols.includes("receipt_filename")) {
    await db.execute("ALTER TABLE expenses ADD COLUMN receipt_filename TEXT");
    console.log("added receipt_filename");
  } else {
    console.log("receipt_filename already present");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
