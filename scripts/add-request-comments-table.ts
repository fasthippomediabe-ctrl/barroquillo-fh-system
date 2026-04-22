/**
 * Adds the `request_comments` table (idempotent).
 *
 * Usage:
 *   export TURSO_DATABASE_URL="libsql://..."
 *   export TURSO_AUTH_TOKEN="..."
 *   npx tsx scripts/add-request-comments-table.ts
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

  await db.execute(`CREATE TABLE IF NOT EXISTS request_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT
  )`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_request_comments_request ON request_comments(request_id)`,
  );

  const { rows } = await db.execute(
    "SELECT COUNT(*) AS c FROM request_comments",
  );
  console.log("request_comments ready, current rows:", rows[0]?.c ?? 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
