/**
 * Creates payroll_periods and payroll_entries tables (idempotent).
 *
 * Usage:
 *   export TURSO_DATABASE_URL="libsql://..."
 *   export TURSO_AUTH_TOKEN="..."
 *   npx tsx scripts/add-payroll-tables.ts
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

  await db.execute(`CREATE TABLE IF NOT EXISTS payroll_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    pay_date TEXT,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    created_at TEXT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS payroll_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    basic_pay REAL DEFAULT 0,
    overtime_pay REAL DEFAULT 0,
    holiday_pay REAL DEFAULT 0,
    bonus REAL DEFAULT 0,
    other_earnings REAL DEFAULT 0,
    other_earnings_note TEXT,
    sss REAL DEFAULT 0,
    philhealth REAL DEFAULT 0,
    pagibig REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    cash_advance REAL DEFAULT 0,
    absences REAL DEFAULT 0,
    late_deductions REAL DEFAULT 0,
    other_deductions REAL DEFAULT 0,
    other_deductions_note TEXT,
    gross_pay REAL DEFAULT 0,
    total_deductions REAL DEFAULT 0,
    net_pay REAL DEFAULT 0,
    is_paid INTEGER DEFAULT 0,
    paid_via TEXT,
    notes TEXT,
    created_at TEXT
  )`);

  console.log("payroll_periods + payroll_entries ready.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
