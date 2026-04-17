/**
 * One-shot data migration: local SQLite file -> Turso (libSQL).
 *
 * Usage:
 *   export TURSO_DATABASE_URL="libsql://<your-db>-<org>.turso.io"
 *   export TURSO_AUTH_TOKEN="<token from the Turso dashboard>"
 *   export SOURCE_DB="./prisma/seed.db"    (optional; defaults to seed.db)
 *   npx tsx scripts/migrate-to-turso.ts
 *
 * Recreates every table from prisma/schema.prisma on the remote DB, then
 * copies every row across. Safe to re-run: drops and recreates tables first.
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  const src = process.env.SOURCE_DB ?? "./prisma/seed.db";
  if (!url || !token) {
    console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN first.");
    process.exit(1);
  }

  const absSrc = resolve(src);
  const localUrl = pathToFileURL(absSrc).toString();
  const local = createClient({ url: localUrl });
  const remote = createClient({ url, authToken: token });

  // DDL matching prisma/schema.prisma. Column names use the snake_case
  // @map names so we can SELECT * from local and reuse the same INSERTs.
  const ddl: string[] = [
    `CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      is_active INTEGER DEFAULT 1,
      created_at TEXT
    )`,
    `CREATE TABLE accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'bank',
      description TEXT,
      opening_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT
    )`,
    `CREATE TABLE clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deceased_first_name TEXT NOT NULL,
      deceased_last_name TEXT NOT NULL,
      deceased_middle_name TEXT,
      deceased_age INTEGER,
      deceased_gender TEXT,
      deceased_birthday TEXT,
      deceased_date_of_death TEXT,
      deceased_cause_of_death TEXT,
      deceased_address TEXT,
      contact_name TEXT NOT NULL,
      contact_relationship TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      contact_address TEXT,
      notes TEXT,
      created_at TEXT
    )`,
    `CREATE TABLE service_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      base_price REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1
    )`,
    `CREATE TABLE services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      package_id INTEGER,
      custom_service_name TEXT,
      wake_start_date TEXT,
      wake_end_date TEXT,
      burial_date TEXT,
      burial_location TEXT,
      total_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT
    )`,
    `CREATE TABLE payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'cash',
      reference TEXT,
      notes TEXT,
      created_at TEXT
    )`,
    `CREATE TABLE expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6c757d',
      is_active INTEGER DEFAULT 1
    )`,
    `CREATE TABLE expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category_id INTEGER,
      account_id INTEGER,
      amount REAL NOT NULL,
      description TEXT,
      reference TEXT,
      service_id INTEGER,
      created_at TEXT
    )`,
    `CREATE TABLE inventory_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    )`,
    `CREATE TABLE inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      unit TEXT DEFAULT 'pcs',
      quantity REAL DEFAULT 0,
      reorder_level REAL DEFAULT 0,
      cost_per_unit REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      location TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT
    )`,
    `CREATE TABLE inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_cost REAL DEFAULT 0,
      service_id INTEGER,
      reference TEXT,
      notes TEXT,
      created_at TEXT
    )`,
    `CREATE TABLE liabilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'loan',
      creditor TEXT,
      principal_amount REAL NOT NULL,
      remaining_balance REAL NOT NULL,
      interest_rate REAL DEFAULT 0,
      due_date TEXT,
      monthly_payment REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT
    )`,
    `CREATE TABLE liability_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      liability_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      created_at TEXT
    )`,
    `CREATE TABLE suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      bank_name TEXT,
      bank_account_name TEXT,
      bank_account_number TEXT,
      gcash_number TEXT,
      maya_number TEXT,
      products_supplied TEXT,
      payment_terms TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT
    )`,
  ];

  const tables = ddl.map((s) => s.match(/CREATE TABLE (\w+)/)![1]);

  console.log(`Source: ${absSrc} (${readFileSync(absSrc).byteLength} bytes)`);
  console.log(`Target: ${url}`);

  for (const t of [...tables].reverse()) {
    console.log(`  DROP ${t}`);
    await remote.execute(`DROP TABLE IF EXISTS ${t}`);
  }
  for (const sql of ddl) {
    const name = sql.match(/CREATE TABLE (\w+)/)![1];
    console.log(`  CREATE ${name}`);
    await remote.execute(sql);
  }

  for (const table of tables) {
    const result = await local.execute(`SELECT * FROM ${table}`);
    const rows = result.rows;
    if (rows.length === 0) {
      console.log(`  ${table}: empty`);
      continue;
    }
    const cols = result.columns;
    const placeholders = cols.map(() => "?").join(", ");
    const insert = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;
    const batch = rows.map((r) => ({
      sql: insert,
      args: cols.map((c) => {
        // biome-ignore lint/suspicious/noExplicitAny: libsql row value
        const v = (r as any)[c];
        return v === undefined ? null : v;
      }),
    }));
    await remote.batch(batch, "write");
    console.log(`  ${table}: ${rows.length} rows`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
