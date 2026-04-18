/**
 * Adds loan_date column to liabilities (idempotent).
 *
 *   export TURSO_DATABASE_URL="libsql://..."
 *   export TURSO_AUTH_TOKEN="..."
 *   npx tsx scripts/add-liability-loan-date.ts
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

  const cols = (await db.execute("PRAGMA table_info(liabilities)")).rows.map(
    (r) => r.name as string,
  );
  if (!cols.includes("loan_date")) {
    await db.execute("ALTER TABLE liabilities ADD COLUMN loan_date TEXT");
    console.log("added loan_date");
  } else {
    console.log("loan_date already present");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
