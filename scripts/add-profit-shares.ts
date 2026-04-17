/**
 * Creates the profit_shares table (idempotent) and seeds the three default
 * Barroquillo FH shares if none exist yet.
 *
 * Usage:
 *   export TURSO_DATABASE_URL="libsql://..."
 *   export TURSO_AUTH_TOKEN="..."
 *   npx tsx scripts/add-profit-shares.ts
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

  await db.execute(`CREATE TABLE IF NOT EXISTS profit_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    percent REAL NOT NULL,
    bank_info TEXT,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT
  )`);

  const { rows } = await db.execute("SELECT COUNT(*) AS c FROM profit_shares");
  const count = Number(rows[0]?.c ?? 0);
  if (count === 0) {
    const now = new Date().toISOString();
    await db.batch([
      {
        sql: "INSERT INTO profit_shares (name, percent, bank_info, sort_order, created_at) VALUES (?,?,?,?,?)",
        args: ["Larry Barroquillo", 25, null, 1, now],
      },
      {
        sql: "INSERT INTO profit_shares (name, percent, bank_info, sort_order, created_at) VALUES (?,?,?,?,?)",
        args: ["Eduardo Entrina", 25, null, 2, now],
      },
      {
        sql: "INSERT INTO profit_shares (name, percent, bank_info, sort_order, created_at) VALUES (?,?,?,?,?)",
        args: ["Company Fund (Triple J)", 50, "Triple J Bank Account", 3, now],
      },
    ], "write");
    console.log("Seeded 3 default shares (Larry 25 / Eduardo 25 / Company Fund 50).");
  } else {
    console.log(`profit_shares already has ${count} row${count === 1 ? "" : "s"}.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
