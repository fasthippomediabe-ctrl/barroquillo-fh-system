"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const u = session?.user as any;
  if (u?.role !== "admin") return { ok: false, error: "Admin only." };
  return { ok: true };
}

function s(v: FormDataEntryValue | null): string | null {
  const x = String(v ?? "").trim();
  return x === "" ? null : x;
}

function bump(paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

export async function createProfitShare(
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  const name = s(formData.get("name"));
  const percent = Number(formData.get("percent"));
  if (!name) return { error: "Name is required." };
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100)
    return { error: "Percent must be between 0 and 100." };

  const total = await prisma.profitShare.aggregate({
    where: { isActive: 1 },
    _sum: { percent: true },
  });
  if ((total._sum.percent ?? 0) + percent > 100 + 0.001)
    return {
      error: `Total would exceed 100% (current active total ${total._sum.percent ?? 0}%).`,
    };

  const last = await prisma.profitShare.findFirst({
    orderBy: { sortOrder: "desc" },
  });
  await prisma.profitShare.create({
    data: {
      name,
      percent,
      bankInfo: s(formData.get("bankInfo")),
      notes: s(formData.get("notes")),
      isActive: 1,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      createdAt: new Date().toISOString(),
    },
  });
  bump(["/admin", "/accounting", "/"]);
  return {};
}

export async function updateProfitShare(
  id: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  const name = s(formData.get("name"));
  const percent = Number(formData.get("percent"));
  if (!name) return { error: "Name is required." };
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100)
    return { error: "Percent must be between 0 and 100." };

  const others = await prisma.profitShare.aggregate({
    where: { isActive: 1, id: { not: id } },
    _sum: { percent: true },
  });
  if ((others._sum.percent ?? 0) + percent > 100 + 0.001)
    return {
      error: `Total would exceed 100% (others already ${others._sum.percent ?? 0}%).`,
    };

  await prisma.profitShare.update({
    where: { id },
    data: {
      name,
      percent,
      bankInfo: s(formData.get("bankInfo")),
      notes: s(formData.get("notes")),
    },
  });
  bump(["/admin", "/accounting", "/"]);
  return {};
}

export async function deleteProfitShare(id: number): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  await prisma.profitShare.delete({ where: { id } });
  bump(["/admin", "/accounting", "/"]);
  return {};
}

export async function toggleProfitShareActive(
  id: number,
): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  const cur = await prisma.profitShare.findUnique({ where: { id } });
  if (!cur) return { error: "Share not found." };
  await prisma.profitShare.update({
    where: { id },
    data: { isActive: cur.isActive === 1 ? 0 : 1 },
  });
  bump(["/admin", "/accounting", "/"]);
  return {};
}
