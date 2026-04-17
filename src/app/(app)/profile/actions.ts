"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

function legacySha256(p: string) {
  return crypto.createHash("sha256").update(p).digest("hex");
}

function verify(password: string, hash: string): boolean {
  if (hash.startsWith("$2")) return bcrypt.compareSync(password, hash);
  return legacySha256(password) === hash;
}

export async function changePassword(formData: FormData) {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const uid = Number((session?.user as any)?.id);
  if (!uid) throw new Error("Not authenticated");
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  if (next.length < 6) throw new Error("New password must be at least 6 characters");
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) throw new Error("User not found");
  if (!verify(current, user.passwordHash)) throw new Error("Current password is wrong");
  const hash = bcrypt.hashSync(next, 10);
  await prisma.user.update({ where: { id: uid }, data: { passwordHash: hash } });
}
