"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put, del } from "@vercel/blob";

async function checkRole(
  allowed: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const role = (session?.user as any)?.role ?? "staff";
  if (!allowed.includes(role))
    return { ok: false, error: "You don't have permission for this." };
  return { ok: true };
}

function s(v: FormDataEntryValue | null): string | null {
  const x = String(v ?? "").trim();
  return x === "" ? null : x;
}
function n(v: FormDataEntryValue | null): number {
  const x = String(v ?? "").trim();
  return x === "" ? 0 : Number(x);
}
function optInt(v: FormDataEntryValue | null): number | null {
  const x = s(v);
  return x ? Number(x) : null;
}

const MAX_RECEIPT_BYTES = 4 * 1024 * 1024; // 4 MB (server-action body limit safe zone)
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

async function uploadReceipt(
  file: File,
): Promise<{ url: string; filename: string } | { error: string }> {
  if (!file.size) return { error: "Receipt file is empty." };
  if (file.size > MAX_RECEIPT_BYTES)
    return { error: "Receipt must be 4 MB or smaller." };
  if (file.type && !ALLOWED_TYPES.has(file.type))
    return {
      error: "Only JPG, PNG, WebP, HEIC, or PDF receipts are supported.",
    };
  const safeBase = file.name
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(-80);
  const key = `receipts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}`;
  const blob = await put(key, file, {
    access: "public",
    contentType: file.type || undefined,
  });
  return { url: blob.url, filename: file.name };
}

async function resolveCategoryId(
  formData: FormData,
): Promise<number | null> {
  const raw = s(formData.get("categoryId"));
  if (!raw) return null;
  if (raw === "__new__") {
    const name = s(formData.get("newCategoryName"));
    if (!name) return null;
    const created = await prisma.expenseCategory.create({
      data: { name, isActive: 1 },
    });
    return created.id;
  }
  return Number(raw);
}

export async function createExpense(
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole(["admin", "manager", "accounting"]);
  if (!gate.ok) return { error: gate.error };

  const amount = n(formData.get("amount"));
  if (amount <= 0) return { error: "Amount must be greater than 0." };
  const date = s(formData.get("date"));
  if (!date) return { error: "Date is required." };

  const categoryId = await resolveCategoryId(formData);

  let receiptUrl: string | null = null;
  let receiptFilename: string | null = null;
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    const up = await uploadReceipt(file);
    if ("error" in up) return { error: up.error };
    receiptUrl = up.url;
    receiptFilename = up.filename;
  }

  await prisma.expense.create({
    data: {
      date,
      amount,
      categoryId,
      accountId: optInt(formData.get("accountId")),
      serviceId: optInt(formData.get("serviceId")),
      description: s(formData.get("description")),
      reference: s(formData.get("reference")),
      receiptUrl,
      receiptFilename,
      createdAt: new Date().toISOString(),
    },
  });
  revalidatePath("/expenses");
  revalidatePath("/");
  redirect("/expenses");
}

export async function updateExpense(
  id: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole(["admin", "manager", "accounting"]);
  if (!gate.ok) return { error: gate.error };

  const amount = n(formData.get("amount"));
  if (amount <= 0) return { error: "Amount must be greater than 0." };
  const date = s(formData.get("date"));
  if (!date) return { error: "Date is required." };

  const categoryId = await resolveCategoryId(formData);

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) return { error: "Expense not found." };

  const removeReceipt = s(formData.get("removeReceipt")) === "1";
  const file = formData.get("receipt");
  const hasNewFile = file instanceof File && file.size > 0;

  let receiptUrl = existing.receiptUrl;
  let receiptFilename = existing.receiptFilename;

  if (hasNewFile) {
    const up = await uploadReceipt(file as File);
    if ("error" in up) return { error: up.error };
    // Replace: drop the old blob first, then set the new one.
    if (existing.receiptUrl) {
      try {
        await del(existing.receiptUrl);
      } catch {
        /* non-fatal; old blob may be gone already */
      }
    }
    receiptUrl = up.url;
    receiptFilename = up.filename;
  } else if (removeReceipt && existing.receiptUrl) {
    try {
      await del(existing.receiptUrl);
    } catch {
      /* non-fatal */
    }
    receiptUrl = null;
    receiptFilename = null;
  }

  await prisma.expense.update({
    where: { id },
    data: {
      date,
      amount,
      categoryId,
      accountId: optInt(formData.get("accountId")),
      serviceId: optInt(formData.get("serviceId")),
      description: s(formData.get("description")),
      reference: s(formData.get("reference")),
      receiptUrl,
      receiptFilename,
    },
  });
  revalidatePath("/expenses");
  revalidatePath(`/expenses/${id}/edit`);
  revalidatePath("/");
  redirect("/expenses");
}

export async function deleteExpense(id: number): Promise<{ error?: string }> {
  const gate = await checkRole(["admin", "manager", "accounting"]);
  if (!gate.ok) return { error: gate.error };
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (existing?.receiptUrl) {
    try {
      await del(existing.receiptUrl);
    } catch {
      /* non-fatal */
    }
  }
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/expenses");
  revalidatePath("/");
  return {};
}
