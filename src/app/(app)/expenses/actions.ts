"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  await prisma.expense.create({
    data: {
      date,
      amount,
      categoryId,
      accountId: optInt(formData.get("accountId")),
      serviceId: optInt(formData.get("serviceId")),
      description: s(formData.get("description")),
      reference: s(formData.get("reference")),
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
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/expenses");
  revalidatePath("/");
  return {};
}
