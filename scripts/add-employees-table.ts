/**
 * Adds the `employees` table to a Turso DB (idempotent).
 *
 * Usage:
 *   export TURSO_DATABASE_URL="libsql://..."
 *   export TURSO_AUTH_TOKEN="..."
 *   npx tsx scripts/add-employees-table.ts
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

  await db.execute(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    middle_name TEXT,
    birthday TEXT,
    gender TEXT,
    civil_status TEXT,
    position TEXT,
    department TEXT,
    employment_type TEXT DEFAULT 'regular',
    rate_type TEXT DEFAULT 'monthly',
    rate_amount REAL DEFAULT 0,
    phone TEXT,
    email TEXT,
    address TEXT,
    sss_number TEXT,
    philhealth_number TEXT,
    pagibig_number TEXT,
    tin_number TEXT,
    emergency_name TEXT,
    emergency_relationship TEXT,
    emergency_phone TEXT,
    date_hired TEXT,
    date_regularized TEXT,
    date_separated TEXT,
    separation_reason TEXT,
    education TEXT,
    skills TEXT,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT
  )`);

  const { rows } = await db.execute("SELECT COUNT(*) AS c FROM employees");
  console.log("employees table ready, current rows:", rows[0]?.c ?? 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
