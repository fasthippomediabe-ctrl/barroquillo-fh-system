"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

const ROLES = ["staff", "manager", "hr", "accounting", "admin"] as const;
type Role = (typeof ROLES)[number];

async function requireAdmin(): Promise<{ ok: true; uid: number } | { ok: false; error: string }> {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const u = session?.user as any;
  if (!u) return { ok: false, error: "Not authenticated." };
  if (u.role !== "admin") return { ok: false, error: "Admin access required." };
  return { ok: true, uid: Number(u.id) };
}

function s(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

export async function createUser(
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };

  const displayName = s(formData.get("displayName"));
  const username = s(formData.get("username")).toLowerCase();
  const password = s(formData.get("password"));
  const confirm = s(formData.get("confirmPassword"));
  const role = s(formData.get("role")) as Role;

  if (!displayName || !username || !password)
    return { error: "Display name, username, and password are required." };
  if (!/^[a-z0-9_.-]+$/.test(username))
    return {
      error: "Username can only contain lowercase letters, numbers, dot, dash, underscore.",
    };
  if (password !== confirm) return { error: "Passwords don't match." };
  if (password.length < 6)
    return { error: "Password must be at least 6 characters." };
  if (!ROLES.includes(role)) return { error: "Invalid role." };

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return { error: "Username already exists." };

  await prisma.user.create({
    data: {
      username,
      displayName,
      passwordHash: bcrypt.hashSync(password, 10),
      role,
      isActive: 1,
      createdAt: new Date().toISOString(),
    },
  });
  revalidatePath("/admin");
  return {};
}

export async function toggleUserActive(
  id: number,
): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found." };
  if (user.username === "admin")
    return { error: "The primary admin account cannot be disabled." };
  await prisma.user.update({
    where: { id },
    data: { isActive: user.isActive === 1 ? 0 : 1 },
  });
  revalidatePath("/admin");
  return {};
}

export async function changeUserRole(
  id: number,
  role: Role,
): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  if (!ROLES.includes(role)) return { error: "Invalid role." };
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found." };
  if (user.username === "admin" && role !== "admin")
    return { error: "The primary admin cannot be demoted." };
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin");
  return {};
}

export async function resetUserPassword(
  id: number,
  newPassword: string,
): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  if (newPassword.length < 6)
    return { error: "Password must be at least 6 characters." };
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found." };
  await prisma.user.update({
    where: { id },
    data: { passwordHash: bcrypt.hashSync(newPassword, 10) },
  });
  revalidatePath("/admin");
  return {};
}

export async function deleteUser(id: number): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found." };
  if (user.username === "admin")
    return { error: "The primary admin account cannot be deleted." };
  if (user.id === gate.uid)
    return { error: "You cannot delete your own account." };
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin");
  return {};
}
