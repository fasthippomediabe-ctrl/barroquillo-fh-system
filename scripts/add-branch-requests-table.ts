/**
 * Creates the branch_requests table in Turso (idempotent).
 *
 * Usage:
 *   export TURSO_DATABASE_URL="libsql://..."
 *   export TURSO_AUTH_TOKEN="..."
 *   npx tsx scripts/add-branch-requests-table.ts
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

  await db.execute(`CREATE TABLE IF NOT EXISTS branch_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    amount REAL NOT NULL,
    description TEXT,
    justification TEXT,
    needed_by_date TEXT,
    category_id INTEGER,
    account_id INTEGER,
    service_id INTEGER,
    liability_id INTEGER,
    reference TEXT,
    requested_by_user_id INTEGER NOT NULL,
    requested_at TEXT,
    reviewer_user_id INTEGER,
    reviewed_at TEXT,
    review_notes TEXT,
    released_by_user_id INTEGER,
    released_at TEXT,
    resulting_expense_id INTEGER,
    resulting_liability_payment_id INTEGER,
    created_at TEXT
  )`);
  await db.execute(
    "CREATE INDEX IF NOT EXISTS branch_requests_status_idx ON branch_requests(status)",
  );
  await db.execute(
    "CREATE INDEX IF NOT EXISTS branch_requests_requester_idx ON branch_requests(requested_by_user_id)",
  );

  const { rows } = await db.execute(
    "SELECT COUNT(*) AS c FROM branch_requests",
  );
  console.log("branch_requests ready, current rows:", rows[0]?.c ?? 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
