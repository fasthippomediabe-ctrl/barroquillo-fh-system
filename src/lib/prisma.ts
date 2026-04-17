import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// Accepts:
//   file:./prisma/dev.db           (local dev)
//   libsql://<db>.turso.io         (Turso, with TURSO_AUTH_TOKEN env)
//   http(s)://localhost:8080       (libsql-server local)
const adapter = new PrismaLibSql({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
